import { useSessionStore } from "../../state/sessionStore";
import { TerminalView } from "../terminal/TerminalView";

export function MainPanel() {
  const openTabIds = useSessionStore((s) => s.openTabIds);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);

  if (openTabIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full">
        <p className="text-muted-foreground text-base m-0">
          Create a session to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-hidden relative">
      {openTabIds.map((tabId) => {
        const session = sessions.find((s) => s.id === tabId);
        const isExited = !session || session.state === "Exited" || session.state === "Archived";
        return (
          <TerminalView
            key={tabId}
            sessionId={tabId}
            visible={tabId === activeSessionId}
            isExited={isExited}
          />
        );
      })}
    </div>
  );
}
