import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// --- Types ---

export interface TerminalSize {
  rows: number;
  cols: number;
}

export interface TerminalOutputEvent {
  sessionId: string;
  chunk: string;
  seq: number;
}

export interface TerminalExitedEvent {
  sessionId: string;
  exitCode: number;
}

export interface SessionStateChangedEvent {
  sessionId: string;
  state: string;
}

export interface SessionInfo {
  id: string;
  project_id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  state: string;
  exit_code: number | null;
  created_at: number;
  exited_at: number | null;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  created_at: number;
  updated_at: number;
  session_count: number | null;
}

export interface SearchResult {
  session_id: string;
  session_name: string;
  snippet: string;
  rank: number;
}

export interface AppSettings {
  terminal_font_family: string;
  terminal_font_size: number;
  terminal_scrollback: number;
  data_retention_days: number;
  theme: 'light' | 'dark' | 'system';
}

// --- Terminal commands ---

export async function createSession(
  projectId: string,
  name: string,
  command: string,
  args: string[],
  cwd: string,
  rows: number,
  cols: number
): Promise<SessionInfo> {
  return await invoke<SessionInfo>("create_session", {
    project_id: projectId,
    name,
    command,
    args,
    cwd,
    rows,
    cols,
  });
}

export async function writeToTerminal(sessionId: string, data: string): Promise<void> {
  await invoke("write_to_terminal", { session_id: sessionId, data });
}

export async function resizeTerminal(sessionId: string, size: TerminalSize): Promise<void> {
  await invoke("resize_terminal", { session_id: sessionId, rows: size.rows, cols: size.cols });
}

export async function killTerminal(sessionId: string): Promise<void> {
  await invoke("kill_terminal", { session_id: sessionId });
}

// --- Session commands ---

export async function listSessions(projectId?: string): Promise<SessionInfo[]> {
  return await invoke<SessionInfo[]>("list_sessions", { project_id: projectId ?? null });
}

export async function getSession(sessionId: string): Promise<SessionInfo | null> {
  return await invoke<SessionInfo | null>("get_session", { session_id: sessionId });
}

export async function renameSession(sessionId: string, name: string): Promise<void> {
  await invoke("rename_session", { session_id: sessionId, name });
}

export async function archiveSession(sessionId: string): Promise<void> {
  await invoke("archive_session", { session_id: sessionId });
}

export async function destroySession(sessionId: string): Promise<void> {
  await invoke("destroy_session", { session_id: sessionId });
}

export async function replaySession(sessionId: string): Promise<string[]> {
  return await invoke<string[]>("replay_session", { session_id: sessionId });
}

export async function searchSessions(query: string, projectId?: string): Promise<SearchResult[]> {
  return await invoke<SearchResult[]>("search_sessions", { query, project_id: projectId ?? null });
}

// --- Project commands ---

export async function createProject(name: string, path: string): Promise<ProjectInfo> {
  return await invoke<ProjectInfo>("create_project", { name, path });
}

export async function listProjects(): Promise<ProjectInfo[]> {
  return await invoke<ProjectInfo[]>("list_projects");
}

export async function deleteProject(projectId: string): Promise<void> {
  await invoke("delete_project", { project_id: projectId });
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  await invoke("rename_project", { project_id: projectId, name });
}

export async function pickFolder(): Promise<string | null> {
  return await invoke<string | null>("pick_folder");
}

export async function getHomeDir(): Promise<string> {
  return await invoke<string>("get_home_dir");
}

// --- Settings commands ---

export async function getSettings(): Promise<AppSettings> {
  return await invoke<AppSettings>("get_settings");
}

export async function updateSettings(settings: AppSettings): Promise<void> {
  await invoke("update_settings", { settings });
}

// --- Event listeners ---

export async function listenToTerminalOutput(callback: (event: TerminalOutputEvent) => void) {
  return await listen<TerminalOutputEvent>("terminal-output", (event) => {
    callback(event.payload);
  });
}

export async function listenToTerminalExited(callback: (event: TerminalExitedEvent) => void) {
  return await listen<TerminalExitedEvent>("terminal-exited", (event) => {
    callback(event.payload);
  });
}

export async function listenToSessionStateChanged(callback: (event: SessionStateChangedEvent) => void) {
  return await listen<SessionStateChangedEvent>("session-state-changed", (event) => {
    callback(event.payload);
  });
}
