import { useState, useEffect, useRef } from "react";
import { Folder, FolderOpen, Plus, Trash2, MoreHorizontal, ChevronRight } from "lucide-react";
import { useProjectStore } from "../../state/projectStore";
import { useSessionStore } from "../../state/sessionStore";
import { SessionItem } from "./SessionItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Store expandedIds will persist in window for cross-component coordination
(window as any).expandedIds = new Set<string>();

interface ProjectListProps {
  onNewSession: (projectId: string) => void;
}

export function ProjectList({ onNewSession }: ProjectListProps) {
  const { projects, activeProjectId, setActiveProject, deleteProject } = useProjectStore();
  const sessions = useSessionStore((s) => s.sessions);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const saved = (window as any).expandedIds || new Set();
    if (saved.size === 0) {
      return new Set(projects.map((p) => p.id));
    }
    return saved;
  });
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Sync expandedIds to window for cross-component access
  useEffect(() => {
    (window as any).expandedIds = expandedIds;
  }, [expandedIds]);

  const toggleExpand = (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      (window as any).expandedIds = next;
      return next;
    });
  };

  const handleRowClick = (projectId: string, e: React.MouseEvent) => {
    // Check if click is on the actions menu or its children
    if (actionsRef.current?.contains(e.target as Node)) {
      return;
    }
    toggleExpand(projectId, e);
  };

  const handleProjectClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveProject(projectId);
  };

  const handleNewSession = (projectId: string) => {
    onNewSession(projectId);
  };

  const handleDeleteProject = (projectId: string) => {
    setDeleteProjectId(projectId);
  };

  const confirmDeleteProject = async () => {
    if (!deleteProjectId) return;
    setIsDeleting(true);
    try {
      await deleteProject(deleteProjectId);
      setDeleteProjectId(null);
    } catch (e) {
      console.error("Failed to delete project:", e);
    } finally {
      setIsDeleting(false);
    }
  };


  const projectToDelete = projects.find((p) => p.id === deleteProjectId);

  return (
    <>
      <div className="flex flex-col gap-1" role="tree">
        {projects.map((project) => {
          const isExpanded = expandedIds.has(project.id);
          const isActive = activeProjectId === project.id;
          const projectSessions = sessions
            .filter((s) => s.project_id === project.id)
            .sort((a, b) => {
              const aIsActive = a.state === "Running" || a.state === "Starting";
              const bIsActive = b.state === "Running" || b.state === "Starting";
              if (aIsActive && !bIsActive) return -1;
              if (!aIsActive && bIsActive) return 1;
              return b.created_at - a.created_at;
            });

          return (
            <div key={project.id} className="relative">
              {/* Project Header */}
              <div
                role="treeitem"
                aria-selected={isActive}
                aria-expanded={isExpanded}
                onClick={(e) => handleRowClick(project.id, e)}
                className={cn(
                  "group flex items-center gap-0 pr-1 pl-0 py-0 cursor-pointer rounded-none transition-colors duration-75 hover:bg-accent/50"
                )}
              >
                {/* Project Icon - changes on hover */}
                <div className="flex-1 flex items-center gap-1.5 py-0.5 px-0.5 min-w-0">
                  <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {/* Default: Folder icon */}
                    <div className={cn("transition-opacity duration-150", "group-hover:opacity-0")}>
                      {isExpanded ? (
                        <FolderOpen
                          size={15}
                          className="text-muted-foreground"
                        />
                      ) : (
                        <Folder
                          size={15}
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                    {/* Hover: Chevron icon */}
                    <div className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-150", "opacity-0 group-hover:opacity-100")}>
                      <ChevronRight
                        size={14}
                        className={cn(
                          "text-muted-foreground transition-transform duration-150",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>
                  </div>
                  <span
                    className="truncate whitespace-nowrap text-sm leading-tight text-foreground"
                    onClick={(e) => handleProjectClick(project.id, e)}
                  >
                    {project.name}
                  </span>
                </div>

                {/* Actions Menu */}
                <div
                  ref={actionsRef}
                  className={cn(
                    "flex-shrink-0 transition-opacity",
                    "opacity-0 group-hover:opacity-100"
                  )}
                  data-dropdown-menu
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        title="More options"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end" data-dropdown-menu>
                      <DropdownMenuItem
                        onClick={() => handleNewSession(project.id)}
                        icon={<Plus size={14} />}
                      >
                        New Session
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteProject(project.id)}
                        icon={<Trash2 size={14} className="text-destructive" />}
                        className="text-destructive"
                      >
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Session List */}
              <div
                role="group"
                className={cn(
                  "relative overflow-hidden transition-all duration-200 ease-out",
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="flex flex-col gap-0">
                  {projectSessions.map((session) => (
                    <SessionItem key={session.id} session={session} />
                  ))}
                  {projectSessions.length === 0 && (
                    <div className="pl-6 py-0.5">
                      <span className="text-xs text-muted-foreground/50 select-none">
                        (empty)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteProjectId}
        onOpenChange={(open) => !open && setDeleteProjectId(null)}
        title="Delete Project"
        description={projectToDelete
          ? `Are you sure you want to delete "${projectToDelete.name}"? All sessions in this project will also be deleted. This action cannot be undone.`
          : "Are you sure you want to delete this project?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteProject}
        isLoading={isDeleting}
      />
    </>
  );
}
