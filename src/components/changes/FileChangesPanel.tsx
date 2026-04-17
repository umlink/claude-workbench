import { useEffect, useCallback } from "react";
import { FileText, Plus, Minus, Edit3, RefreshCw, AlertCircle, FolderOpen } from "lucide-react";
import { useChangesStore } from "../../state/changesStore";
import { useSessionStore } from "../../state/sessionStore";
import { useProjectStore } from "../../state/projectStore";
import { Button } from "@/components/ui/button";
import { open } from "@tauri-apps/plugin-shell";

interface FileChangesPanelProps {
  sessionId: string;
}

export function FileChangesPanel({ sessionId }: FileChangesPanelProps) {
  const { changedFiles, isLoading, error, detectChanges, loadChangedFiles, clearError } = useChangesStore();
  const { sessions } = useSessionStore();
  const { projects } = useProjectStore();

  const session = sessions.find((s) => s.id === sessionId);
  const project = projects.find((p) => session && p.id === session.project_id);
  const files = changedFiles.get(sessionId) || [];
  const loading = isLoading.get(sessionId) || false;
  const sessionError = error.get(sessionId);

  // Load changed files on mount
  useEffect(() => {
    if (sessionId) {
      loadChangedFiles(sessionId);
    }
  }, [sessionId, loadChangedFiles]);

  const handleDetectChanges = useCallback(async () => {
    if (sessionId && project) {
      await detectChanges(sessionId, project.path);
    }
  }, [sessionId, project, detectChanges]);

  const handleOpenFile = useCallback(async (filePath: string) => {
    if (project) {
      const fullPath = `${project.path}/${filePath}`;
      try {
        await open(fullPath);
      } catch (e) {
        console.error("Failed to open file:", e);
      }
    }
  }, [project]);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "added":
        return <Plus className="w-4 h-4 text-green-500" />;
      case "deleted":
        return <Minus className="w-4 h-4 text-red-500" />;
      case "modified":
        return <Edit3 className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChangeLabel = (changeType: string) => {
    switch (changeType) {
      case "added":
        return "Added";
      case "deleted":
        return "Deleted";
      case "modified":
        return "Modified";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Changed Files
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDetectChanges}
            disabled={loading || !project}
            className="h-8 px-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {!project && (
          <p className="text-xs text-muted-foreground mt-1">
            Project not found
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {sessionError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{sessionError}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearError(sessionId)}
                className="h-6 px-2 mt-1 text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {loading && files.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No changed files detected</p>
            {project && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDetectChanges}
                className="mt-2 h-7 px-3 text-xs"
              >
                Scan for changes
              </Button>
            )}
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="group flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleOpenFile(file.file_path)}
              >
                {getChangeIcon(file.change_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate font-mono">
                    {file.file_path}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getChangeLabel(file.change_type)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFile(file.file_path);
                  }}
                >
                  <FolderOpen className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {files.length > 0 && (
        <div className="p-3 border-t border-border bg-card/50">
          <p className="text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""} changed
          </p>
        </div>
      )}
    </div>
  );
}
