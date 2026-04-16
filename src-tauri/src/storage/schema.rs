/// SQL schema definitions for Claude Workbench

pub const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    command     TEXT NOT NULL,
    args        TEXT NOT NULL DEFAULT '[]',
    cwd         TEXT NOT NULL,
    state       TEXT NOT NULL DEFAULT 'Starting',
    exit_code   INTEGER,
    created_at  INTEGER NOT NULL,
    exited_at   INTEGER,
    archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS output_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,
    timestamp   INTEGER NOT NULL,
    byte_offset INTEGER NOT NULL,
    byte_length INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);
CREATE INDEX IF NOT EXISTS idx_output_chunks_session ON output_chunks(session_id, seq);

CREATE VIRTUAL TABLE IF NOT EXISTS output_search USING fts5(
    session_id,
    content,
    tokenize='unicode61'
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;
