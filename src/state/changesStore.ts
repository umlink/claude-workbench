import { create } from "zustand";
import {
  takeStartSnapshot,
  detectChanges,
  getChangedFiles,
  type ChangedFile,
} from "../lib/tauri";

interface ChangesStore {
  changedFiles: Map<string, ChangedFile[]>;
  isLoading: Map<string, boolean>;
  error: Map<string, string | null>;

  // Actions
  takeSnapshot: (sessionId: string, projectPath: string) => Promise<void>;
  detectChanges: (sessionId: string, projectPath: string) => Promise<ChangedFile[]>;
  loadChangedFiles: (sessionId: string) => Promise<void>;
  clearError: (sessionId: string) => void;
}

export const useChangesStore = create<ChangesStore>((set) => ({
  changedFiles: new Map(),
  isLoading: new Map(),
  error: new Map(),

  takeSnapshot: async (sessionId: string, projectPath: string) => {
    set((state) => ({
      isLoading: new Map(state.isLoading).set(sessionId, true),
      error: new Map(state.error).set(sessionId, null),
    }));

    try {
      await takeStartSnapshot(sessionId, projectPath);
    } catch (e) {
      console.error("Failed to take snapshot:", e);
      set((state) => ({
        error: new Map(state.error).set(sessionId, e instanceof Error ? e.message : "Failed to take snapshot"),
      }));
    } finally {
      set((state) => ({
        isLoading: new Map(state.isLoading).set(sessionId, false),
      }));
    }
  },

  detectChanges: async (sessionId: string, projectPath: string) => {
    set((state) => ({
      isLoading: new Map(state.isLoading).set(sessionId, true),
      error: new Map(state.error).set(sessionId, null),
    }));

    try {
      const files = await detectChanges(sessionId, projectPath);
      set((state) => ({
        changedFiles: new Map(state.changedFiles).set(sessionId, files),
      }));
      return files;
    } catch (e) {
      console.error("Failed to detect changes:", e);
      set((state) => ({
        error: new Map(state.error).set(sessionId, e instanceof Error ? e.message : "Failed to detect changes"),
      }));
      return [];
    } finally {
      set((state) => ({
        isLoading: new Map(state.isLoading).set(sessionId, false),
      }));
    }
  },

  loadChangedFiles: async (sessionId: string) => {
    set((state) => ({
      isLoading: new Map(state.isLoading).set(sessionId, true),
      error: new Map(state.error).set(sessionId, null),
    }));

    try {
      const files = await getChangedFiles(sessionId);
      set((state) => ({
        changedFiles: new Map(state.changedFiles).set(sessionId, files),
      }));
    } catch (e) {
      console.error("Failed to load changed files:", e);
      set((state) => ({
        error: new Map(state.error).set(sessionId, e instanceof Error ? e.message : "Failed to load changed files"),
      }));
    } finally {
      set((state) => ({
        isLoading: new Map(state.isLoading).set(sessionId, false),
      }));
    }
  },

  clearError: (sessionId: string) => {
    set((state) => ({
      error: new Map(state.error).set(sessionId, null),
    }));
  },
}));
