import { useEffect } from "react";
import { useSessionStore } from "../state/sessionStore";

export function useKeyboardShortcuts(onNewSession: () => void, onSettings: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+T: New session
      if (mod && e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        onNewSession();
        return;
      }

      // Cmd+W: Close current tab
      if (mod && e.key === "w") {
        e.preventDefault();
        const { activeSessionId, closeTab } = useSessionStore.getState();
        if (activeSessionId) {
          closeTab(activeSessionId);
        }
        return;
      }

      // Cmd+Shift+]: Next tab
      if (mod && e.shiftKey && (e.key === "]" || e.key === "ArrowRight")) {
        e.preventDefault();
        const { openTabIds, activeSessionId, setActiveSession } = useSessionStore.getState();
        if (activeSessionId && openTabIds.length > 1) {
          const idx = openTabIds.indexOf(activeSessionId);
          const nextIdx = (idx + 1) % openTabIds.length;
          setActiveSession(openTabIds[nextIdx]);
        }
        return;
      }

      // Cmd+Shift+[: Prev tab
      if (mod && e.shiftKey && (e.key === "[" || e.key === "ArrowLeft")) {
        e.preventDefault();
        const { openTabIds, activeSessionId, setActiveSession } = useSessionStore.getState();
        if (activeSessionId && openTabIds.length > 1) {
          const idx = openTabIds.indexOf(activeSessionId);
          const prevIdx = (idx - 1 + openTabIds.length) % openTabIds.length;
          setActiveSession(openTabIds[prevIdx]);
        }
        return;
      }

      // Cmd+,: Settings
      if (mod && e.key === ",") {
        e.preventDefault();
        onSettings();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewSession, onSettings]);
}
