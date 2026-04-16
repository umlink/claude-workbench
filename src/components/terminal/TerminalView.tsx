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
import { TerminalSearchBar } from "./TerminalSearchBar";

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
  const [showSearch, setShowSearch] = useState(false);

  // Keep ref in sync
  isExitedRef.current = isExited;

  useEffect(() => {
    if (!containerRef.current) return;

    hasMarkedUnavailableRef.current = false;
    let isDisposed = false;
    const cleanupFns: Promise<() => void>[] = [];

    const terminal = new Terminal({
      fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        cursorAccent: "#1e1e1e",
        selectionBackground: "rgba(255, 255, 255, 0.2)",
        selectionForeground: "#d4d4d4",
      },
      scrollback: 10000,
      cursorBlink: !isExited,
      cursorStyle: "bar",
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);
    fitAddon.fit();

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

    containerRef.current.addEventListener("click", () => {
      terminal.focus();
    });

    if (isExited) {
      // === Exited session: replay full history in read-only mode ===
      void replaySession(sessionId)
        .then((chunks) => {
          if (isDisposed) return;

          if (chunks.length === 0) {
            terminal.writeln("\x1b[33mNo session history available\x1b[0m");
          } else {
            for (const chunk of chunks) {
              terminal.write(chunk);
            }
          }
          terminal.write("\r\n\x1b[2m--- Session ended (read-only) ---\x1b[0m\r\n");
        })
        .catch((e) => {
          if (isDisposed) return;
          console.error("Failed to replay session:", e);
          terminal.writeln("\x1b[33mFailed to load session history\x1b[0m");
        });
    } else {
      // === Active session: replay history first, then real-time interaction ===

      // Handle keyboard input
      terminal.onData((data: string) => {
        if (!isExitedRef.current) {
          void writeToTerminal(sessionId, data).catch(markSessionUnavailable);
        }
      });

      // Replay past output first, then start listening for real-time events.
      // This ensures that when a tab is re-opened for a running session,
      // the user sees the full history instead of a blank terminal.
      void replaySession(sessionId)
        .then((chunks) => {
          if (isDisposed) return;

          // Write replayed history
          for (const chunk of chunks) {
            terminal.write(chunk);
          }

          // Now register real-time listeners after replay is done
          cleanupFns.push(
            listenToTerminalOutput((event: TerminalOutputEvent) => {
              if (event.sessionId === sessionId) {
                terminal.write(event.chunk);
              }
            }),
          );

          cleanupFns.push(
            listenToTerminalExited((event: TerminalExitedEvent) => {
              if (event.sessionId === sessionId) {
                useSessionStore.getState().updateSessionState(sessionId, "Exited", event.exitCode);
                terminal.options.cursorBlink = false;
                isExitedRef.current = true;
                terminal.write(`\r\n\x1b[2m[Process exited with code ${event.exitCode}]\x1b[0m\r\n`);
              }
            }),
          );
        })
        .catch(() => {
          if (isDisposed) return;
          // Even if replay fails, still register listeners so new output is visible
          cleanupFns.push(
            listenToTerminalOutput((event: TerminalOutputEvent) => {
              if (event.sessionId === sessionId) {
                terminal.write(event.chunk);
              }
            }),
          );

          cleanupFns.push(
            listenToTerminalExited((event: TerminalExitedEvent) => {
              if (event.sessionId === sessionId) {
                useSessionStore.getState().updateSessionState(sessionId, "Exited", event.exitCode);
                terminal.options.cursorBlink = false;
                isExitedRef.current = true;
                terminal.write(`\r\n\x1b[2m[Process exited with code ${event.exitCode}]\x1b[0m\r\n`);
              }
            }),
          );
        });
    }

    // Cmd+F to open search
    terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        setShowSearch(true);
        return false;
      }
      return true;
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (!isExitedRef.current) {
        const size: TerminalSize = { rows: terminal.rows, cols: terminal.cols };
        void resizeTerminal(sessionId, size).catch(markSessionUnavailable);
      }
    };

    window.addEventListener("resize", handleResize);

    // Initial resize
    setTimeout(() => {
      fitAddon.fit();
      if (!isExitedRef.current) {
        const size: TerminalSize = { rows: terminal.rows, cols: terminal.cols };
        void resizeTerminal(sessionId, size).catch(markSessionUnavailable);
      }
    }, 100);

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      for (const unlisten of cleanupFns) {
        unlisten.then((fn) => fn());
      }
      terminal.dispose();
      searchAddonRef.current = null;
    };
  }, [sessionId]);

  // Handle visibility change for fit
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 50);
    }
  }, [visible]);

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
        background: "#1e1e1e",
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
