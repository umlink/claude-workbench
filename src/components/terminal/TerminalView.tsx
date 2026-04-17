import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { SearchAddon } from "xterm-addon-search";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import {
  listenToTerminalOutput,
  listenToTerminalExited,
  writeToTerminal,
  resizeTerminal,
  replaySession,
  type TerminalSize,
  type TerminalOutputEvent,
  type TerminalExitedEvent,
} from "../../lib/tauri";
import { useSessionStore } from "../../state/sessionStore";
import { useSettingsStore } from "../../state/settingsStore";
import { TerminalSearchBar } from "./TerminalSearchBar";
import { getTerminalTheme, getTerminalBackground } from "../../lib/terminalTheme";

interface TerminalViewProps {
  sessionId: string;
  visible: boolean;
  isExited: boolean;
}

export function TerminalView({ sessionId, visible, isExited }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const isExitedRef = useRef(isExited);
  const hasMarkedUnavailableRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const pendingResizeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const { settings } = useSettingsStore();

  // Keep refs in sync
  isExitedRef.current = isExited;

  // Always use dark mode
  const getEffectiveTheme = useCallback((): "light" | "dark" => {
    return "dark";
  }, []);

  // 防抖的 resize 处理
  const debouncedResize = useCallback(() => {
    if (pendingResizeRef.current) {
      clearTimeout(pendingResizeRef.current);
    }
    pendingResizeRef.current = setTimeout(() => {
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        try {
          fitAddonRef.current.fit();
          if (!isExitedRef.current) {
            const size: TerminalSize = {
              rows: terminalRef.current.rows,
              cols: terminalRef.current.cols,
            };
            void resizeTerminal(sessionId, size).catch(() => {});
          }
        } catch (e) {
          console.warn("Resize failed:", e);
        }
      }
      pendingResizeRef.current = null;
    }, 100);
  }, [sessionId]);

  // 关键修复：切换 tab 可见时重新 fit 确保布局正确
  useEffect(() => {
    if (visible && fitAddonRef.current && terminalRef.current && containerRef.current) {
      const doFit = () => {
        try {
          fitAddonRef.current?.fit();
          if (!isExitedRef.current && terminalRef.current) {
            const size: TerminalSize = {
              rows: terminalRef.current.rows,
              cols: terminalRef.current.cols,
            };
            void resizeTerminal(sessionId, size).catch(() => {});
          }
        } catch (e) {
          // ignore
        }
      };
      requestAnimationFrame(doFit);
      setTimeout(doFit, 60);
    }
  }, [visible, sessionId]);

  // Main terminal initialization
  useEffect(() => {
    if (!containerRef.current) return;

    hasMarkedUnavailableRef.current = false;
    let isDisposed = false;
    const cleanupFns: (() => void)[] = [];
    const cleanupPromises: Promise<() => void>[] = [];

    const terminalTheme = getTerminalTheme(getEffectiveTheme());
    const terminal = new Terminal({
      fontFamily: settings.terminal_font_family || "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      fontSize: settings.terminal_font_size || 14,
      lineHeight: 1.2,
      scrollback: settings.terminal_scrollback || 10000,
      cursorBlink: !isExited,
      cursorStyle: "bar",
      theme: terminalTheme,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const markSessionUnavailable = (error: unknown) => {
      if (hasMarkedUnavailableRef.current) {
        return;
      }

      hasMarkedUnavailableRef.current = true;
      isExitedRef.current = true;
      terminal.options.cursorBlink = false;
      terminal.write(
        "\r\n\x1b[31m[Session disconnected. Reopen history or create a new session.]\x1b[0m\r\n",
      );
      useSessionStore.getState().updateSessionState(sessionId, "Exited");
      console.error(`Session ${sessionId} is no longer active:`, error);
    };

    const handleClick = () => terminal.focus();
    containerRef.current.addEventListener("click", handleClick);
    cleanupFns.push(() => containerRef.current?.removeEventListener("click", handleClick));

    // === Register event listeners FIRST (before any async operations) ===
    if (!isExited) {
      // Handle keyboard input
      const disposableOnData = terminal.onData((data: string) => {
        if (!isExitedRef.current) {
          void writeToTerminal(sessionId, data).catch(markSessionUnavailable);
        }
      });
      cleanupFns.push(() => disposableOnData.dispose());

      // Listen for terminal output immediately
      const outputPromise = listenToTerminalOutput((event: TerminalOutputEvent) => {
        if (event.sessionId === sessionId && !isDisposed) {
          terminal.write(event.chunk);
        }
      });
      cleanupPromises.push(outputPromise);

      // Listen for terminal exit immediately
      const exitedPromise = listenToTerminalExited((event: TerminalExitedEvent) => {
        if (event.sessionId === sessionId && !isDisposed) {
          useSessionStore.getState().updateSessionState(sessionId, "Exited", event.exitCode);
          terminal.options.cursorBlink = false;
          isExitedRef.current = true;
          terminal.write(`\r\n\x1b[2m[Process exited with code ${event.exitCode}]\x1b[0m\r\n`);
        }
      });
      cleanupPromises.push(exitedPromise);
    }

    // === Resize handling ===
    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });
    resizeObserver.observe(containerRef.current);
    resizeObserverRef.current = resizeObserver;
    cleanupFns.push(() => resizeObserver.disconnect());

    window.addEventListener("resize", debouncedResize);
    cleanupFns.push(() => window.removeEventListener("resize", debouncedResize));

    // === 初始化流程 ===
    const initializeTerminal = async () => {
      try {
        // 先 fit 再回放
        if (!isDisposed && visible) {
          fitAddon.fit();
          if (!isExitedRef.current) {
            const size: TerminalSize = { rows: terminal.rows, cols: terminal.cols };
            void resizeTerminal(sessionId, size).catch(markSessionUnavailable);
          }
        }

        const chunks = await replaySession(sessionId);
        if (isDisposed) return;

        if (chunks.length === 0 && isExited) {
          terminal.writeln("\x1b[33mNo session history available\x1b[0m");
        } else {
          for (const chunk of chunks) {
            terminal.write(chunk);
          }
        }
        if (isExited) {
          terminal.write("\r\n\x1b[2m--- Session ended (read-only) ---\x1b[0m\r\n");
        }

        // 回放后再次 fit 确保布局正确
        if (!isDisposed && visible) {
          fitAddon.fit();
        }
      } catch (e) {
        if (isDisposed) return;
        console.error("Failed to initialize terminal:", e);
        if (isExited) {
          terminal.writeln("\x1b[33mFailed to load session history\x1b[0m");
        }
      }
    };

    void initializeTerminal();

    // Cmd+F to open search
    terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        setShowSearch(true);
        return false;
      }
      return true;
    });

    // Initial fit
    if (visible) {
      requestAnimationFrame(() => {
        if (!isDisposed) {
          fitAddon.fit();
          if (!isExitedRef.current) {
            const size: TerminalSize = { rows: terminal.rows, cols: terminal.cols };
            void resizeTerminal(sessionId, size).catch(markSessionUnavailable);
          }
        }
      });
    }

    return () => {
      isDisposed = true;

      if (pendingResizeRef.current) {
        clearTimeout(pendingResizeRef.current);
        pendingResizeRef.current = null;
      }

      for (const fn of cleanupFns) {
        fn();
      }

      Promise.all(cleanupPromises)
        .then((fns) => {
          for (const fn of fns) {
            fn();
          }
        })
        .catch((e) => console.error("Error cleaning up event listeners:", e));

      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      resizeObserverRef.current = null;
    };
  }, [sessionId, isExited, settings, debouncedResize, getEffectiveTheme, visible]);

  const handleSearch = useCallback((query: string, direction: "next" | "prev") => {
    if (!searchAddonRef.current || !query) return;
    if (direction === "next") {
      searchAddonRef.current.findNext(query);
    } else {
      searchAddonRef.current.findPrevious(query);
    }
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        display: visible ? "block" : "none",
        background: getTerminalBackground(getEffectiveTheme()),
      }}
    >
      {isExited && (
        <div className="absolute top-0 left-0 right-0 px-3 py-1 bg-card border-b text-[11px] text-muted-foreground z-[50] text-center">
          Read-only replay
        </div>
      )}
      {showSearch && (
        <TerminalSearchBar
          onSearch={handleSearch}
          onClose={() => {
            setShowSearch(false);
            searchAddonRef.current?.clearDecorations();
            terminalRef.current?.focus();
          }}
        />
      )}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          cursor: isExited ? "default" : "text",
          paddingTop: isExited ? 24 : 0,
        }}
      />
    </div>
  );
}
