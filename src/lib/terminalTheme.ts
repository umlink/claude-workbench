import type { Terminal } from "xterm";

/**
 * Terminal color palette matching the application's design system.
 * Professional color schemes optimized for readability and contrast.
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
 * Dark theme terminal colors - Professional dark terminal palette.
 * Based on a carefully crafted balance of contrast and eye comfort.
 * Background: Deep charcoal gray for reduced eye strain
 * Foreground: Soft off-white with excellent contrast
 * ANSI colors: Muted but distinct with good readability
 */
export const DARK_TERMINAL_THEME: TerminalTheme = {
  // Base colors - Professional dark theme
  background: "#0d1117",
  foreground: "#e6edf3",
  cursor: "#58a6ff",
  cursorAccent: "#0d1117",
  selectionBackground: "rgba(56, 139, 253, 0.4)",
  selectionForeground: "#e6edf3",

  // Normal ANSI colors - Muted but distinct
  black: "#21262d",
  red: "#f85149",
  green: "#3fb950",
  yellow: "#d29922",
  blue: "#58a6ff",
  magenta: "#bc8cff",
  cyan: "#39c5cf",
  white: "#b1bac4",

  // Bright ANSI colors - More vibrant
  brightBlack: "#6e7681",
  brightRed: "#ffa198",
  brightGreen: "#56d364",
  brightYellow: "#e3b341",
  brightBlue: "#79c0ff",
  brightMagenta: "#d2a8ff",
  brightCyan: "#56d4dd",
  brightWhite: "#e6edf3",
};

/**
 * Light theme terminal colors - Professional light terminal palette.
 * Optimized for bright environments with excellent contrast.
 * Background: Soft white with warm undertones
 * Foreground: Dark gray for comfortable reading
 * ANSI colors: Rich and vibrant with good differentiation
 */
export const LIGHT_TERMINAL_THEME: TerminalTheme = {
  // Base colors - Professional light theme
  background: "#ffffff",
  foreground: "#24292f",
  cursor: "#0969da",
  cursorAccent: "#ffffff",
  selectionBackground: "rgba(84, 174, 255, 0.4)",
  selectionForeground: "#24292f",

  // Normal ANSI colors - Rich and vibrant
  black: "#24292f",
  red: "#cf222e",
  green: "#1a7f37",
  yellow: "#9a6700",
  blue: "#0550ae",
  magenta: "#8250df",
  cyan: "#0891b2",
  white: "#6e7781",

  // Bright ANSI colors - Deeper saturation
  brightBlack: "#57606a",
  brightRed: "#fa4549",
  brightGreen: "#2da44e",
  brightYellow: "#bf8700",
  brightBlue: "#0969da",
  brightMagenta: "#a475f9",
  brightCyan: "#22c55e",
  brightWhite: "#24292f",
};

/**
 * Get the terminal theme for a given theme mode.
 */
export function getTerminalTheme(mode: "light" | "dark"): TerminalTheme {
  return mode === "dark" ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME;
}

/**
 * Apply a theme to an xterm.js Terminal instance.
 * Uses xterm.js's official theme API for comprehensive color management.
 */
export function applyTerminalTheme(terminal: Terminal, mode: "light" | "dark"): void {
  const theme = getTerminalTheme(mode);

  // Apply theme using xterm.js's options.theme API
  // This ensures all xterm.js color capabilities are utilized
  (terminal.options as any).theme = {
    // Base colors
    background: theme.background,
    foreground: theme.foreground,

    // Cursor colors
    cursor: theme.cursor,
    cursorAccent: theme.cursorAccent,

    // Selection colors
    selectionBackground: theme.selectionBackground,
    selectionForeground: theme.selectionForeground,

    // ANSI colors - Normal
    black: theme.black,
    red: theme.red,
    green: theme.green,
    yellow: theme.yellow,
    blue: theme.blue,
    magenta: theme.magenta,
    cyan: theme.cyan,
    white: theme.white,

    // ANSI colors - Bright
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

/**
 * Get the CSS foreground color for the terminal container.
 */
export function getTerminalForeground(mode: "light" | "dark"): string {
  return getTerminalTheme(mode).foreground;
}
