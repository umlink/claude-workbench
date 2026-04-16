pub mod db;
pub mod log;
pub mod schema;

use db::Database;
use std::path::PathBuf;

/// Storage manager coordinates database and log file operations.
pub struct StorageManager {
    pub db: Database,
    pub data_dir: PathBuf,
}

impl StorageManager {
    pub fn open(data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;

        let db_path = data_dir.join("claude-workbench.db");
        let db = Database::open(&db_path)?;

        Ok(StorageManager { db, data_dir })
    }
}
