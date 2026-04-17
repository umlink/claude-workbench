import { useState, useEffect } from "react";
import { Terminal } from "lucide-react";
import { useSessionStore } from "../../state/sessionStore";
import { useProjectStore } from "../../state/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface CreateSessionDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedProjectId?: string;
}

export function CreateSessionDialog({ open, onClose, preSelectedProjectId }: CreateSessionDialogProps) {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("claude");
  const [cwd, setCwd] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { projects } = useProjectStore();
  const { createSession: addSession } = useSessionStore();

  useEffect(() => {
    if (open) {
      setName(`Session ${new Date().toLocaleTimeString()}`);
      setCommand("claude");
      const selectedProjectId = preSelectedProjectId ?? projects[0]?.id ?? "";
      setProjectId(selectedProjectId);
      // Auto-set cwd to project path
      const selectedProject = projects.find((p) => p.id === selectedProjectId);
      setCwd(selectedProject?.path ?? "");
    }
  }, [open, projects, preSelectedProjectId]);

  // Auto-update cwd when project changes
  useEffect(() => {
    if (projectId) {
      const selectedProject = projects.find((p) => p.id === projectId);
      setCwd(selectedProject?.path ?? "");
    }
  }, [projectId, projects]);

  const handleCreate = async () => {
    if (!projectId || !command.trim()) return;
    setIsCreating(true);
    try {
      await addSession(
        projectId,
        name || `Session ${Date.now()}`,
        command,
        [],
        cwd || (projects.find((p) => p.id === projectId)?.path ?? "/"),
        24,
        80
      );
      onClose();
    } catch (e) {
      console.error("Failed to create session:", e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal size={18} className="text-primary" />
            New Session
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project">Project</Label>
            {preSelectedProjectId ? (
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {projects.find((p) => p.id === preSelectedProjectId)?.name ?? "Unknown project"}
              </div>
            ) : (
              <Select
                value={projectId}
                onValueChange={setProjectId}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.path})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="command">Command</Label>
            <Input
              id="command"
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="claude"
              className="font-mono"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cwd">Working Directory</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
              {cwd ?? (projects.find((p) => p.id === projectId)?.path ?? "/")}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !projectId || !command.trim()}
          >
            {isCreating ? "Creating..." : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
