import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  const themeToApply = theme === "system" ? getSystemTheme() : theme;
  root.classList.add(themeToApply);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [initialized, setInitialized] = useState(false);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch {}
  };

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    let savedTheme: Theme | null = null;
    try {
      savedTheme = localStorage.getItem("theme") as Theme | null;
    } catch {}

    const initialTheme = savedTheme || "dark";
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setInitialized(true);
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (initialized) {
      applyTheme(theme);
    }
  }, [theme, initialized]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
