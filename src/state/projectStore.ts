import { create } from "zustand";
import {
  listProjects,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  renameProject as apiRenameProject,
  type ProjectInfo,
} from "../lib/tauri";

interface ProjectStore {
  projects: ProjectInfo[];
  activeProjectId: string | null;
  isLoading: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, path: string) => Promise<ProjectInfo>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await listProjects();
      set({ projects, isLoading: false });

      // Auto-activate first project if none selected
      if (!get().activeProjectId && projects.length > 0) {
        set({ activeProjectId: projects[0].id });
      }
    } catch (e) {
      console.error("Failed to load projects:", e);
      set({ isLoading: false });
    }
  },

  createProject: async (name: string, path: string) => {
    const project = await apiCreateProject(name, path);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  deleteProject: async (id: string) => {
    await apiDeleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    }));
  },

  renameProject: async (id: string, name: string) => {
    await apiRenameProject(id, name);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name } : p
      ),
    }));
  },

  setActiveProject: (id: string | null) => {
    set({ activeProjectId: id });
  },
}));
