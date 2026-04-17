import { Terminal, Sparkles, Zap, Code, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

interface ClaudeGuidePageProps {
  open: boolean;
  onClose: () => void;
}

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

export function ClaudeGuidePage({ open, onClose }: ClaudeGuidePageProps) {
  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent side="left" className="w-[500px] sm:max-w-[500px]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              Claude Code CLI 使用指南
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X size={16} />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex flex-col gap-6 p-6 overflow-y-auto">
          {/* Hero Section */}
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-6 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles size={24} className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">欢迎使用 Claude Workbench</h2>
                <p className="text-sm text-muted-foreground">强大的 Claude Code CLI 会话管理器</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claude Workbench 让你可以同时管理多个 Claude CLI 会话，
              每个会话都有独立的上下文和持久化的历史记录。
            </p>
          </div>

          {/* Tips Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              使用技巧
            </h3>
            <div className="grid gap-4">
              {tips.map((tip, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-primary">
                    {tip.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1">
                      {tip.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tip.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start */}
          <div className="rounded-lg bg-muted/50 p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Terminal size={16} className="text-primary" />
              快速开始
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-primary font-mono mt-0.5">1.</span>
                <span className="text-muted-foreground">点击上方的「+」创建新会话</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-mono mt-0.5">2.</span>
                <span className="text-muted-foreground">在终端中输入 <code className="bg-accent px-1.5 py-0.5 rounded text-xs font-mono">claude</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-mono mt-0.5">3.</span>
                <span className="text-muted-foreground">开始与 Claude 对话！</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <DrawerClose asChild>
            <Button className="w-full" onClick={onClose}>
              开始使用
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
