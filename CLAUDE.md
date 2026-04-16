
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Claude Workbench** - A desktop session manager and enhanced terminal workbench for local Claude CLI, built with Tauri 2, React, TypeScript, and Rust.

## Common Commands

### Development
```bash
# Run the app in development mode
npm run tauri dev

# Typecheck frontend
npx tsc --noEmit

# Check Rust backend compilation
cd src-tauri && cargo check
```

### Build
```bash
# Build for production
npm run tauri build
```

## Architecture

### Tech Stack

#### Frontend Stack
- **Framework**: React 18.2
- **Language**: TypeScript 5.3
- **Build Tool**: Vite 5.0
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI + shadcn/ui style
- **Terminal**: xterm.js 5.3.0
  - xterm-addon-fit 0.8.0
  - xterm-addon-search 0.13.0
  - xterm-addon-web-links 0.9.0
- **State Management**: Zustand 4.5.0
- **Icons**: lucide-react 1.8.0
- **Utilities**:
  - class-variance-authority 0.7.1
  - clsx 2.1.1
  - tailwind-merge 3.5.0

#### Desktop Stack
- **Framework**: Tauri 2.0
- **CLI**: @tauri-apps/cli 2.10.1
- **Shell Plugin**: @tauri-apps/plugin-shell 2.0.0

#### Backend Stack
- **Language**: Rust
- **PTY**: portable-pty
- **Database**: SQLite (rusqlite)
- **UUID**: uuid
- **Serialization**: serde + serde_json
- **Time**: chrono
- **Logging**: tauri-plugin-log (debug mode)

### Key Directories

#### Frontend (`src/`)
```
src/
├── components/
│   ├── layout/          # Layout components
│   │   ├── Sidebar.tsx      # Left sidebar (projects/sessions)
│   │   ├── TabBar.tsx       # Session tabs
│   │   ├── MainPanel.tsx    # Terminal view container
│   │   └── RightPanel.tsx   # Session info/search
│   ├── terminal/        # Terminal components
│   │   ├── TerminalView.tsx  # Main terminal component
│   │   └── TerminalSearchBar.tsx
│   ├── session/         # Session dialogs
│   │   ├── CreateSessionDialog.tsx
│   │   └── CreateProjectDialog.tsx
│   ├── sidebar/         # Sidebar components
│   │   ├── ProjectList.tsx
│   │   └── SessionItem.tsx
│   ├── search/          # Search components
│   │   └── SearchPanel.tsx
│   ├── settings/        # Settings components
│   │   └── SettingsPage.tsx
│   └── ui/              # shadcn/ui style components
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── select.tsx
├── state/               # Zustand stores
│   ├── sessionStore.ts      # Session state management
│   ├── projectStore.ts      # Project state management
│   └── settingsStore.ts     # Settings state management
├── lib/                 # Utilities
│   ├── tauri.ts             # Tauri API wrappers
│   └── utils.ts             # Helper functions
├── hooks/               # Custom hooks
│   └── useKeyboardShortcuts.ts
├── providers/           # Context providers
│   └── ThemeProvider.tsx    # Theme (light/dark/system)
├── App.tsx              # Main app component
├── main.tsx             # React entry point
└── index.css            # Global styles (Tailwind)
```

#### Backend (`src-tauri/src/`)
```
src-tauri/src/
├── lib.rs               # Tauri app setup and entry point
├── main.rs              # Binary entry (delegates to lib.rs)
├── commands/            # Tauri command handlers
│   ├── mod.rs
│   ├── terminal.rs          # Terminal commands (write, resize, kill)
│   ├── session.rs           # Session commands (CRUD, search, replay)
│   └── project.rs           # Project commands (CRUD)
├── session/             # Session management
│   ├── mod.rs               # Data structures (SessionInfo, ProjectInfo)
│   └── manager.rs           # SessionManager (PTY lifecycle, storage)
├── storage/             # Data persistence
│   ├── mod.rs               # StorageManager coordinator
│   ├── db.rs                # SQLite database wrapper
│   ├── log.rs               # Session log file I/O
│   └── schema.rs            # Database schema definitions
└── events.rs            # Event payload definitions
```

### Frontend-Backend Communication

#### Tauri Commands (Frontend → Backend)

##### Terminal Commands
- `write_to_terminal(session_id, data)` - Send input to terminal
- `resize_terminal(session_id, rows, cols)` - Resize terminal
- `kill_terminal(session_id)` - Terminate terminal session

##### Session Commands
- `create_session(project_id, name, command, args, cwd, rows, cols)` - Create new session
- `list_sessions(project_id?)` - List all sessions (optionally filtered by project)
- `get_session(session_id)` - Get session info
- `rename_session(session_id, name)` - Rename session
- `archive_session(session_id)` - Archive session
- `destroy_session(session_id)` - Delete session
- `replay_session(session_id)` - Get session output history
- `search_sessions(query, project_id?)` - Full-text search sessions
- `get_settings()` - Get app settings
- `update_settings(settings)` - Update app settings

##### Project Commands
- `create_project(name, path)` - Create new project
- `list_projects()` - List all projects
- `delete_project(id)` - Delete project
- `rename_project(id, name)` - Rename project

#### Events (Backend → Frontend)
- `terminal-output` - Terminal output data with `sessionId`, `chunk`, `seq`
- `terminal-exited` - Terminal exited with `sessionId`, `exitCode`
- `session-state-changed` - Session state changed with `sessionId`, `state`

### State Management

#### Zustand Stores

##### `useSessionStore` (`src/state/sessionStore.ts`)
Tracks:
- `sessions: SessionInfo[]` - All loaded sessions
- `activeSessionId: string | null` - Currently active session
- `openTabIds: string[]` - Sessions open in tabs
- `isLoading: boolean` - Loading state

Actions:
- `loadSessions()` - Load sessions from backend
- `createSession(...)` - Create new session
- `renameSession(...)` - Rename session
- `archiveSession(...)` - Archive session
- `destroySession(...)` - Delete session
- `openTab(sessionId)` - Open session in tab
- `closeTab(sessionId)` - Close session tab
- `setActiveSession(sessionId)` - Set active session
- `updateSessionState(...)` - Update session status

##### `useProjectStore` (`src/state/projectStore.ts`)
Tracks:
- `projects: ProjectInfo[]` - All loaded projects
- `activeProjectId: string | null` - Currently selected project
- `isLoading: boolean` - Loading state

Actions:
- `loadProjects()` - Load projects from backend
- `createProject(name, path)` - Create new project
- `deleteProject(id)` - Delete project
- `renameProject(id, name)` - Rename project
- `setActiveProject(id)` - Set active project

##### `useSettingsStore` (`src/state/settingsStore.ts`)
Tracks:
- `settings: AppSettings` - App settings
- `isLoading: boolean` - Loading state

Settings:
- `claude_cli_path: string` - Path to Claude CLI
- `default_shell: string` - Default shell
- `terminal_font_family: string` - Terminal font
- `terminal_font_size: number` - Terminal font size
- `terminal_scrollback: number` - Scrollback lines
- `data_retention_days: number` - Data retention period
- `theme: 'light' | 'dark' | 'system'` - UI theme

### UI Design System

#### Design Principles
- **Clean & Modern**: Based on shadcn/ui aesthetic
- **Dark First**: Dark mode as default, with light mode support
- **Accessible**: Built on Radix UI primitives for accessibility
- **Responsive**: Adapts to different window sizes

#### Color System
- Three theme modes: `light`, `dark`, `system`
- Managed via `ThemeProvider` and CSS variables
- Tailwind CSS for utility classes

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar  │  TabBar                          │              │
│  (240px)  ├──────────────────────────────────┤  RightPanel │
│           │                                  │  (280px)     │
│           │      MainPanel (Terminal)       │              │
│           │                                  │              │
│           │                                  │              │
└─────────────────────────────────────────────────────────────┘
```

#### Component Library
Custom UI components in `src/components/ui/`:
- `Button` - Variants: default, destructive, outline, secondary, ghost, link
- `Dialog` - Modal dialog with Radix UI
- `Input` - Text input field
- `Label` - Form label
- `Select` - Dropdown select

#### Keyboard Shortcuts
- `Cmd+T` - Create new session
- `Cmd+W` - Close current tab
- `Cmd+Shift+]` - Next tab
- `Cmd+Shift+[` - Previous tab
- `Cmd+,` - Open settings
- `Cmd+F` (in terminal) - Search terminal

### Data Model

#### Session States
Session lifecycle states (`src-tauri/src/session/mod.rs`):
- `Starting` - Session is initializing and starting up
- `Running` - Session is actively running
- `Exited` - Session has terminated (includes exit code)
- `Archived` - Session has been archived and is no longer active

Frontend helpers:
- `isRunning` = `Running` or `Starting`
- `isExited` = `Exited` or `Archived`

#### SQLite Database Tables
- `projects` - Project metadata
- `sessions` - Session metadata
- `output_chunks` - Output chunk indices for log files
- `output_search` - FTS5 full-text search index
- `settings` - Key-value settings store

#### Session Log Files
- Stored in `{data_dir}/sessions/{session_id}.log`
- Raw PTY output (including ANSI escape codes)
- Append-only for forensic accuracy

## Important Patterns

### Terminal Input Handling
The terminal uses `useRef` to avoid closure issues with the `isConnected` and `sessionId` state. Always access these values through refs in the `onData` callback.

### PTY Management
The Rust backend maintains a `SessionManager` that stores active sessions in a `HashMap<String, ActiveSession>`. Each session has:
- A writer for terminal input
- A master PTY handle for resizing
- A child killer for process termination
- An `Arc<Mutex<SessionState>>` for thread-safe state tracking

### UTF-8 Handling
The PTY reader thread handles multi-byte UTF-8 characters by buffering incomplete sequences and only emitting valid UTF-8 strings to the frontend.

### Startup Reconciliation
On app launch, the SessionManager finds sessions that were `Running` or `Starting` when the app last exited and attempts to re-spawn them.

### Storage Architecture
- **SQLite**: Metadata, indexes, FTS search
- **Filesystem**: Raw terminal output logs (append-only)
- Separation ensures large logs don't bloat the database

## Feature Implementation Status

### Phase 0 - Technical Feasibility ✅
- [x] Tauri 2 + React app initialized
- [x] xterm.js integrated with addons
- [x] portable-pty backend implemented
- [x] Shell/Claude CLI spawn working
- [x] stdin/stdout/resize/interrupt functional
- [x] Process exit handling

### Phase 1 - Single-User Alpha ✅
- [x] Single-project workflow
- [x] Multi-session tabs
- [x] Persistent session logs
- [x] Basic search
- [x] Core settings

### Phase 2 - Strong Workflow Value 🔄
- [x] Multi-project management (foundation complete)
- [ ] Enhanced output rendering
- [ ] Changed-file detection (MVP missing)
- [ ] Prompt history/templates
- [ ] Bookmarks

### Phase 3 - Differentiated Product ⏳
- [ ] Auto title/summary
- [ ] Semantic search
- [ ] Workflow extensions
- [ ] Advanced indexing
