//! Tauri commands for file change detection

use crate::commands::terminal::AppState;
use crate::storage::db::ChangedFileRecord;
use tauri::State;

/// Take a start snapshot for a session
#[tauri::command(rename_all = "snake_case")]
pub async fn take_start_snapshot(
    session_id: String,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.session_manager.lock().unwrap();
    manager.take_start_snapshot(&session_id, &project_path)
}

/// Detect changes for a session (takes end snapshot and compares)
#[tauri::command(rename_all = "snake_case")]
pub async fn detect_changes(
    session_id: String,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChangedFileRecord>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.detect_changes(&session_id, &project_path)
}

/// Get changed files for a session (without re-detecting)
#[tauri::command(rename_all = "snake_case")]
pub async fn get_changed_files(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChangedFileRecord>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.get_changed_files(&session_id)
}
