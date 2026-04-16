import { useState, useEffect } from "react";
import { FolderPlus, FolderOpen } from "lucide-react";
import { useProjectStore } from "../../state/projectStore";
import { pickFolder } from "../../lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const { createProject } = useProjectStore();

  useEffect(() => {
    if (open) {
      setName("");
      setPath("/Users/krlin");
    }
  }, [open]);

  const handleSelectFolder = async () => {
    setIsPicking(true);
    try {
      const selectedPath = await pickFolder();
      if (selectedPath) {
        setPath(selectedPath);
        if (!name.trim()) {
          const folderName = selectedPath.split("/").pop() || selectedPath;
          setName(folderName);
        }
      }
    } catch (e) {
      console.error("Failed to select folder:", e);
    } finally {
      setIsPicking(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !path.trim()) return;
    setIsCreating(true);
    try {
      await createProject(name.trim(), path.trim());
      onClose();
    } catch (e) {
      console.error("Failed to create project:", e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus size={18} className="text-primary" />
            New Project
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-path">Path</Label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/project"
                className="font-mono flex-1"
              />
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isPicking}
                className={cn(
                  "inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors",
                  "h-10 w-10",
                  isPicking
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                title="Browse folder"
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !path.trim()}
          >
            {isCreating ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
