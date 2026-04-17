use crate::session::ProjectInfo;

use super::terminal::AppState;

#[tauri::command]
pub async fn create_project(
    name: String,
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<ProjectInfo, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.create_project(&name, &path)
}

#[tauri::command]
pub async fn list_projects(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ProjectInfo>, String> {
    let manager = state.session_manager.lock().unwrap();
    manager.list_projects()
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_project(
    project_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.session_manager.lock().unwrap();
    manager.delete_project(&project_id)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn rename_project(
    project_id: String,
    name: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.session_manager.lock().unwrap();
    manager.rename_project(&project_id, &name)
}

#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    let dialog = rfd::FileDialog::new()
        .set_title("Select Project Folder")
        .pick_folder();

    match dialog {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get home directory".to_string())
}
