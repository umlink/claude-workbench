import { create } from "zustand";
import {
  getSettings as apiGetSettings,
  updateSettings as apiUpdateSettings,
  type AppSettings,
} from "../lib/tauri";

const defaultSettings: AppSettings = {
  terminal_font_family: "JetBrains Mono, Menlo",
  terminal_font_size: 14,
  terminal_scrollback: 10000,
  data_retention_days: 90,
  theme: "system",
};

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await apiGetSettings();
      set({ settings, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSettings: async (settings: AppSettings) => {
    await apiUpdateSettings(settings);
    set({ settings });
  },
}));
