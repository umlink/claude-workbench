project:
  name: "Claude CLI Workbench"
  codename: "claude-workbench"
  category: "desktop developer tool"
  positioning: "A desktop session manager and enhanced terminal workbench for local Claude CLI"
  product_goal: "Replace poor command-line session management with a visual, persistent, searchable, multi-session desktop workflow"
  non_goals:
    - "Do not reimplement Claude agent runtime"
    - "Do not replace Claude CLI reasoning or tool system"
    - "Do not become a full IDE in v1"
    - "Do not rely on fragile stdout semantic parsing as a hard dependency"

users:
  primary:
    - "individual developers using Claude CLI daily"
    - "AI-heavy coders managing multiple repos/tasks"
    - "terminal-first engineers needing better session/history/project organization"
  secondary:
    - "small dev teams sharing repeatable workflows"
    - "power users wanting searchable CLI work history"

success_metrics:
  product:
    - key: "weekly_active_users"
      target_phase_2: ">= 20 internal/pilot users"
    - key: "session_resume_success_rate"
      target_phase_1: ">= 95%"
    - key: "terminal_crash_free_rate"
      target_phase_1: ">= 99%"
    - key: "search_to_reopen_task_success"
      target_phase_2: ">= 80%"
    - key: "median_time_to_switch_session"
      target_phase_1: "<= 3 seconds"
  engineering:
    - key: "pty_input_latency_p95"
      target: "<= 50ms"
    - key: "output_render_latency_p95"
      target: "<= 100ms"
    - key: "startup_time_cold"
      target_phase_1: "<= 3s"
    - key: "memory_per_active_terminal"
      target_phase_1: "<= 250MB"

technical_decisions:
  desktop_shell:
    choice: "Tauri 2"
    reasons:
      - "Any web frontend can be used"
      - "Uses system webview; smaller distribution than bundling a browser engine"
      - "Good security model via capabilities and scoped access"
    citations:
      - "turn393836search3"
      - "turn393836search11"
      - "turn393836search14"
  terminal_frontend:
    choice: "xterm.js"
    reasons:
      - "Mature browser terminal frontend"
      - "Works with bash/vim/tmux and mouse events"
      - "Unicode/CJK/emoji/IME support"
      - "Commonly used in VS Code-like tools"
    citations:
      - "turn393836search0"
      - "turn393836search4"
  pty_backend:
    choice: "portable-pty"
    reasons:
      - "Cross-platform PTY abstraction"
      - "Suitable for spawning interactive processes inside a real PTY"
    citations:
      - "turn393836search1"
  process_strategy:
    choice: "spawn local Claude CLI inside PTY"
    reasons:
      - "Preserve native Claude CLI behavior"
      - "Enable high-fidelity terminal interaction"
      - "Avoid reimplementing agent layer"
  shell_plugin_usage:
    choice: "limited use only"
    reasons:
      - "Tauri shell plugin is suitable for controlled child-process access"
      - "Not the primary terminal emulation core"
    citations:
      - "turn393836search2"
      - "turn393836search10"

product_scope:
  core_value_props:
    - "Multi-session Claude CLI management"
    - "Project-scoped workspace organization"
    - "Persistent terminal history and search"
    - "Better visual review of long-running CLI sessions"
    - "Recoverable developer work context"
  key_user_problems:
    - id: "P1"
      text: "Cannot easily manage multiple Claude CLI sessions across projects"
    - id: "P2"
      text: "Hard to search/review old conversations and outputs"
    - id: "P3"
      text: "Long outputs are difficult to scan in raw terminal"
    - id: "P4"
      text: "Unclear what files changed during a session"
    - id: "P5"
      text: "Restarting or resuming work context is cumbersome"

feature_model:
  modules:
    - id: "workspace"
      name: "Workspace and Project Management"
      priority: "P0"
      features:
        - "Open local project directory"
        - "Project list and recent projects"
        - "Project-scoped session grouping"
        - "Project metadata display: path, active branch, last used"
    - id: "session"
      name: "Session Lifecycle Management"
      priority: "P0"
      features:
        - "Create Claude CLI session"
        - "Multiple tabs/sessions"
        - "Rename/archive/delete session"
        - "Session status: running, idle, exited, failed"
        - "Session restore from stored logs and metadata"
    - id: "terminal"
      name: "High-Fidelity Terminal"
      priority: "P0"
      features:
        - "xterm.js rendering"
        - "PTY-based interactive IO"
        - "Ctrl+C / Ctrl+D / resize support"
        - "Copy/paste"
        - "Search in terminal buffer"
        - "Scrollback persistence"
    - id: "history"
      name: "History and Search"
      priority: "P1"
      features:
        - "Full-text search across sessions"
        - "Search by project, date, title, keyword"
        - "Quick reopen of matching session"
        - "Bookmarked segments"
    - id: "render"
      name: "Enhanced Output Rendering"
      priority: "P1"
      features:
        - "Code block highlighting"
        - "Error block highlighting"
        - "Long output folding"
        - "Timestamp markers"
        - "Clickable file paths and URLs"
      constraints:
        - "Rendering enhancement must not depend on brittle semantic parsing"
    - id: "changes"
      name: "File Change Tracking"
      priority: "P1"
      features:
        - "Snapshot project state at session start"
        - "Detect modified files at session end or periodically"
        - "List changed files"
        - "Open changed file"
        - "Optional diff preview"
    - id: "input"
      name: "Prompt/Input Enhancement"
      priority: "P1"
      features:
        - "Multi-line input box"
        - "Input history"
        - "Saved prompt templates"
        - "Insert project path / selected file / current branch"
    - id: "insights"
      name: "Session Summaries and Smart Indexing"
      priority: "P2"
      features:
        - "Auto title"
        - "Auto summary"
        - "Task labels"
        - "Semantic search"
    - id: "extensions"
      name: "Workflow Extensions"
      priority: "P3"
      features:
        - "Custom command palette"
        - "Project-level presets"
        - "Plugin hooks"

information_architecture:
  screens:
    - id: "home"
      purpose: "Recent projects and recent sessions"
    - id: "workspace"
      purpose: "Main working area"
      regions:
        - "left_sidebar: projects + sessions"
        - "top_tabs: active sessions"
        - "center_panel: terminal"
        - "right_panel: session info / changes / search results"
        - "bottom_panel_optional: input composer"
    - id: "search"
      purpose: "Global search results"
    - id: "settings"
      purpose: "Claude CLI path, terminal options, data retention, shortcuts"
  navigation:
    primary:
      - "Home"
      - "Workspace"
      - "Search"
      - "Settings"

user_flows:
  - id: "UF1"
    name: "Start new project session"
    steps:
      - "User opens app"
      - "User selects local project directory"
      - "System detects project metadata"
      - "User clicks new Claude session"
      - "System creates PTY"
      - "System spawns Claude CLI in PTY"
      - "Terminal attaches and becomes interactive"
      - "Session metadata stored"
  - id: "UF2"
    name: "Switch between active sessions"
    steps:
      - "User selects another session tab"
      - "Frontend detaches current terminal view"
      - "Frontend binds to target session stream"
      - "Stored scrollback and live stream render"
  - id: "UF3"
    name: "Resume old work"
    steps:
      - "User searches prior task keyword"
      - "System returns matching sessions"
      - "User opens session detail"
      - "System restores logs, metadata, changed files summary"
      - "User may start a fresh linked session in same project"
  - id: "UF4"
    name: "Inspect file changes"
    steps:
      - "Session exits or user opens changes view"
      - "System compares file snapshot"
      - "Changed files displayed"
      - "User opens file or diff"

system_architecture:
  overview:
    frontend: "React + xterm.js"
    desktop_runtime: "Tauri 2"
    backend: "Rust core services"
    storage: "SQLite + append-only log files"
    local_integrations:
      - "Claude CLI"
      - "Git (read-only in v1)"
      - "Filesystem watcher"
  components:
    - id: "ui-app"
      responsibilities:
        - "Window layout"
        - "Terminal view"
        - "Session list"
        - "Search and settings UI"
    - id: "terminal-adapter"
      responsibilities:
        - "xterm.js initialization"
        - "Input capture"
        - "Resize events"
        - "Buffer search"
    - id: "event-bridge"
      responsibilities:
        - "Frontend-backend event protocol"
        - "Session attachment"
        - "Output stream delivery"
    - id: "pty-manager"
      responsibilities:
        - "Create PTY"
        - "Spawn Claude CLI"
        - "Read/write PTY"
        - "Resize PTY"
        - "Kill/interrupt child"
    - id: "session-manager"
      responsibilities:
        - "Create/update/archive session metadata"
        - "Track session-to-project mapping"
        - "Track runtime status"
    - id: "storage-manager"
      responsibilities:
        - "Persist sessions"
        - "Persist messages/output chunks"
        - "Persist project metadata"
        - "Persist bookmarks and summaries"
    - id: "change-tracker"
      responsibilities:
        - "Snapshot project files"
        - "Detect file modifications"
        - "Compute summaries and optional diffs"
    - id: "search-index"
      responsibilities:
        - "FTS index over session content"
        - "Filter by project/date/title/tag"
    - id: "settings-manager"
      responsibilities:
        - "CLI path"
        - "Data retention"
        - "Terminal font/theme"
        - "Experimental flags"

data_model:
  entities:
    - name: "Project"
      fields:
        - "id"
        - "name"
        - "path"
        - "git_branch"
        - "last_opened_at"
        - "created_at"
    - name: "Session"
      fields:
        - "id"
        - "project_id"
        - "title"
        - "status"
        - "claude_command"
        - "started_at"
        - "updated_at"
        - "ended_at"
        - "exit_code"
        - "log_path"
        - "summary"
        - "tags"
    - name: "OutputChunk"
      fields:
        - "id"
        - "session_id"
        - "stream_type"
        - "sequence_no"
        - "timestamp"
        - "raw_text"
        - "render_hints"
    - name: "Bookmark"
      fields:
        - "id"
        - "session_id"
        - "chunk_id"
        - "label"
        - "created_at"
    - name: "FileSnapshot"
      fields:
        - "id"
        - "session_id"
        - "snapshot_type"
        - "file_path"
        - "hash"
        - "size"
        - "mtime"
    - name: "ChangedFile"
      fields:
        - "id"
        - "session_id"
        - "file_path"
        - "change_type"
        - "summary"
        - "diff_path"
    - name: "PromptTemplate"
      fields:
        - "id"
        - "project_id_optional"
        - "title"
        - "content"
    - name: "Setting"
      fields:
        - "key"
        - "value"

event_protocol:
  frontend_to_backend:
    - "session.create"
    - "session.attach"
    - "session.rename"
    - "session.archive"
    - "terminal.input"
    - "terminal.resize"
    - "terminal.copy_request"
    - "search.query"
    - "project.open"
    - "changes.scan"
  backend_to_frontend:
    - "session.created"
    - "session.updated"
    - "terminal.output"
    - "terminal.exited"
    - "changes.updated"
    - "search.results"
    - "error.raised"
  example_payloads:
    session_create:
      type: "session.create"
      payload:
        project_id: "proj_123"
        command: "claude"
        args: ["code"]
        cwd: "/Users/me/work/repo"
    terminal_input:
      type: "terminal.input"
      payload:
        session_id: "sess_123"
        data: "hello\n"
    terminal_output:
      type: "terminal.output"
      payload:
        session_id: "sess_123"
        chunk: "ANSI_OR_UTF8_TEXT"
        seq: 1001

repo_structure:
  root:
    - "apps/desktop"
    - "crates/core"
    - "crates/pty"
    - "crates/storage"
    - "crates/session"
    - "crates/search"
    - "packages/ui"
    - "packages/terminal"
    - "docs"
  desktop_frontend:
    - "src/components"
    - "src/features/projects"
    - "src/features/sessions"
    - "src/features/terminal"
    - "src/features/search"
    - "src/features/settings"
    - "src/lib/tauri"
    - "src/state"
  tauri_backend:
    - "src-tauri/src/main.rs"
    - "src-tauri/src/commands.rs"
    - "src-tauri/src/events.rs"
    - "src-tauri/capabilities"
  docs:
    - "prd.md"
    - "architecture.md"
    - "event-protocol.md"
    - "storage-schema.md"
    - "roadmap.md"

mvp_definition:
  phase: "v0.1"
  must_have:
    - "Open local project"
    - "Create and run Claude CLI session in PTY"
    - "xterm.js interactive terminal"
    - "Multiple session tabs"
    - "Session metadata persistence"
    - "Basic searchable log history"
    - "Session status display"
  should_have:
    - "Recent projects"
    - "Simple changed-file detection"
    - "Basic terminal search"
  wont_have:
    - "Semantic CLI parsing"
    - "Full diff viewer"
    - "Plugin system"
    - "Embedded code editor"
    - "Cloud sync"

iteration_plan:
  - phase: "Phase 0"
    duration: "3-5 days"
    objective: "Technical feasibility"
    deliverables:
      - "Spawn Claude CLI in PTY"
      - "xterm.js renders correctly"
      - "Input/output/resize/interrupt works"
    exit_criteria:
      - "Claude CLI stable in PTY across target OS"
      - "No blocking rendering issues"
  - phase: "Phase 1"
    duration: "2-3 weeks"
    objective: "Usable single-user alpha"
    deliverables:
      - "Single-project workflow"
      - "Multi-session tabs"
      - "Persistent session logs"
      - "Basic search"
      - "Core settings"
    exit_criteria:
      - "User can replace terminal for daily Claude use"
  - phase: "Phase 2"
    duration: "3-6 weeks"
    objective: "Strong workflow value"
    deliverables:
      - "Multi-project management"
      - "Enhanced output rendering"
      - "Changed-file view"
      - "Prompt history/templates"
      - "Bookmarks"
    exit_criteria:
      - "Users can reliably recover and review prior work"
  - phase: "Phase 3"
    duration: "6-10 weeks"
    objective: "Differentiated product"
    deliverables:
      - "Auto title/summary"
      - "Semantic or hybrid search"
      - "Workflow extensions"
      - "Advanced indexing"
    exit_criteria:
      - "Clear advantage over raw terminal in long-term usage"

prototype_plan:
  sprint_0:
    duration: "2 days"
    tasks:
      - "Initialize Tauri 2 + React app"
      - "Add xterm.js and fit/search addons"
      - "Create terminal demo page"
  sprint_1:
    duration: "3 days"
    tasks:
      - "Add Rust PTY service using portable-pty"
      - "Spawn shell first, then Claude CLI"
      - "Wire stdin/stdout/resize"
      - "Handle process exit"
  sprint_2:
    duration: "4 days"
    tasks:
      - "Implement session manager"
      - "Add tabs"
      - "Persist metadata to SQLite"
      - "Write raw output logs to file"
  sprint_3:
    duration: "4 days"
    tasks:
      - "Add global/project search"
      - "Add recent projects"
      - "Add session reopen"
  sprint_4:
    duration: "5 days"
    tasks:
      - "Add changed-file detection"
      - "Add output highlighting/folding"
      - "Add bookmarks"
  sprint_5:
    duration: "5 days"
    tasks:
      - "Stability pass"
      - "Keyboard shortcuts"
      - "Packaging and updater preparation"

engineering_guidelines:
  terminal_handling:
    - "Treat terminal fidelity as the source of truth"
    - "Never depend on semantic stdout parsing for correctness"
    - "Use enhancement layers only after raw rendering works"
  performance:
    - "Batch output chunks before UI dispatch"
    - "Throttle expensive rendering operations"
    - "Keep scrollback bounded with persistence"
  storage:
    - "Use append-only raw logs for forensic accuracy"
    - "Use SQLite for metadata and indexes"
  error_handling:
    - "Surface PTY spawn failures clearly"
    - "Detect missing Claude CLI path"
    - "Expose crash and exit codes"
  portability:
    - "Test macOS first, then Linux, then Windows"
    - "Abstract PTY logic from UI early"

risks:
  - id: "R1"
    risk: "Claude CLI output formats may change"
    mitigation: "Do not make semantic parsing critical"
  - id: "R2"
    risk: "PTY differences across OS"
    mitigation: "Cross-platform adapter tests and per-OS fallbacks"
  - id: "R3"
    risk: "Large terminal logs hurt performance"
    mitigation: "Chunked logs, bounded in-memory buffer, lazy load"
  - id: "R4"
    risk: "App becomes a pseudo-IDE and scope bloats"
    mitigation: "Keep editor/diff as adjunct, not core, in v1"
  - id: "R5"
    risk: "CLI path/config mismatch on user machines"
    mitigation: "Setup wizard + environment diagnostics"

test_strategy:
  unit:
    - "session state transitions"
    - "storage CRUD"
    - "event payload validation"
  integration:
    - "spawn PTY and roundtrip input/output"
    - "session restore"
    - "search indexing"
  e2e:
    - "open project -> create session -> send input -> persist logs -> reopen"
    - "switch among multiple active sessions"
    - "handle Claude CLI exit/crash"
  manual_matrix:
    - "macOS latest"
    - "Windows 11"
    - "Ubuntu LTS"

release_plan:
  alpha:
    audience: "internal use only"
    requirements:
      - "Crash-free terminal baseline"
      - "Manual installation"
  beta:
    audience: "selected external power users"
    requirements:
      - "Onboarding flow"
      - "Diagnostics panel"
      - "Import/export session data"
  v1:
    audience: "public"
    requirements:
      - "Stable packaging"
      - "Recovery from failed sessions"
      - "Search and change tracking polished"

ai_execution_hints:
  architecture_priority_order:
    - "terminal fidelity"
    - "session persistence"
    - "searchability"
    - "workflow enhancements"
  implementation_order:
    - "xterm.js demo"
    - "portable-pty spawn shell"
    - "spawn Claude CLI"
    - "session model"
    - "log persistence"
    - "search"
    - "change tracking"
  avoid:
    - "building a fake terminal with pre/div"
    - "using non-PTY child_process as terminal core"
    - "overfitting regex to CLI output"
    - "building plugin system too early"