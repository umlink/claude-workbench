import { useState } from "react";
import type { SessionInfo } from "../../lib/tauri";
import { useSessionStore } from "../../state/sessionStore";
import { Terminal, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SessionItemProps {
  session: SessionInfo;
}

export function SessionItem({ session }: SessionItemProps) {
  const openTab = useSessionStore((s) => s.openTab);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const destroySession = useSessionStore((s) => s.destroySession);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isActive = activeSessionId === session.id;
  const isRunning = session.state === "Running" || session.state === "Starting";
  const isExited = session.state === "Exited" || session.state === "Archived";

  const handleClick = () => {
    openTab(session.id);
    setActiveSession(session.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await destroySession(session.id);
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error("Failed to delete session:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        role="treeitem"
        aria-selected={isActive}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "group flex items-center gap-1 pr-1 pl-6 py-0.5 cursor-pointer rounded-none transition-colors duration-75 outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
          isActive
            ? "bg-accent"
            : "hover:bg-accent/40"
        )}
      >
        {/* Status indicator / Icon */}
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
          {isRunning ? (
            <div className="relative">
              <Terminal
                size={13}
                className="text-green-500"
              />
              <Circle
                size={5}
                className="absolute -top-0.5 -right-0.5 fill-green-500 text-green-500 animate-pulse"
              />
            </div>
          ) : (
            <Terminal
              size={13}
              className={cn(
                "flex-shrink-0",
                isActive
                  ? "text-foreground"
                  : isExited
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground"
              )}
            />
          )}
        </div>

        {/* Session Name */}
        <span className={cn(
          "truncate whitespace-nowrap text-sm leading-tight flex-1 min-w-0",
          isActive
            ? "text-foreground font-medium"
            : isExited
              ? "text-muted-foreground/70"
              : "text-muted-foreground"
        )}>
          {session.name}
        </span>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={handleDelete}
          title="Close Session"
          aria-label="Close session"
        >
          <X size={12} className="text-muted-foreground hover:text-foreground transition-colors" />
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Close Session"
        description={`Are you sure you want to close "${session.name}"? This action cannot be undone.`}
        confirmText="Close"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
