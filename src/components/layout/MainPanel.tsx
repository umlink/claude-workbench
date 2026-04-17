import { useSessionStore } from "../../state/sessionStore";
import { TerminalView } from "../terminal/TerminalView";
import { FileChangesPanel } from "../changes/FileChangesPanel";
import { Terminal, Sparkles, Zap, Code, BookOpen, Plus, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateSessionDialog } from "../session/CreateSessionDialog";
import { useState } from "react";
import { useProjectStore } from "../../state/projectStore";
import { useUIStore } from "../../state/uiStore";

const tips = [
  {
    icon: <Terminal size={20} />,
    title: "基础命令",
    content: "直接在终端输入 `claude` 开始与 Claude 对话。"
  },
  {
    icon: <Code size={20} />,
    title: "代码生成",
    content: "使用自然语言描述需求，Claude 可以帮你生成、审查和修改代码。"
  },
  {
    icon: <Zap size={20} />,
    title: "快速任务",
    content: "`claude 'fix the bug'` - 直接在命令中包含你的请求。"
  },
  {
    icon: <Sparkles size={20} />,
    title: "多轮对话",
    content: "启动 Claude 后，可以进行连续的多轮对话，上下文会自动保留。"
  },
  {
    icon: <BookOpen size={20} />,
    title: "项目感知",
    content: "在项目目录中运行 Claude，它会感知当前的项目结构和文件。"
  }
];

export function MainPanel() {
  const openTabIds = useSessionStore((s) => s.openTabIds);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const { projects } = useProjectStore();
  const { showRightPanel, toggleRightPanel } = useUIStore();
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [preSelectedProjectId, setPreSelectedProjectId] = useState<string | undefined>();

  if (openTabIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full p-8 overflow-y-auto">
        <div className="max-w-3xl w-full">
          {/* Hero Section */}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 border border-primary/20 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <Sparkles size={28} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">欢迎使用 Claude Workbench</h1>
                <p className="text-sm text-muted-foreground">强大的 Claude Code CLI 会话管理器</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Claude Workbench 让你可以同时管理多个 Claude CLI 会话，
              每个会话都有独立的上下文和持久化的历史记录。
            </p>
            <Button
              onClick={() => {
                setPreSelectedProjectId(projects[0]?.id);
                setShowNewSessionDialog(true);
              }}
              className="gap-2"
            >
              <Plus size={16} />
              创建第一个会话
            </Button>
          </div>

          {/* Tips Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Claude Code CLI 使用技巧
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {tips.map((tip, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-primary">
                    {tip.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tip.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <CreateSessionDialog
          open={showNewSessionDialog}
          onClose={() => {
            setShowNewSessionDialog(false);
            setPreSelectedProjectId(undefined);
          }}
          preSelectedProjectId={preSelectedProjectId}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-hidden relative flex">
      {/* Terminal Area */}
      <div className={`flex-1 h-full overflow-hidden relative ${showRightPanel ? "" : "w-full"}`}>
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

        {/* Toggle Right Panel Button */}
        {activeSessionId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightPanel}
            className="absolute top-2 right-2 h-8 w-8 z-10 bg-card/50 hover:bg-card/80"
          >
            <PanelRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* File Changes Panel */}
      {showRightPanel && activeSessionId && (
        <div className="w-80 h-full border-l border-border flex-shrink-0">
          <FileChangesPanel sessionId={activeSessionId} />
        </div>
      )}
    </div>
  );
}
