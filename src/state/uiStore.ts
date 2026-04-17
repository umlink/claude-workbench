import { create } from "zustand";

interface UIStore {
  expandedProjectIds: Set<string>;
  showRightPanel: boolean;
  toggleProjectExpanded: (projectId: string) => void;
  expandProject: (projectId: string) => void;
  setExpandedProjects: (ids: Set<string>) => void;
  toggleRightPanel: () => void;
  setShowRightPanel: (show: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  expandedProjectIds: new Set(),
  showRightPanel: true,

  toggleProjectExpanded: (projectId: string) => {
    set((state) => {
      const next = new Set(state.expandedProjectIds);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return { expandedProjectIds: next };
    });
  },

  expandProject: (projectId: string) => {
    set((state) => {
      if (state.expandedProjectIds.has(projectId)) {
        return state;
      }
      const next = new Set(state.expandedProjectIds);
      next.add(projectId);
      return { expandedProjectIds: next };
    });
  },

  setExpandedProjects: (ids: Set<string>) => {
    set({ expandedProjectIds: ids });
  },

  toggleRightPanel: () => {
    set((state) => ({ showRightPanel: !state.showRightPanel }));
  },

  setShowRightPanel: (show: boolean) => {
    set({ showRightPanel: show });
  },
}));
