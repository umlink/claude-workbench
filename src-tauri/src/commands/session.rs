use crate::session::{AppSettings, SessionInfo};
use crate::storage::db::SearchResult;
use super::terminal::AppState;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn create_session(
    project_id: String,
    name: String,
    command: String,
    args: Vec<String>,
    cwd: String,
    rows: u16,
    cols: u16,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<SessionInfo, String> {
    let mut manager = state.session_manager.lock().unwrap();
    manager.create_session(&project_id, &name, &command, args, &cwd, rows, cols, app_handle)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_sessions(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SessionInfo>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.list_sessions(project_id.as_deref())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Option<SessionInfo>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.get_session(&session_id)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn rename_session(
    session_id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.session_manager.lock().unwrap();
    manager.rename(&session_id, &name)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn archive_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state.session_manager.lock().unwrap();
    manager.archive(&session_id)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn destroy_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state.session_manager.lock().unwrap();
    manager.destroy(&session_id)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn replay_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.replay_session(&session_id)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn search_sessions(
    query: String,
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.search(&query, project_id.as_deref())
}

#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.get_settings()
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.session_manager.lock().unwrap();
    manager.update_settings(&settings)
}
