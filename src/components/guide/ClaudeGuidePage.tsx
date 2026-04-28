import { Terminal, Sparkles, Zap, Code, BookOpen, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";

interface ClaudeGuidePageProps {
  open: boolean;
  onClose: () => void;
}

const tips = [
  {
    icon: <Terminal size={18} />,
    title: "基础命令",
    content: "直接在终端输入 `claude` 开始与 Claude 对话。"
  },
  {
    icon: <Code size={18} />,
    title: "代码生成",
    content: "使用自然语言描述需求，Claude 可以帮你生成、审查和修改代码。"
  },
  {
    icon: <Zap size={18} />,
    title: "快速任务",
    content: "`claude 'fix the bug'` - 直接在命令中包含你的请求。"
  },
  {
    icon: <Sparkles size={18} />,
    title: "多轮对话",
    content: "启动 Claude 后，可以进行连续的多轮对话，上下文会自动保留。"
  },
  {
    icon: <BookOpen size={18} />,
    title: "项目感知",
    content: "在项目目录中运行 Claude，它会感知当前的项目结构和文件。"
  }
];

export function ClaudeGuidePage({ open, onClose }: ClaudeGuidePageProps) {
  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent side="left" className="w-[540px] sm:max-w-[540px] border-none p-0">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient mesh */}
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />

          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="relative px-6 pt-8 pb-6 border-b border-white/5">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated Logo */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                </div>

                <div>
                  <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                    Claude Workbench
                  </h1>
                  <p className="text-xs text-muted-foreground">Session Manager v1.0</p>
                </div>
              </div>

              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={16} />
                </Button>
              </DrawerClose>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Hero Section with animated border */}
            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-cyan-500/30 animate-pulse" />
              <div className="relative rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-cyan-500/10 border border-white/10 p-6 backdrop-blur-sm">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500/50 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/50 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-pink-500/50 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-500/50 rounded-br-lg" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">welcome.tsx</span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300">
                      欢迎来到未来
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      多会话并行，上下文永存。<br />
                      <span className="text-purple-300">Claude Workbench</span> 让你的 AI 工作流程无限延伸。
                    </p>
                  </div>

                  {/* Typing cursor effect */}
                  <div className="flex items-center gap-2 font-mono text-xs text-green-400">
                    <span className="animate-pulse">$</span>
                    <span>初始化系统...</span>
                    <span className="w-2 h-4 bg-green-400 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Section with staggered animations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em]">
                  功能模块
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              </div>

              <div className="space-y-3">
                {tips.map((tip, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-xl bg-card/50 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {/* Hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative flex gap-4 p-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-purple-300 group-hover:text-purple-200 group-hover:scale-110 transition-all duration-300">
                          {tip.icon}
                        </div>
                        {/* Icon glow */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          {tip.title}
                          <ChevronRight size={14} className="text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tip.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start */}
            <div className="relative rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-5 overflow-hidden">
              {/* Corner accent */}
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-green-500/20 rounded-full blur-2xl" />

              <div className="relative">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Terminal size={16} className="text-green-400" />
                  <span>启动序列</span>
                </h3>

                <div className="space-y-3 font-mono text-sm">
                  {[
                    "点击「+」创建新会话",
                    "输入 claude 初始化",
                    "开始对话 → 创造无限可能"
                  ].map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-md bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 text-xs">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative p-6 border-t border-white/5">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <DrawerClose asChild>
              <Button
                className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={18} />
                  <span>进入工作台</span>
                </span>
              </Button>
            </DrawerClose>

            <p className="text-center text-xs text-muted-foreground mt-4">
              按 <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Esc</kbd> 随时返回
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
