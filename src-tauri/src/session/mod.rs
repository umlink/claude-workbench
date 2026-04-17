pub mod manager;
pub mod file_tracker;

use serde::{Deserialize, Serialize};

/// Internal PTY session lifecycle state (shared between Session struct and reader thread)
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SessionState {
    Starting,
    Running,
    Exited(i32),
}

/// Lifecycle state of a session (for frontend communication)
/// Kept as a typed reference for future use when migrating to typed event payloads.
#[allow(dead_code)]
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize)]
#[serde(tag = "type", content = "code")]
pub enum SessionLifecycleState {
    Starting,
    Running,
    Exited(i32),
    Archived,
}

#[allow(dead_code)]
impl SessionLifecycleState {
    pub fn as_str(&self) -> &str {
        match self {
            SessionLifecycleState::Starting => "Starting",
            SessionLifecycleState::Running => "Running",
            SessionLifecycleState::Exited(_) => "Exited",
            SessionLifecycleState::Archived => "Archived",
        }
    }
}

/// Full session info returned to frontend
#[derive(Clone, Serialize, Debug)]
pub struct SessionInfo {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub cwd: String,
    pub state: String,
    pub exit_code: Option<i32>,
    pub created_at: i64,
    pub exited_at: Option<i64>,
}

/// Project info returned to frontend
#[derive(Clone, Serialize, Debug)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub session_count: Option<i64>,
}

/// App settings
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppSettings {
    pub terminal_font_family: String,
    pub terminal_font_size: u32,
    pub terminal_scrollback: u32,
    pub data_retention_days: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            terminal_font_family: "JetBrains Mono, Menlo".to_string(),
            terminal_font_size: 14,
            terminal_scrollback: 10000,
            data_retention_days: 90,
        }
    }
}
