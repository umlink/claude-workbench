
# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Codex Workbench** - A desktop session manager and enhanced terminal workbench for local Codex CLI, built with Tauri 2, React, TypeScript, and Rust.

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
- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Tauri 2
- **Backend**: Rust
- **Terminal**: xterm.js
- **PTY**: portable-pty
- **State Management**: Zustand

### Key Directories
- `src/` - React frontend
  - `components/` - React components (Terminal.tsx)
  - `lib/` - Tauri API wrappers (tauri.ts)
  - `state/` - Zustand stores
- `src-tauri/` - Rust backend
  - `src/` - Rust source code
    - `lib.rs` - Tauri app setup
    - `commands.rs` - Tauri command handlers
    - `pty.rs` - PTY management

### Frontend-Backend Communication

#### Tauri Commands (Frontend → Backend)
- `spawn_terminal(session_id, command, args, cwd)` - Spawn a new terminal session
- `write_to_terminal(session_id, data)` - Send input to terminal
- `resize_terminal(session_id, rows, cols)` - Resize terminal

#### Events (Backend → Frontend)
- `terminal-output` - Terminal output data with `sessionId`, `chunk`, `seq`
- `terminal-exited` - Terminal exited with `sessionId`, `exitCode`

### State Management
- `useTerminalStore` - Tracks active session ID and connection status

## Important Patterns

### Terminal Input Handling
The terminal uses `useRef` to avoid closure issues with the `isConnected` and `sessionId` state. Always access these values through refs in the `onData` callback.

### PTY Management
The Rust backend maintains a `PtyManager` that stores active sessions in a `HashMap<String, Session>`. Each session has a writer for input and a child process.
