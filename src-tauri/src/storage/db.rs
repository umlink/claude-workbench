use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};

use super::schema::SCHEMA_SQL;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ProjectRecord {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SessionRecord {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub command: String,
    pub args: String,
    pub cwd: String,
    pub state: String,
    pub exit_code: Option<i32>,
    pub created_at: i64,
    pub exited_at: Option<i64>,
    pub archived_at: Option<i64>,
}

#[derive(Clone, Serialize, Debug)]
pub struct SearchResult {
    pub session_id: String,
    pub session_name: String,
    pub snippet: String,
    pub rank: f64,
}

macro_rules! db_err {
    ($e:expr) => {
        $e.map_err(|e| format!("{}", e))
    };
}

/// Database wrapper that is Clone + Send, backed by Arc<Mutex<Connection>>.
/// This allows sharing across threads (e.g., reader threads can write chunks).
#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn open(db_path: &Path) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create data directory: {}", e))?;
        }

        let conn = db_err!(Connection::open(db_path))?;
        db_err!(conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;"))?;
        db_err!(conn.execute_batch(SCHEMA_SQL))?;

        Ok(Database {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    fn row_to_project(row: &rusqlite::Row) -> SqlResult<ProjectRecord> {
        Ok(ProjectRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }

    fn row_to_session(row: &rusqlite::Row) -> SqlResult<SessionRecord> {
        Ok(SessionRecord {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            command: row.get(3)?,
            args: row.get(4)?,
            cwd: row.get(5)?,
            state: row.get(6)?,
            exit_code: row.get(7)?,
            created_at: row.get(8)?,
            exited_at: row.get(9)?,
            archived_at: row.get(10)?,
        })
    }

    // --- Project CRUD ---

    pub fn create_project(&self, id: &str, name: &str, path: &str, now: i64) -> Result<ProjectRecord, String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, path, now, now],
        ))?;
        Ok(ProjectRecord { id: id.to_string(), name: name.to_string(), path: path.to_string(), created_at: now, updated_at: now })
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = db_err!(conn.prepare(
            "SELECT id, name, path, created_at, updated_at FROM projects ORDER BY updated_at DESC"
        ))?;
        let rows = db_err!(stmt.query_map([], Self::row_to_project))?;
        rows.collect::<SqlResult<Vec<_>>>().map_err(|e| format!("{}", e))
    }

    #[allow(dead_code)]
    pub fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = db_err!(conn.prepare(
            "SELECT id, name, path, created_at, updated_at FROM projects WHERE id = ?1"
        ))?;
        let mut rows = db_err!(stmt.query(params![id]))?;
        match rows.next() {
            Ok(Some(row)) => Ok(Some(Self::row_to_project(row).map_err(|e| format!("{}", e))?)),
            Ok(None) => Ok(None),
            Err(e) => Err(format!("{}", e)),
        }
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        // Clean up FTS data for all sessions in this project before CASCADE deletes them
        db_err!(conn.execute(
            "DELETE FROM output_search WHERE session_id IN (SELECT id FROM sessions WHERE project_id = ?1)",
            params![id],
        ))?;
        db_err!(conn.execute("DELETE FROM projects WHERE id = ?1", params![id]))?;
        Ok(())
    }

    pub fn rename_project(&self, id: &str, name: &str, now: i64) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        ))?;
        Ok(())
    }

    // --- Session CRUD ---

    pub fn create_session(
        &self, id: &str, project_id: &str, name: &str, command: &str,
        args: &str, cwd: &str, now: i64,
    ) -> Result<SessionRecord, String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "INSERT INTO sessions (id, project_id, name, command, args, cwd, state, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'Starting', ?7)",
            params![id, project_id, name, command, args, cwd, now],
        ))?;
        Ok(SessionRecord {
            id: id.to_string(), project_id: project_id.to_string(), name: name.to_string(),
            command: command.to_string(), args: args.to_string(), cwd: cwd.to_string(),
            state: "Starting".to_string(), exit_code: None, created_at: now,
            exited_at: None, archived_at: None,
        })
    }

    pub fn list_sessions(&self, project_id: Option<&str>) -> Result<Vec<SessionRecord>, String> {
        let conn = self.conn.lock().unwrap();
        // Filter out sessions that:
        // 1. Are Exited with non-zero exit code (startup failure) AND
        // 2. Have no output chunks (no interaction records)
        let sql = if project_id.is_some() {
            "SELECT s.id, s.project_id, s.name, s.command, s.args, s.cwd, s.state, s.exit_code, s.created_at, s.exited_at, s.archived_at
             FROM sessions s
             WHERE s.project_id = ?1
               AND s.archived_at IS NULL
               AND NOT (
                   s.state = 'Exited'
                   AND s.exit_code != 0
                   AND NOT EXISTS (SELECT 1 FROM output_chunks oc WHERE oc.session_id = s.id)
               )
             ORDER BY s.created_at DESC"
        } else {
            "SELECT s.id, s.project_id, s.name, s.command, s.args, s.cwd, s.state, s.exit_code, s.created_at, s.exited_at, s.archived_at
             FROM sessions s
             WHERE s.archived_at IS NULL
               AND NOT (
                   s.state = 'Exited'
                   AND s.exit_code != 0
                   AND NOT EXISTS (SELECT 1 FROM output_chunks oc WHERE oc.session_id = s.id)
               )
             ORDER BY s.created_at DESC"
        };
        let mut stmt = db_err!(conn.prepare(sql))?;
        let rows = if let Some(pid) = project_id {
            db_err!(stmt.query_map(params![pid], Self::row_to_session))?
        } else {
            db_err!(stmt.query_map([], Self::row_to_session))?
        };
        rows.collect::<SqlResult<Vec<_>>>().map_err(|e| format!("{}", e))
    }

    pub fn get_session(&self, id: &str) -> Result<Option<SessionRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = db_err!(conn.prepare(
            "SELECT id, project_id, name, command, args, cwd, state, exit_code, created_at, exited_at, archived_at FROM sessions WHERE id = ?1"
        ))?;
        let mut rows = db_err!(stmt.query(params![id]))?;
        match rows.next() {
            Ok(Some(row)) => Ok(Some(Self::row_to_session(row).map_err(|e| format!("{}", e))?)),
            Ok(None) => Ok(None),
            Err(e) => Err(format!("{}", e)),
        }
    }

    pub fn update_session_state(&self, id: &str, state: &str, exit_code: Option<i32>, now: Option<i64>) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        match exit_code {
            Some(code) => {
                db_err!(conn.execute(
                    "UPDATE sessions SET state = ?1, exit_code = ?2, exited_at = ?3 WHERE id = ?4",
                    params![state, code, now, id],
                ))?;
            }
            None => {
                db_err!(conn.execute(
                    "UPDATE sessions SET state = ?1 WHERE id = ?2",
                    params![state, id],
                ))?;
            }
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn reconcile_incomplete_sessions(&self, exit_code: i32, now: i64) -> Result<usize, String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "UPDATE sessions
             SET state = 'Exited', exit_code = ?1, exited_at = COALESCE(exited_at, ?2)
             WHERE state IN ('Starting', 'Running')",
            params![exit_code, now],
        ))
    }

    /// Get sessions that were Running/Starting when the app exited.
    /// Used to rebuild their PTY processes on restart.
    pub fn get_incomplete_sessions(&self) -> Result<Vec<SessionRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = db_err!(conn.prepare(
            "SELECT id, project_id, name, command, args, cwd, state, exit_code, created_at, exited_at, archived_at FROM sessions WHERE state IN ('Starting', 'Running')"
        ))?;
        let rows = db_err!(stmt.query_map([], Self::row_to_session))?;
        rows.collect::<SqlResult<Vec<_>>>().map_err(|e| format!("{}", e))
    }

    pub fn rename_session(&self, id: &str, name: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute("UPDATE sessions SET name = ?1 WHERE id = ?2", params![name, id]))?;
        Ok(())
    }

    pub fn archive_session(&self, id: &str, now: i64) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "UPDATE sessions SET state = 'Archived', archived_at = ?1 WHERE id = ?2",
            params![now, id],
        ))?;
        Ok(())
    }

    pub fn delete_session(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute("DELETE FROM output_search WHERE session_id = ?1", params![id]))?;
        db_err!(conn.execute("DELETE FROM sessions WHERE id = ?1", params![id]))?;
        Ok(())
    }

    // --- Output chunks ---

    pub fn insert_output_chunk(
        &self, session_id: &str, seq: i64, timestamp: i64,
        byte_offset: i64, byte_length: i64,
    ) -> Result<i64, String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "INSERT INTO output_chunks (session_id, seq, timestamp, byte_offset, byte_length) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![session_id, seq, timestamp, byte_offset, byte_length],
        ))?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_output_chunks(&self, session_id: &str) -> Result<Vec<(i64, i64, i64)>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = db_err!(conn.prepare(
            "SELECT seq, byte_offset, byte_length FROM output_chunks WHERE session_id = ?1 ORDER BY seq ASC"
        ))?;
        let rows = db_err!(stmt.query_map(params![session_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?))
        }))?;
        rows.collect::<SqlResult<Vec<_>>>().map_err(|e| format!("{}", e))
    }

    // --- FTS Search ---

    pub fn insert_search_content(&self, session_id: &str, content: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "INSERT INTO output_search (session_id, content) VALUES (?1, ?2)",
            params![session_id, content],
        ))?;
        Ok(())
    }

    pub fn search_content(&self, query: &str, project_id: Option<&str>) -> Result<Vec<SearchResult>, String> {
        let conn = self.conn.lock().unwrap();
        let (sql, params): (&str, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(pid) = project_id {
            (r#"SELECT s.id, s.name, snippet(output_search, 1, '>>>', '<<<', '...', 20), rank
               FROM output_search JOIN sessions s ON output_search.session_id = s.id
               WHERE output_search MATCH ?1 AND s.project_id = ?2
               ORDER BY rank LIMIT 50"#,
             vec![Box::new(query.to_string()), Box::new(pid.to_string())])
        } else {
            (r#"SELECT s.id, s.name, snippet(output_search, 1, '>>>', '<<<', '...', 20), rank
               FROM output_search JOIN sessions s ON output_search.session_id = s.id
               WHERE output_search MATCH ?1
               ORDER BY rank LIMIT 50"#,
             vec![Box::new(query.to_string())])
        };

        let mut stmt = db_err!(conn.prepare(sql))?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let rows = db_err!(stmt.query_map(param_refs.as_slice(), |row| {
            Ok(SearchResult {
                session_id: row.get(0)?,
                session_name: row.get(1)?,
                snippet: row.get(2)?,
                rank: row.get(3)?,
            })
        }))?;
        rows.collect::<SqlResult<Vec<_>>>().map_err(|e| format!("{}", e))
    }

    // --- Settings ---

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = db_err!(conn.prepare("SELECT value FROM settings WHERE key = ?1"))?;
        let mut rows = db_err!(stmt.query(params![key]))?;
        match rows.next() {
            Ok(Some(row)) => Ok(Some(row.get(0).map_err(|e| format!("{}", e))?)),
            Ok(None) => Ok(None),
            Err(e) => Err(format!("{}", e)),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        db_err!(conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        ))?;
        Ok(())
    }
}
