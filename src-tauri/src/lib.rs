mod commands;
mod events;
mod session;
mod storage;

use commands::changes::*;
use commands::project::*;
use commands::session::*;
use commands::terminal::*;
use storage::StorageManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let storage = StorageManager::open(data_dir)
                .expect("Failed to initialize storage");
            let session_manager =
                session::manager::SessionManager::new(storage, app.handle().clone());

            app.manage(commands::terminal::AppState {
                session_manager: std::sync::Mutex::new(session_manager),
            });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Terminal
            write_to_terminal,
            resize_terminal,
            kill_terminal,
            // Session
            create_session,
            list_sessions,
            get_session,
            rename_session,
            archive_session,
            destroy_session,
            replay_session,
            search_sessions,
            get_settings,
            update_settings,
            // Project
            create_project,
            list_projects,
            delete_project,
            rename_project,
            pick_folder,
            get_home_dir,
            // Changes
            take_start_snapshot,
            detect_changes,
            get_changed_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
