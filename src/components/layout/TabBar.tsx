import { useCallback, useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useSessionStore } from "../../state/sessionStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TabBarProps {
  onNewSession: () => void;
}

export function TabBar({ onNewSession }: TabBarProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const openTabIds = useSessionStore((s) => s.openTabIds);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const closeTab = useSessionStore((s) => s.closeTab);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleClose = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      closeTab(id);
    },
    [closeTab],
  );

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeSessionId && tabRefs.current[activeSessionId]) {
      tabRefs.current[activeSessionId]?.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
        block: "nearest",
      });
    }
  }, [activeSessionId]);

  return (
    <div className="flex items-center h-[38px] min-h-[38px] bg-card border-b">
      <div
        ref={tabListRef}
        className="hide-scrollbar h-full flex flex-1 overflow-x-auto overflow-y-hidden items-stretch gap-0"
      >
        {openTabIds.map((tabId) => {
          const session = sessions.find((s) => s.id === tabId);
          const isActive = tabId === activeSessionId;
          const isHovered = hoveredTabId === tabId;

          return (
            <div
              key={tabId}
              ref={(el) => { tabRefs.current[tabId] = el; }}
              onClick={() => setActiveSession(tabId)}
              onMouseEnter={() => setHoveredTabId(tabId)}
              onMouseLeave={() => setHoveredTabId(null)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-0 h-full border-b-2 border-transparent cursor-pointer whitespace-nowrap text-sm transition-colors relative flex-shrink-0",
                "after:absolute after:right-0 after:top-1 after:bottom-1 after:w-px after:bg-border",
                isActive
                  ? "bg-background text-foreground border-b-primary"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {session?.state === "Running" && (
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              )}
              <span className="truncate max-w-[140px] mr-auto">
                {session?.name ?? tabId}
              </span>
              <button
                onClick={(e) => handleClose(e, tabId)}
                title="Close tab"
                className={cn(
                  "flex items-center justify-center border-none cursor-pointer p-0 rounded w-5 h-5 min-w-5 min-h-5 transition-opacity transition-colors ml-1",
                  isHovered || isActive ? "opacity-100" : "opacity-0",
                  isHovered ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNewSession}
        title="New session"
        className="w-8 h-8 mx-1"
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
