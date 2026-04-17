//! File change detection and snapshot management

use crate::storage::db::{ChangedFileRecord, FileSnapshotRecord, Database};
use chrono::Utc;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

/// File change type
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChangeType {
    Added,
    Modified,
    Deleted,
}

impl ChangeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ChangeType::Added => "added",
            ChangeType::Modified => "modified",
            ChangeType::Deleted => "deleted",
        }
    }
}

/// File information for snapshot
#[derive(Debug, Clone)]
pub struct FileInfo {
    pub path: String,
    pub hash: Option<String>,
    pub size: Option<i64>,
    pub modified_at: Option<i64>,
}

/// File tracker responsible for taking snapshots and detecting changes
pub struct FileTracker {
    db: Database,
}

impl FileTracker {
    pub fn new(db: Database) -> Self {
        FileTracker { db }
    }

    /// Take a snapshot of all files in a directory
    pub fn take_snapshot(
        &self,
        session_id: &str,
        snapshot_type: &str,
        project_path: &str,
    ) -> Result<Vec<FileSnapshotRecord>, String> {
        let now = Utc::now().timestamp_millis();
        let path = Path::new(project_path);

        if !path.exists() || !path.is_dir() {
            return Err(format!("Project path does not exist or is not a directory: {}", project_path));
        }

        let mut snapshots = Vec::new();

        // Walk the directory, skip hidden files and common ignore patterns
        for entry in WalkDir::new(path)
            .into_iter()
            .filter_entry(|e| !is_ignored(e.path()))
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let file_info = self.get_file_info(entry.path(), path)?;
                snapshots.push(FileSnapshotRecord {
                    id: None,
                    session_id: session_id.to_string(),
                    snapshot_type: snapshot_type.to_string(),
                    file_path: file_info.path,
                    file_hash: file_info.hash,
                    file_size: file_info.size,
                    modified_at: file_info.modified_at,
                    created_at: now,
                });
            }
        }

        // Save to database
        self.db.insert_file_snapshots_batch(&snapshots)?;

        Ok(snapshots)
    }

    /// Get file info (hash, size, modified time)
    fn get_file_info(&self, full_path: &Path, base_path: &Path) -> Result<FileInfo, String> {
        let rel_path = full_path.strip_prefix(base_path)
            .map_err(|e| format!("Failed to get relative path: {}", e))?;
        let rel_path_str = rel_path.to_string_lossy().to_string();

        let metadata = fs::metadata(full_path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let size = Some(metadata.len() as i64);
        let modified_at = metadata.modified().ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);

        // Compute hash, but skip large files (> 10MB) for performance
        let hash = if metadata.len() > 10 * 1024 * 1024 {
            None
        } else {
            self.compute_file_hash(full_path).ok()
        };

        Ok(FileInfo {
            path: rel_path_str,
            hash,
            size,
            modified_at,
        })
    }

    /// Compute SHA-256 hash of a file
    fn compute_file_hash(&self, path: &Path) -> Result<String, String> {
        let mut file = fs::File::open(path)
            .map_err(|e| format!("Failed to open file: {}", e))?;

        let mut hasher = Sha256::new();
        let mut buffer = [0; 8192];

        use std::io::Read;
        loop {
            let bytes_read = file.read(&mut buffer)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let result = hasher.finalize();
        Ok(format!("{:x}", result))
    }

    /// Detect changes between start and end snapshots
    pub fn detect_changes(
        &self,
        session_id: &str,
        project_path: &str,
    ) -> Result<Vec<ChangedFileRecord>, String> {
        let now = Utc::now().timestamp_millis();

        // Get start snapshot
        let start_snapshots = self.db.get_file_snapshots(session_id, "start")?;
        let start_map: HashMap<_, _> = start_snapshots
            .into_iter()
            .map(|s| (s.file_path.clone(), s))
            .collect();

        // Take end snapshot
        let end_snapshots = self.take_snapshot(session_id, "end", project_path)?;
        let end_map: HashMap<_, _> = end_snapshots
            .into_iter()
            .map(|s| (s.file_path.clone(), s))
            .collect();

        let mut changed_files = Vec::new();
        let all_paths: HashSet<_> = start_map.keys().chain(end_map.keys()).collect();

        for path in all_paths {
            let change = match (start_map.get(path), end_map.get(path)) {
                (Some(start), Some(end)) => {
                    if start.file_hash != end.file_hash || start.file_size != end.file_size {
                        Some((ChangeType::Modified, start.file_hash.clone(), end.file_hash.clone()))
                    } else {
                        None
                    }
                }
                (None, Some(end)) => {
                    Some((ChangeType::Added, None, end.file_hash.clone()))
                }
                (Some(start), None) => {
                    Some((ChangeType::Deleted, start.file_hash.clone(), None))
                }
                (None, None) => None,
            };

            if let Some((change_type_val, old_hash, new_hash)) = change {
                changed_files.push(ChangedFileRecord {
                    id: None,
                    session_id: session_id.to_string(),
                    file_path: path.to_string(),
                    change_type: change_type_val.as_str().to_string(),
                    old_hash,
                    new_hash,
                    detected_at: now,
                });
            }
        }

        // Clear old changes and save new ones
        let _ = self.db.delete_changed_files(session_id);
        self.db.insert_changed_files_batch(&changed_files)?;

        Ok(changed_files)
    }

    /// Get changed files for a session (without re-detecting)
    pub fn get_changed_files(&self, session_id: &str) -> Result<Vec<ChangedFileRecord>, String> {
        self.db.get_changed_files(session_id)
    }
}

/// Check if a file should be ignored (hidden files, node_modules, etc.)
fn is_ignored(path: &Path) -> bool {
    // Skip hidden files/directories
    if path.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
    {
        return true;
    }

    // Skip common ignore patterns
    let skip_dirs = ["node_modules", "target", "build", "dist", ".git", ".svn"];
    for component in path.components() {
        if let Some(s) = component.as_os_str().to_str() {
            if skip_dirs.contains(&s) {
                return true;
            }
        }
    }

    false
}
