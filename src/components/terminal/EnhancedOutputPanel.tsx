import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Code, AlertTriangle, FileText, Link2, Clock, Copy, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  parseTerminalOutput,
  detectLinks,
  findFoldableSections,
  getLanguageClass,
  stripAnsi,
  type DetectedBlock,
  type FoldableSection,
} from '../../lib/terminalEnhancer';
import { Button } from '../ui/button';

interface EnhancedOutputPanelProps {
  sessionId: string;
  outputChunks: string[];
  visible: boolean;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
  onOpenUrl?: (url: string) => void;
}

export function EnhancedOutputPanel({
  sessionId: _sessionId,
  outputChunks,
  visible,
  onOpenFile,
  onOpenUrl,
}: EnhancedOutputPanelProps) {
  const [showEnhancedView, setShowEnhancedView] = useState(true);
  const [foldedSections, setFoldedSections] = useState<Set<string>>(new Set());
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  // Parse output into lines and blocks
  const { lines, blocks, foldableSections } = useMemo(() => {
    const fullOutput = outputChunks.join('');
    const lines = fullOutput.split('\n');
    const blocks = parseTerminalOutput(lines);
    const foldableSections = findFoldableSections(lines, 15);

    return { lines, blocks, foldableSections };
  }, [outputChunks]);

  // Toggle fold state
  const toggleSection = useCallback((sectionId: string) => {
    setFoldedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Copy block content
  const copyBlock = useCallback((content: string, blockId: string) => {
    const cleanContent = stripAnsi(content);
    navigator.clipboard.writeText(cleanContent).then(() => {
      setCopiedBlock(blockId);
      setTimeout(() => setCopiedBlock(null), 2000);
    });
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Enhanced Output</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowEnhancedView(!showEnhancedView)}
            title={showEnhancedView ? 'Show raw output' : 'Show enhanced view'}
          >
            {showEnhancedView ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {showEnhancedView ? (
          <EnhancedView
            blocks={blocks}
            foldableSections={foldableSections}
            foldedSections={foldedSections}
            copiedBlock={copiedBlock}
            onToggleSection={toggleSection}
            onCopyBlock={copyBlock}
            onOpenFile={onOpenFile}
            onOpenUrl={onOpenUrl}
          />
        ) : (
          <RawView lines={lines} />
        )}
      </div>
    </div>
  );
}

// Enhanced View Component
interface EnhancedViewProps {
  blocks: DetectedBlock[];
  foldableSections: FoldableSection[];
  foldedSections: Set<string>;
  copiedBlock: string | null;
  onToggleSection: (id: string) => void;
  onCopyBlock: (content: string, id: string) => void;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
  onOpenUrl?: (url: string) => void;
}

function EnhancedView({
  blocks,
  foldableSections,
  foldedSections,
  copiedBlock,
  onToggleSection,
  onCopyBlock,
  onOpenFile,
  onOpenUrl,
}: EnhancedViewProps) {
  // Create a map of foldable sections by start line
  const foldMap = useMemo(() => {
    const map = new Map<number, FoldableSection>();
    for (const section of foldableSections) {
      map.set(section.startLine, section);
    }
    return map;
  }, [foldableSections]);

  return (
    <div className="space-y-1">
      {blocks.map((block, blockIndex) => {
        const blockId = `block-${blockIndex}`;
        const foldableSection = foldMap.get(block.start);

        // Check if this block starts a foldable section
        if (foldableSection && block.start === foldableSection.startLine) {
          return (
            <FoldableBlock
              key={blockId}
              section={foldableSection}
              isFolded={foldedSections.has(foldableSection.id)}
              onToggle={() => onToggleSection(foldableSection.id)}
              onCopy={() => onCopyBlock(block.content, blockId)}
              isCopied={copiedBlock === blockId}
            >
              <RenderBlock
                block={block}
                blockId={blockId}
                onOpenFile={onOpenFile}
                onOpenUrl={onOpenUrl}
                onCopyBlock={onCopyBlock}
                copiedBlock={copiedBlock}
              />
            </FoldableBlock>
          );
        }

        // Skip if inside a folded section
        for (const section of foldableSections) {
          if (
            foldedSections.has(section.id) &&
            block.start >= section.startLine &&
            block.start <= section.endLine
          ) {
            return null;
          }
        }

        return (
          <RenderBlock
            key={blockId}
            block={block}
            blockId={blockId}
            onOpenFile={onOpenFile}
            onOpenUrl={onOpenUrl}
            onCopyBlock={onCopyBlock}
            copiedBlock={copiedBlock}
          />
        );
      })}
    </div>
  );
}

// Render individual block
function RenderBlock({
  block,
  blockId,
  onOpenFile,
  onOpenUrl,
  onCopyBlock,
  copiedBlock,
}: {
  block: DetectedBlock;
  blockId: string;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
  onOpenUrl?: (url: string) => void;
  onCopyBlock: (content: string, id: string) => void;
  copiedBlock: string | null;
}) {
  switch (block.type) {
    case 'code':
      return (
        <CodeBlock
          content={block.content}
          language={block.language}
          onCopy={() => onCopyBlock(block.content, blockId)}
          isCopied={copiedBlock === blockId}
        />
      );
    case 'error':
      return <ErrorBlock content={block.content} errorType={block.errorType} />;
    case 'timestamp':
      return <TimestampBlock content={block.content} timestamp={block.timestamp} />;
    case 'text':
    default:
      return (
        <TextBlock
          content={block.content}
          onOpenFile={onOpenFile}
          onOpenUrl={onOpenUrl}
        />
      );
  }
}

// Simple syntax highlighter for JSON
function highlightJSON(code: string): React.ReactNode {
  const tokens = code.split(/("(?:\\.|[^"\\])*"|\s+|\{|\}|\[|\]|:|,|\d+\.?\d*|true|false|null)/g).filter(Boolean);

  return tokens.map((token, index) => {
    const trimmed = token.trim();
    if (!trimmed) {
      return <span key={index}>{token}</span>;
    }
    if (trimmed === '{' || trimmed === '}' || trimmed === '[' || trimmed === ']' || trimmed === ',' || trimmed === ':') {
      return <span key={index} className="token punctuation">{token}</span>;
    }
    if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') {
      return <span key={index} className="token keyword">{token}</span>;
    }
    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return <span key={index} className="token number">{token}</span>;
    }
    if (token.startsWith('"')) {
      // Check if this is a property key (followed by :)
      const isKey = index < tokens.length - 1 && tokens.slice(index + 1).some(t => t.trim() === ':');
      if (isKey) {
        return <span key={index} className="token property">{token}</span>;
      }
      return <span key={index} className="token string">{token}</span>;
    }
    return <span key={index}>{token}</span>;
  });
}

// Code Block Component
function CodeBlock({
  content,
  language,
  onCopy,
  isCopied,
}: {
  content: string;
  language?: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  const lines = content.split('\n');
  // Remove the ``` lines
  const codeLines = lines.slice(1, -1);
  const cleanCode = codeLines.join('\n');
  const langClass = language ? getLanguageClass(language) : '';
  const isJSON = langClass === 'json';

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border border-border rounded-t-md">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">
            {language || 'code'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onCopy}
        >
          {isCopied ? (
            <span className="text-[10px] text-green-500">Copied!</span>
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre
        className={cn(
          'px-3 py-2 bg-muted/50 border border-t-0 border-border rounded-b-md overflow-x-auto',
          language ? `language-${langClass}` : ''
        )}
      >
        <code>{isJSON ? highlightJSON(cleanCode) : cleanCode}</code>
      </pre>
    </div>
  );
}

// Error Block Component
function ErrorBlock({ content, errorType }: { content: string; errorType?: string }) {
  const cleanContent = stripAnsi(content);

  return (
    <div className="flex items-start gap-2 my-1.5 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
      <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-destructive font-medium mb-0.5">
          {errorType || 'Error'}
        </div>
        <div className="text-destructive/90 break-words">{cleanContent}</div>
      </div>
    </div>
  );
}

// Timestamp Block Component
function TimestampBlock({ content, timestamp }: { content: string; timestamp?: Date }) {
  const cleanContent = stripAnsi(content);
  const formattedTime = timestamp
    ? timestamp.toLocaleTimeString()
    : null;

  return (
    <div className="flex items-center gap-2 my-1 text-muted-foreground">
      <Clock className="h-3 w-3 shrink-0" />
      {formattedTime && (
        <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">{formattedTime}</span>
      )}
      <span className="opacity-70">{cleanContent}</span>
    </div>
  );
}

// Text Block Component with link detection
function TextBlock({
  content,
  onOpenFile,
  onOpenUrl,
}: {
  content: string;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
  onOpenUrl?: (url: string) => void;
}) {
  const links = useMemo(() => detectLinks(content), [content]);

  if (links.length === 0) {
    return (
      <div className="whitespace-pre-wrap break-words text-muted-foreground/90">
        {stripAnsi(content)}
      </div>
    );
  }

  // Split content into parts with links
  const parts: Array<{ type: 'text' | 'link'; content: string; link?: any }> = [];
  let lastIndex = 0;

  for (const link of links) {
    if (link.start > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, link.start),
      });
    }
    parts.push({
      type: 'link',
      content: content.slice(link.start, link.end),
      link,
    });
    lastIndex = link.end;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return (
    <div className="whitespace-pre-wrap break-words text-muted-foreground/90">
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{stripAnsi(part.content)}</span>;
        }

        const link = part.link;
        return (
          <LinkSpan
            key={i}
            link={link}
            onOpenFile={onOpenFile}
            onOpenUrl={onOpenUrl}
          />
        );
      })}
    </div>
  );
}

// Link Span Component
function LinkSpan({
  link,
  onOpenFile,
  onOpenUrl,
}: {
  link: any;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
  onOpenUrl?: (url: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (link.type === 'file' && onOpenFile) {
      onOpenFile(link.filePath, link.lineNumber);
    } else if (link.type === 'url' && onOpenUrl) {
      onOpenUrl(link.url);
    } else if (link.type === 'url') {
      window.open(link.url, '_blank');
    }
  };

  const Icon = link.type === 'file' ? FileText : Link2;

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-accent/50 hover:bg-accent rounded-sm text-accent-foreground transition-colors group"
    >
      <Icon className="h-2.5 w-2.5 shrink-0 opacity-60" />
      <span className="underline-offset-2 group-hover:underline">
        {stripAnsi(link.content)}
      </span>
      <ExternalLink className="h-2 w-2 shrink-0 opacity-40" />
    </button>
  );
}

// Foldable Block Component
function FoldableBlock({
  section,
  isFolded,
  onToggle,
  onCopy,
  isCopied,
  children,
}: {
  section: FoldableSection;
  isFolded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  isCopied: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="my-1 border border-border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isFolded ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground font-medium">
            {isFolded ? 'Show' : 'Hide'} {section.lineCount} lines
          </span>
        </div>
        {isFolded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
          >
            {isCopied ? (
              <span className="text-[10px] text-green-500">Copied!</span>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </button>
      {!isFolded && <div className="p-2 border-t border-border">{children}</div>}
      {isFolded && (
        <div className="px-2 py-1 border-t border-border bg-black/10">
          <pre className="text-[10px] text-muted-foreground/70 truncate">
            {stripAnsi(section.preview)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Raw View Component
function RawView({ lines }: { lines: string[] }) {
  return (
    <pre className="whitespace-pre-wrap break-words text-muted-foreground/80">
      {lines.map((line, i) => (
        <div key={i}>{stripAnsi(line)}</div>
      ))}
    </pre>
  );
}
