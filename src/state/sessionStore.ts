import { create } from "zustand";
import {
  listSessions,
  createSession as apiCreateSession,
  renameSession as apiRenameSession,
  archiveSession as apiArchiveSession,
  destroySession as apiDestroySession,
  type SessionInfo,
} from "../lib/tauri";
import { useProjectStore } from "./projectStore";

interface SessionStore {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  openTabIds: string[];
  isLoading: boolean;
  // Session output tracking for enhanced view
  sessionOutputs: Map<string, string[]>;
  loadSessions: (projectId?: string) => Promise<void>;
  createSession: (projectId: string, name: string, command: string, args: string[], cwd: string, rows: number, cols: number) => Promise<SessionInfo>;
  renameSession: (id: string, name: string) => Promise<void>;
  archiveSession: (id: string) => Promise<void>;
  destroySession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  updateSessionState: (id: string, state: string, exitCode?: number) => void;
  appendSessionOutput: (sessionId: string, chunk: string) => void;
  setSessionOutput: (sessionId: string, chunks: string[]) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  openTabIds: [],
  isLoading: false,
  sessionOutputs: new Map(),

  loadSessions: async (projectId?: string) => {
    set({ isLoading: true });
    try {
      const sessions = await listSessions(projectId);
      set({ sessions, isLoading: false });
    } catch (e) {
      console.error("Failed to load sessions:", e);
      set({ isLoading: false });
    }
  },

  createSession: async (projectId, name, command, args, cwd, rows, cols) => {
    const session = await apiCreateSession(projectId, name, command, args, cwd, rows, cols);
    set((state) => ({
      sessions: [session, ...state.sessions],
      openTabIds: [...state.openTabIds, session.id],
      activeSessionId: session.id,
    }));
    return session;
  },

  renameSession: async (id, name) => {
    await apiRenameSession(id, name);
    set((state) => ({
      sessions: state.sessions.map((s) => s.id === id ? { ...s, name } : s),
    }));
  },

  archiveSession: async (id) => {
    await apiArchiveSession(id);
    set((state) => ({
      sessions: state.sessions.map((s) => s.id === id ? { ...s, state: "Archived" } : s),
    }));
  },

  destroySession: async (id) => {
    await apiDestroySession(id);
    const state = get();
    const remainingTabs = state.openTabIds.filter((tid) => tid !== id);
    set({
      sessions: state.sessions.filter((s) => s.id !== id),
      openTabIds: remainingTabs,
      activeSessionId: state.activeSessionId === id
        ? remainingTabs[remainingTabs.length - 1] ?? null
        : state.activeSessionId,
    });
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
    // Auto-select the project that contains this session
    if (id) {
      const state = get();
      const session = state.sessions.find((s) => s.id === id);
      if (session) {
        useProjectStore.getState().setActiveProject(session.project_id);
      }
    }
  },

  openTab: (id) => {
    set((state) => {
      // Auto-select the project that contains this session
      const session = state.sessions.find((s) => s.id === id);
      if (session) {
        useProjectStore.getState().setActiveProject(session.project_id);
        // Also ensure the project is expanded in the UI
        const { expandedIds } = window as any;
        if (expandedIds && !expandedIds.has(session.project_id)) {
          expandedIds.add(session.project_id);
        }
      }

      if (state.openTabIds.includes(id)) {
        return { activeSessionId: id };
      }
      return { openTabIds: [...state.openTabIds, id], activeSessionId: id };
    });
  },

  closeTab: (id) => {
    const state = get();
    const remainingTabs = state.openTabIds.filter((tid) => tid !== id);
    const newActiveId = state.activeSessionId === id
      ? remainingTabs[remainingTabs.length - 1] ?? null
      : state.activeSessionId;
    set({ openTabIds: remainingTabs, activeSessionId: newActiveId });
  },

  updateSessionState: (id, state, exitCode) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === id ? { ...sess, state, exit_code: exitCode ?? sess.exit_code } : sess
      ),
    }));
  },

  appendSessionOutput: (sessionId, chunk) => {
    set((s) => {
      const newOutputs = new Map(s.sessionOutputs);
      const existing = newOutputs.get(sessionId) || [];
      newOutputs.set(sessionId, [...existing, chunk]);
      return { sessionOutputs: newOutputs };
    });
  },

  setSessionOutput: (sessionId, chunks) => {
    set((s) => {
      const newOutputs = new Map(s.sessionOutputs);
      newOutputs.set(sessionId, chunks);
      return { sessionOutputs: newOutputs };
    });
  },
}));
