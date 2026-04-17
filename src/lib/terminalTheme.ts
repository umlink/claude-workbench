import type { Terminal } from "xterm";

/**
 * Terminal color palette matching the application's design system.
 * Uses modern terminal colors with good contrast and accessibility.
 */
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/**
 * Dark theme terminal colors - matches the application's dark mode.
 * Based on a modern variation of Dracula/One Dark palette.
 */
export const DARK_TERMINAL_THEME: TerminalTheme = {
  // Base colors
  background: "#09090b", // hsl(222.2 84% 4.9%) - matches --background in dark mode
  foreground: "#fafafa", // hsl(210 40% 98%) - matches --foreground in dark mode
  cursor: "#fafafa",
  cursorAccent: "#09090b",
  selectionBackground: "rgba(255, 255, 255, 0.15)",
  selectionForeground: "#fafafa",

  // ANSI colors
  black: "#27272a",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#a1a1aa",

  // Bright ANSI colors
  brightBlack: "#52525b",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#f4f4f5",
};

/**
 * Light theme terminal colors - matches the application's light mode.
 * Based on a modern light terminal palette with good contrast.
 */
export const LIGHT_TERMINAL_THEME: TerminalTheme = {
  // Base colors
  background: "#ffffff", // hsl(0 0% 100%) - matches --background in light mode
  foreground: "#09090b", // hsl(222.2 84% 4.9%) - matches --foreground in light mode
  cursor: "#09090b",
  cursorAccent: "#ffffff",
  selectionBackground: "rgba(0, 0, 0, 0.1)",
  selectionForeground: "#09090b",

  // ANSI colors
  black: "#18181b",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#ca8a04",
  blue: "#2563eb",
  magenta: "#9333ea",
  cyan: "#0891b2",
  white: "#71717a",

  // Bright ANSI colors
  brightBlack: "#52525b",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#eab308",
  brightBlue: "#3b82f6",
  brightMagenta: "#a855f7",
  brightCyan: "#06b6d4",
  brightWhite: "#a1a1aa",
};

/**
 * Get the terminal theme for a given theme mode.
 */
export function getTerminalTheme(mode: "light" | "dark"): TerminalTheme {
  return mode === "dark" ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME;
}

/**
 * Apply a theme to an xterm.js Terminal instance.
 */
export function applyTerminalTheme(terminal: Terminal, mode: "light" | "dark"): void {
  const theme = getTerminalTheme(mode);
  // Directly assign theme to options.theme
  (terminal.options as any).theme = {
    background: theme.background,
    foreground: theme.foreground,
    cursor: theme.cursor,
    cursorAccent: theme.cursorAccent,
    selectionBackground: theme.selectionBackground,
    selectionForeground: theme.selectionForeground,
    black: theme.black,
    red: theme.red,
    green: theme.green,
    yellow: theme.yellow,
    blue: theme.blue,
    magenta: theme.magenta,
    cyan: theme.cyan,
    white: theme.white,
    brightBlack: theme.brightBlack,
    brightRed: theme.brightRed,
    brightGreen: theme.brightGreen,
    brightYellow: theme.brightYellow,
    brightBlue: theme.brightBlue,
    brightMagenta: theme.brightMagenta,
    brightCyan: theme.brightCyan,
    brightWhite: theme.brightWhite,
  };
}

/**
 * Get the CSS background color for the terminal container.
 * This ensures the container matches the terminal theme even before the terminal is initialized.
 */
export function getTerminalBackground(mode: "light" | "dark"): string {
  return getTerminalTheme(mode).background;
}
