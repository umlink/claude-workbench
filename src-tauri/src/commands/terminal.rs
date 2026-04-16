use crate::session::manager::SessionManager;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub session_manager: Mutex<SessionManager>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn write_to_terminal(
    session_id: String,
    data: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state.session_manager.lock().unwrap();
    manager.write_input(&session_id, &data)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn resize_terminal(
    session_id: String,
    rows: u16,
    cols: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.session_manager.lock().unwrap();
    manager.resize(&session_id, rows, cols)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn kill_terminal(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state.session_manager.lock().unwrap();
    manager.kill(&session_id)
}
