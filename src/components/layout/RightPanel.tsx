import { useState } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  Terminal,
  Folder,
  Clock,
  Activity,
  Search,
  Eye,
  FileText,
} from "lucide-react";
import { useSessionStore } from "../../state/sessionStore";
import { SearchPanel } from "../search/SearchPanel";
import { EnhancedOutputPanel } from "../terminal/EnhancedOutputPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RightPanelTab = "info" | "enhanced" | "search";

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<RightPanelTab>("info");
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessionOutputs = useSessionStore((s) => s.sessionOutputs);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const panelWidth = collapsed ? 36 : 380;

  const isRunning = activeSession?.state === "Running" || activeSession?.state === "Starting";
  const activeOutputChunks = activeSessionId ? (sessionOutputs.get(activeSessionId) || []) : [];

  const handleOpenFile = (filePath: string, lineNumber?: number) => {
    console.log("Open file:", filePath, lineNumber);
    // TODO: Implement file opening via Tauri command
  };

  const handleOpenUrl = (url: string) => {
    console.log("Open URL:", url);
    // Default behavior already opens in new tab
  };

  return (
    <div
      className="flex flex-shrink-0 bg-card border-l overflow-hidden transition-width duration-200"
      style={{ width: panelWidth }}
    >
      <div className="flex flex-col items-center pt-2 w-9 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          className="w-7 h-7"
        >
          {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </Button>
        {!collapsed && activeSession && (
          <div className="flex flex-col items-center gap-1 mt-2">
            <Button
              variant={activeTab === "info" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setActiveTab("info")}
              title="Session Info"
              className="w-7 h-7"
            >
              <Activity size={14} />
            </Button>
            <Button
              variant={activeTab === "enhanced" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setActiveTab("enhanced")}
              title="Enhanced Output"
              className="w-7 h-7"
            >
              <Eye size={14} />
            </Button>
            <Button
              variant={activeTab === "search" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setActiveTab("search")}
              title="Search"
              className="w-7 h-7"
            >
              <Search size={14} />
            </Button>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 flex flex-col min-w-0">
          {activeSession ? (
            <>
              {/* Tab Bar */}
              <div className="flex items-center border-b px-1">
                <TabButton
                  active={activeTab === "info"}
                  onClick={() => setActiveTab("info")}
                  icon={<Activity size={12} />}
                  label="Info"
                />
                <TabButton
                  active={activeTab === "enhanced"}
                  onClick={() => setActiveTab("enhanced")}
                  icon={<Eye size={12} />}
                  label="Output"
                />
                <TabButton
                  active={activeTab === "search"}
                  onClick={() => setActiveTab("search")}
                  icon={<Search size={12} />}
                  label="Search"
                />
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden min-w-0">
                {activeTab === "info" && (
                  <SessionInfoPanel activeSession={activeSession} isRunning={isRunning} />
                )}
                {activeTab === "enhanced" && (
                  <EnhancedOutputPanel
                    sessionId={activeSession.id}
                    outputChunks={activeOutputChunks}
                    visible={true}
                    onOpenFile={handleOpenFile}
                    onOpenUrl={handleOpenUrl}
                  />
                )}
                {activeTab === "search" && (
                  <div className="h-full flex flex-col">
                    <div className="p-3 pb-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Search size={14} />
                        Search Sessions
                      </h3>
                    </div>
                    <div className="flex-1 min-h-0 px-3 pb-3">
                      <SearchPanel />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Terminal size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground text-center">
                No active session
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border-b-2 transition-colors",
        active
          ? "text-foreground border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Session Info Panel Component
function SessionInfoPanel({
  activeSession,
  isRunning,
}: {
  activeSession: any;
  isRunning: boolean;
}) {
  return (
    <div className="py-4 px-4 overflow-y-auto min-w-0 select-none h-full">
      {/* Session Info Section */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Activity size={14} />
          Session Info
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Terminal size={12} />
              Name
            </Label>
            <div className="bg-accent/30 rounded-md px-3 py-2">
              <p className="text-sm text-foreground break-all">
                {activeSession.name}
              </p>
            </div>
          </div>

          {/* Command */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Terminal size={12} />
              Command
            </Label>
            <div className="bg-accent/30 rounded-md px-3 py-2">
              <p className="text-sm text-foreground break-all font-mono">
                {activeSession.command}
                {activeSession.args.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}{activeSession.args.join(" ")}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* CWD */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Folder size={12} />
              Working Directory
            </Label>
            <div className="bg-accent/30 rounded-md px-3 py-2">
              <p className="text-sm text-foreground break-all" title={activeSession.cwd}>
                {activeSession.cwd}
              </p>
            </div>
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Activity size={12} />
              State
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                isRunning
                  ? "bg-green-500/10 text-green-500"
                  : "bg-muted text-muted-foreground"
              )}>
                {isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                {activeSession.state}
              </span>
            </div>
          </div>

          {/* Created */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock size={12} />
              Created At
            </Label>
            <div className="bg-accent/30 rounded-md px-3 py-2">
              <p className="text-sm text-foreground">
                {new Date(activeSession.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Changes Section */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <FileText size={14} />
          Changes
        </h3>
        <div className="bg-accent/20 rounded-md px-3 py-3">
          <p className="text-xs text-muted-foreground italic m-0">
            No changes tracked yet
          </p>
        </div>
      </div>
    </div>
  );
}
