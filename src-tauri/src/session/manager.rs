use crate::session::SessionState;
use crate::session::file_tracker::FileTracker;
use crate::session::{ProjectInfo, SessionInfo};
use crate::storage::db::ChangedFileRecord;
use crate::storage::log::{self, SessionLogger};
use crate::storage::StorageManager;

use chrono::Utc;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{mpsc, Arc, Mutex as StdMutex};
use std::thread;
use tauri::AppHandle;
use tauri::Emitter;
use uuid::Uuid;

/// Active PTY session
pub struct ActiveSession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn portable_pty::ChildKiller + Send + Sync>,
    state: Arc<StdMutex<SessionState>>,
}

/// Session manager coordinates PTY lifecycle, storage, and log writing
pub struct SessionManager {
    pty_sessions: HashMap<String, ActiveSession>,
    storage: StorageManager,
    file_tracker: FileTracker,
}

impl SessionManager {
    pub fn new(storage: StorageManager, app_handle: AppHandle) -> Self {
        let file_tracker = FileTracker::new(storage.db.clone());
        let mut manager = SessionManager {
            pty_sessions: HashMap::new(),
            storage,
            file_tracker,
        };

        if let Err(error) = manager.reconcile_startup_state(&app_handle) {
            eprintln!("Failed to reconcile session state on startup: {}", error);
        }

        manager
    }

    fn reconcile_startup_state(&mut self, app_handle: &AppHandle) -> Result<(), String> {
        // Find sessions that were Running/Starting when the app last exited
        let incomplete = self.storage.db.get_incomplete_sessions()?;

        for record in incomplete {
            eprintln!(
                "Rebuilding session {} (command: {})",
                record.id, record.command
            );

            let args: Vec<String> = serde_json::from_str(&record.args).unwrap_or_default();

            match self.spawn_pty(
                record.id.clone(),
                &record.command,
                args,
                &record.cwd,
                24,
                80,
                app_handle.clone(),
            ) {
                Ok(()) => {
                    // Update DB state to Running
                    self.storage.db.update_session_state(
                        &record.id,
                        "Running",
                        None,
                        None,
                    )?;
                }
                Err(e) => {
                    eprintln!("Failed to rebuild session {}: {}", record.id, e);
                    // Fall back to marking only this session as Exited
                    let now = Utc::now().timestamp_millis();
                    self.storage.db.update_session_state(
                        &record.id,
                        "Exited",
                        Some(-1),
                        Some(now),
                    )?;
                }
            }
        }

        Ok(())
    }

    /// Create and start a new session
    pub fn create_session(
        &mut self,
        project_id: &str,
        name: &str,
        command: &str,
        args: Vec<String>,
        cwd: &str,
        initial_rows: u16,
        initial_cols: u16,
        app_handle: AppHandle,
    ) -> Result<SessionInfo, String> {
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let args_json = serde_json::to_string(&args).unwrap_or("[]".to_string());

        // Persist to database
        self.storage.db.create_session(
            &session_id,
            project_id,
            name,
            command,
            &args_json,
            cwd,
            now,
        )?;

        // Spawn PTY
        self.spawn_pty(session_id.clone(), command, args.clone(), cwd, initial_rows, initial_cols, app_handle)?;

        // Update DB state
        self.storage.db.update_session_state(&session_id, "Running", None, None)?;

        Ok(SessionInfo {
            id: session_id,
            project_id: project_id.to_string(),
            name: name.to_string(),
            command: command.to_string(),
            args,
            cwd: cwd.to_string(),
            state: "Running".to_string(),
            exit_code: None,
            created_at: now,
            exited_at: None,
        })
    }

    /// Spawn a PTY process for a session (used by create_session and reconcile)
    fn spawn_pty(
        &mut self,
        session_id: String,
        command: &str,
        args: Vec<String>,
        cwd: &str,
        initial_rows: u16,
        initial_cols: u16,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: initial_rows,
                cols: initial_cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let mut cmd = CommandBuilder::new(command);
        cmd.args(&args);
        cmd.cwd(cwd);

        #[cfg(unix)]
        {
            cmd.env("TERM", "xterm-256color");
        }

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn command: {}", e))?;

        let killer = child.clone_killer();

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take writer: {}", e))?;

        let session_state = Arc::new(StdMutex::new(SessionState::Starting));
        let (exit_tx, exit_rx) = mpsc::channel::<i32>();

        let session_id_for_reader = session_id.clone();
        let app_handle_for_reader = app_handle.clone();
        let state_for_reader = session_state.clone();
        let reader_db = self.storage.db.clone(); // Database is Arc-backed, Clone + Send

        // Wait thread: report exit code
        thread::spawn(move || {
            match child.wait() {
                Ok(status) => {
                    let code = status.exit_code() as i32;
                    let _ = exit_tx.send(code);
                }
                Err(e) => {
                    eprintln!("Error waiting for child: {}", e);
                    let _ = exit_tx.send(-1);
                }
            }
        });

        // Reader thread: UTF-8 buffered read + log write + DB index + event emission
        let reader_db_session_id = session_id.clone();
        let reader_data_dir = self.storage.data_dir.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 8192];
            let mut reader = reader;
            let mut seq = 0u64;
            let mut pending: Vec<u8> = Vec::new();

            // Open a separate logger for this thread
            let mut logger = match SessionLogger::open(&reader_data_dir, &reader_db_session_id) {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("Failed to open logger in reader thread: {}", e);
                    return;
                }
            };

            // Mark as running
            {
                let mut s = state_for_reader.lock().unwrap();
                *s = SessionState::Running;
            }
            let _ = app_handle_for_reader.emit(
                "session-state-changed",
                serde_json::json!({
                    "sessionId": session_id_for_reader,
                    "state": "Running"
                }),
            );

            loop {
                match reader.read(&mut buf) {
                    Ok(n) if n > 0 => {
                        seq += 1;

                        // UTF-8 buffering
                        let mut combined = Vec::with_capacity(pending.len() + n);
                        combined.extend_from_slice(&pending);
                        combined.extend_from_slice(&buf[..n]);
                        pending.clear();

                        let chunk = match std::str::from_utf8(&combined) {
                            Ok(s) => s.to_string(),
                            Err(e) => {
                                let valid_up_to = e.valid_up_to();
                                if valid_up_to > 0 {
                                    let valid =
                                        std::str::from_utf8(&combined[..valid_up_to]).unwrap();
                                    pending.extend_from_slice(&combined[valid_up_to..]);
                                    valid.to_string()
                                } else {
                                    pending = combined;
                                    continue;
                                }
                            }
                        };

                        // Write raw bytes to log file
                        let raw_bytes = if pending.is_empty() {
                            combined
                        } else {
                            // Only write the valid portion
                            combined[..combined.len() - pending.len()].to_vec()
                        };

                        if !raw_bytes.is_empty() {
                            if let Ok((offset, length)) = logger.write_chunk(&raw_bytes) {
                                // Write chunk metadata to DB
                                let now = chrono::Utc::now().timestamp_millis();
                                let _ = reader_db.insert_output_chunk(
                                    &reader_db_session_id,
                                    seq as i64,
                                    now,
                                    offset as i64,
                                    length as i64,
                                );

                                // Index in FTS (strip ANSI for search)
                                let plain_text = log::strip_ansi(&raw_bytes);
                                if !plain_text.trim().is_empty() {
                                    let _ = reader_db.insert_search_content(
                                        &reader_db_session_id,
                                        &plain_text,
                                    );
                                }
                            }
                        }

                        // Emit to frontend
                        let _ = app_handle_for_reader.emit(
                            "terminal-output",
                            serde_json::json!({
                                "sessionId": session_id_for_reader,
                                "chunk": chunk,
                                "seq": seq
                            }),
                        );
                    }
                    Ok(_) => {
                        // EOF
                        let exit_code = exit_rx
                            .recv_timeout(std::time::Duration::from_secs(3))
                            .unwrap_or(0);

                        // Flush remaining bytes
                        if !pending.is_empty() {
                            let remaining = String::from_utf8_lossy(&pending).to_string();
                            if !remaining.is_empty() {
                                let _ = logger.write_chunk(&pending);
                                seq += 1;
                                let _ = app_handle_for_reader.emit(
                                    "terminal-output",
                                    serde_json::json!({
                                        "sessionId": session_id_for_reader,
                                        "chunk": remaining,
                                        "seq": seq
                                    }),
                                );
                            }
                        }

                        {
                            let mut s = state_for_reader.lock().unwrap();
                            *s = SessionState::Exited(exit_code);
                        }

                        let _ = reader_db.update_session_state(
                            &reader_db_session_id,
                            "Exited",
                            Some(exit_code),
                            Some(Utc::now().timestamp_millis()),
                        );

                        let _ = app_handle_for_reader.emit(
                            "terminal-exited",
                            serde_json::json!({
                                "sessionId": session_id_for_reader,
                                "exitCode": exit_code
                            }),
                        );
                        let _ = app_handle_for_reader.emit(
                            "session-state-changed",
                            serde_json::json!({
                                "sessionId": session_id_for_reader,
                                "state": "Exited"
                            }),
                        );
                        break;
                    }
                    Err(e) => {
                        eprintln!("Error reading from PTY: {}", e);
                        let exit_code = exit_rx
                            .recv_timeout(std::time::Duration::from_secs(3))
                            .unwrap_or(1);

                        {
                            let mut s = state_for_reader.lock().unwrap();
                            *s = SessionState::Exited(exit_code);
                        }

                        let _ = reader_db.update_session_state(
                            &reader_db_session_id,
                            "Exited",
                            Some(exit_code),
                            Some(Utc::now().timestamp_millis()),
                        );

                        let _ = app_handle_for_reader.emit(
                            "terminal-exited",
                            serde_json::json!({
                                "sessionId": session_id_for_reader,
                                "exitCode": exit_code
                            }),
                        );
                        let _ = app_handle_for_reader.emit(
                            "session-state-changed",
                            serde_json::json!({
                                "sessionId": session_id_for_reader,
                                "state": "Exited"
                            }),
                        );
                        break;
                    }
                }
            }
        });

        // Store active session
        self.pty_sessions.insert(
            session_id,
            ActiveSession {
                master: pair.master,
                writer,
                killer,
                state: session_state,
            },
        );

        Ok(())
    }

    /// Write input to a session's PTY
    pub fn write_input(&mut self, session_id: &str, data: &str) -> Result<(), String> {
        let session = self
            .pty_sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Session {} not found or not active", session_id))?;
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write: {}", e))?;
        session
            .writer
            .flush()
            .map_err(|e| format!("Failed to flush: {}", e))
    }

    /// Resize a session's PTY
    pub fn resize(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let session = self
            .pty_sessions
            .get(session_id)
            .ok_or_else(|| format!("Session {} not found or not active", session_id))?;
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize: {}", e))
    }

    /// Kill a running session
    pub fn kill(&mut self, session_id: &str) -> Result<(), String> {
        let session = self
            .pty_sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Session {} not found or not active", session_id))?;
        session
            .killer
            .kill()
            .map_err(|e| format!("Failed to kill: {}", e))
    }

    /// Destroy a session (kill if running, remove from memory)
    pub fn destroy(&mut self, session_id: &str) -> Result<(), String> {
        if let Some(session) = self.pty_sessions.get_mut(session_id) {
            if matches!(
                *session.state.lock().unwrap(),
                SessionState::Running | SessionState::Starting
            ) {
                let _ = session.killer.kill();
            }
        }
        self.pty_sessions.remove(session_id);

        // Remove log file
        let log_path = self.storage.data_dir.join("sessions").join(format!("{}.log", session_id));
        if log_path.exists() {
            let _ = std::fs::remove_file(&log_path);
        }

        // Remove from database (cascades to output_chunks, also cleans FTS)
        self.storage.db.delete_session(session_id)?;

        Ok(())
    }

    /// Archive a session (kill PTY if still running)
    pub fn archive(&mut self, session_id: &str) -> Result<(), String> {
        // Kill PTY if the session is still running
        if let Some(session) = self.pty_sessions.get_mut(session_id) {
            if matches!(
                *session.state.lock().unwrap(),
                SessionState::Running | SessionState::Starting
            ) {
                let _ = session.killer.kill();
            }
            self.pty_sessions.remove(session_id);
        }
        let now = Utc::now().timestamp_millis();
        self.storage.db.archive_session(session_id, now)
    }

    /// Rename a session
    pub fn rename(&self, session_id: &str, name: &str) -> Result<(), String> {
        self.storage.db.rename_session(session_id, name)
    }

    /// List sessions from database
    pub fn list_sessions(&self, project_id: Option<&str>) -> Result<Vec<SessionInfo>, String> {
        let records = self.storage.db.list_sessions(project_id)?;
        Ok(records
            .into_iter()
            .map(|r| SessionInfo {
                id: r.id,
                project_id: r.project_id,
                name: r.name,
                command: r.command,
                args: serde_json::from_str(&r.args).unwrap_or_default(),
                cwd: r.cwd,
                state: r.state,
                exit_code: r.exit_code,
                created_at: r.created_at,
                exited_at: r.exited_at,
            })
            .collect())
    }

    /// Get single session info
    pub fn get_session(&self, session_id: &str) -> Result<Option<SessionInfo>, String> {
        let record = self.storage.db.get_session(session_id)?;
        Ok(record.map(|r| SessionInfo {
            id: r.id,
            project_id: r.project_id,
            name: r.name,
            command: r.command,
            args: serde_json::from_str(&r.args).unwrap_or_default(),
            cwd: r.cwd,
            state: r.state,
            exit_code: r.exit_code,
            created_at: r.created_at,
            exited_at: r.exited_at,
        }))
    }

    /// Replay a session's output from log file
    pub fn replay_session(&self, session_id: &str) -> Result<Vec<String>, String> {
        let chunks = self.storage.db.get_output_chunks(session_id)?;
        let mut logger = match SessionLogger::open_readonly(&self.storage.data_dir, session_id) {
            Ok(logger) => logger,
            Err(_) => return Ok(Vec::new()),
        };

        if chunks.is_empty() {
            let raw = logger.read_all().unwrap_or_default();
            if raw.is_empty() {
                return Ok(Vec::new());
            }
            return Ok(vec![String::from_utf8_lossy(&raw).to_string()]);
        }

        let mut output = Vec::with_capacity(chunks.len());
        for (_seq, byte_offset, byte_length) in chunks {
            let raw = logger.read_range(byte_offset as u64, byte_length as u64).unwrap_or_default();
            if raw.is_empty() {
                continue;
            }
            let text = String::from_utf8_lossy(&raw).to_string();
            output.push(text);
        }
        // Fallback: if chunk-by-chunk read yielded nothing, try reading the whole file
        if output.is_empty() {
            let fallback = logger.read_all().unwrap_or_default();
            if !fallback.is_empty() {
                return Ok(vec![String::from_utf8_lossy(&fallback).to_string()]);
            }
        }
        Ok(output)
    }

    /// Search across sessions
    pub fn search(&self, query: &str, project_id: Option<&str>) -> Result<Vec<crate::storage::db::SearchResult>, String> {
        self.storage.db.search_content(query, project_id)
    }

    /// Clean up exited sessions from memory
    #[allow(dead_code)]
    pub fn cleanup_exited(&mut self) -> Vec<String> {
        let exited: Vec<String> = self
            .pty_sessions
            .iter()
            .filter(|(_, s)| matches!(*s.state.lock().unwrap(), SessionState::Exited(_)))
            .map(|(id, _)| id.clone())
            .collect();

        for id in &exited {
            self.pty_sessions.remove(id);
        }
        exited
    }

    /// Check if a session is currently active (has a PTY)
    #[allow(dead_code)]
    pub fn is_active(&self, session_id: &str) -> bool {
        self.pty_sessions.contains_key(session_id)
    }

    // --- Project operations (delegate to storage) ---

    pub fn create_project(&self, name: &str, path: &str) -> Result<ProjectInfo, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        self.storage.db.create_project(&id, name, path, now)?;
        Ok(ProjectInfo {
            id,
            name: name.to_string(),
            path: path.to_string(),
            created_at: now,
            updated_at: now,
            session_count: Some(0),
        })
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectInfo>, String> {
        let records = self.storage.db.list_projects()?;
        Ok(records
            .into_iter()
            .map(|r| ProjectInfo {
                id: r.id,
                name: r.name,
                path: r.path,
                created_at: r.created_at,
                updated_at: r.updated_at,
                session_count: None,
            })
            .collect())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        self.storage.db.delete_project(id)
    }

    pub fn rename_project(&self, id: &str, name: &str) -> Result<(), String> {
        let now = Utc::now().timestamp_millis();
        self.storage.db.rename_project(id, name, now)
    }

    // --- Settings ---

    pub fn get_settings(&self) -> Result<crate::session::AppSettings, String> {
        let defaults = crate::session::AppSettings::default();
        Ok(crate::session::AppSettings {
            terminal_font_family: self
                .storage
                .db
                .get_setting("terminal_font_family")?
                .unwrap_or(defaults.terminal_font_family),
            terminal_font_size: self
                .storage
                .db
                .get_setting("terminal_font_size")?
                .and_then(|v| v.parse().ok())
                .unwrap_or(defaults.terminal_font_size),
            terminal_scrollback: self
                .storage
                .db
                .get_setting("terminal_scrollback")?
                .and_then(|v| v.parse().ok())
                .unwrap_or(defaults.terminal_scrollback),
            data_retention_days: self
                .storage
                .db
                .get_setting("data_retention_days")?
                .and_then(|v| v.parse().ok())
                .unwrap_or(defaults.data_retention_days),
        })
    }

    pub fn update_settings(&self, settings: &crate::session::AppSettings) -> Result<(), String> {
        self.storage
            .db
            .set_setting("terminal_font_family", &settings.terminal_font_family)?;
        self.storage
            .db
            .set_setting("terminal_font_size", &settings.terminal_font_size.to_string())?;
        self.storage
            .db
            .set_setting("terminal_scrollback", &settings.terminal_scrollback.to_string())?;
        self.storage
            .db
            .set_setting("data_retention_days", &settings.data_retention_days.to_string())?;
        Ok(())
    }

    // --- File Change Tracking ---

    /// Take a start snapshot for a session
    pub fn take_start_snapshot(
        &self,
        session_id: &str,
        project_path: &str,
    ) -> Result<(), String> {
        let _ = self.file_tracker.take_snapshot(session_id, "start", project_path)?;
        Ok(())
    }

    /// Detect changes for a session (takes end snapshot and compares)
    pub fn detect_changes(
        &self,
        session_id: &str,
        project_path: &str,
    ) -> Result<Vec<ChangedFileRecord>, String> {
        self.file_tracker.detect_changes(session_id, project_path)
    }

    /// Get changed files for a session (without re-detecting)
    pub fn get_changed_files(&self, session_id: &str) -> Result<Vec<ChangedFileRecord>, String> {
        self.file_tracker.get_changed_files(session_id)
    }
}
