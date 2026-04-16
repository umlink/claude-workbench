use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

/// Append-only session log writer.
/// Each session stores raw PTY output bytes in a dedicated file for forensic accuracy.
pub struct SessionLogger {
    file: File,
    #[allow(dead_code)]
    path: PathBuf,
    byte_offset: u64,
}

impl SessionLogger {
    /// Open (or create) a log file for the given session.
    /// Log files are stored under `{data_dir}/sessions/{session_id}.log`
    pub fn open(data_dir: &Path, session_id: &str) -> Result<Self, String> {
        let sessions_dir = data_dir.join("sessions");
        fs::create_dir_all(&sessions_dir)
            .map_err(|e| format!("Failed to create sessions directory: {}", e))?;

        let path = sessions_dir.join(format!("{}.log", session_id));
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .read(true)
            .open(&path)
            .map_err(|e| format!("Failed to open log file: {}", e))?;

        // Get current file size for byte offset tracking
        let byte_offset = file
            .metadata()
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(SessionLogger {
            file,
            path,
            byte_offset,
        })
    }

    /// Write a chunk of raw bytes to the log file.
    /// Returns (byte_offset, byte_length) for indexing in the database.
    pub fn write_chunk(&mut self, data: &[u8]) -> Result<(u64, u64), String> {
        let offset = self.byte_offset;
        self.file
            .write_all(data)
            .map_err(|e| format!("Failed to write log chunk: {}", e))?;
        self.file
            .flush()
            .map_err(|e| format!("Failed to flush log: {}", e))?;
        let length = data.len() as u64;
        self.byte_offset += length;
        Ok((offset, length))
    }

    /// Read a range of bytes from the log file.
    /// Returns up to `length` bytes starting from `offset`. If the file is
    /// truncated (e.g. after a crash), returns whatever bytes are available
    /// instead of failing.
    pub fn read_range(&mut self, offset: u64, length: u64) -> Result<Vec<u8>, String> {
        self.file
            .seek(SeekFrom::Start(offset))
            .map_err(|e| format!("Failed to seek in log: {}", e))?;

        // Clamp read to actual file size to handle truncated logs gracefully
        let file_size = self.file.metadata().map(|m| m.len()).unwrap_or(0);
        let available = if offset >= file_size {
            0
        } else {
            file_size - offset
        };
        let read_len = std::cmp::min(length, available) as usize;

        if read_len == 0 {
            return Ok(Vec::new());
        }

        let mut buf = vec![0u8; read_len];
        self.file
            .read_exact(&mut buf)
            .map_err(|e| format!("Failed to read log range: {}", e))?;
        Ok(buf)
    }

    /// Read the entire log file from the beginning.
    pub fn read_all(&mut self) -> Result<Vec<u8>, String> {
        self.file
            .seek(SeekFrom::Start(0))
            .map_err(|e| format!("Failed to seek to start of log: {}", e))?;

        let mut buf = Vec::new();
        self.file
            .read_to_end(&mut buf)
            .map_err(|e| format!("Failed to read log file: {}", e))?;
        Ok(buf)
    }

    /// Open an existing log file in read-only mode for replay.
    /// Returns an error if the file does not exist.
    pub fn open_readonly(data_dir: &Path, session_id: &str) -> Result<Self, String> {
        let sessions_dir = data_dir.join("sessions");
        let path = sessions_dir.join(format!("{}.log", session_id));

        if !path.exists() {
            return Err(format!("Log file does not exist: {}", path.display()));
        }

        let file = OpenOptions::new()
            .read(true)
            .open(&path)
            .map_err(|e| format!("Failed to open log file for reading: {}", e))?;

        let byte_offset = file
            .metadata()
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(SessionLogger {
            file,
            path,
            byte_offset,
        })
    }

    /// Get the log file path.
    #[allow(dead_code)]
    pub fn path(&self) -> &Path {
        &self.path
    }
}

/// Compiled regex for stripping ANSI escape sequences.
static ANSI_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(
        r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[\[()\]]"
    ).unwrap()
});

/// Strip ANSI escape sequences from a byte slice, returning plain text.
/// Used for search indexing only - never for display.
pub fn strip_ansi(data: &[u8]) -> String {
    let text = String::from_utf8_lossy(data);
    ANSI_RE.replace_all(&text, "").to_string()
}
