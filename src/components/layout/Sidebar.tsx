import { Sparkles, Settings, FolderPlus, RefreshCw } from "lucide-react";
import { ProjectList } from "../sidebar/ProjectList";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onNewSession: (projectId: string) => void;
  onNewProject: () => void;
  onSettings: () => void;
}

export function Sidebar({ onNewSession, onNewProject, onSettings }: SidebarProps) {
  return (
    <aside
      className="w-[280px] min-w-[280px] h-full flex flex-col bg-card border-r select-none overflow-hidden"
      aria-label="Project and session navigation"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Sparkles size={20} className="text-primary-foreground flex-shrink-0" aria-hidden="true" />
        </div>
        <div>
          <div className="text-base font-bold text-foreground leading-tight">
            Claude Workbench
          </div>
          <div className="text-xs text-muted-foreground leading-tight">
            Session Manager
          </div>
        </div>
      </div>

      {/* Project List */}
      <nav
        className="flex-1 px-4 py-3 overflow-y-auto overflow-x-hidden"
        aria-label="Projects"
      >
        <ProjectList onNewSession={onNewSession} />
      </nav>

      {/* Bottom Actions */}
      <div className="p-2 border-t flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewProject}
          className="gap-1.5 text-xs h-8 px-2"
        >
          <FolderPlus size={14} aria-hidden="true" />
          <span>Add Project</span>
        </Button>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            title="Refresh page"
            aria-label="Refresh page"
            className="w-8 h-8"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            title="Settings"
            aria-label="Open settings"
            className="w-8 h-8"
          >
            <Settings size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
