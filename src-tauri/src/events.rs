use serde::Serialize;

/// Event payload types for documentation purposes.
/// Actual events are emitted via `serde_json::json!` in the reader thread.

#[allow(dead_code)]
#[derive(Clone, Serialize)]
pub struct TerminalOutputPayload {
    pub session_id: String,
    pub chunk: String,
    pub seq: u64,
}

#[allow(dead_code)]
#[derive(Clone, Serialize)]
pub struct TerminalExitedPayload {
    pub session_id: String,
    pub exit_code: i32,
}

#[allow(dead_code)]
#[derive(Clone, Serialize)]
pub struct SessionStateChangedPayload {
    pub session_id: String,
    pub state: String,
}
