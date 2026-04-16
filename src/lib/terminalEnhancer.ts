/**
 * Terminal Output Enhancer
 * Provides utilities for parsing and enhancing terminal output with:
 * - Code block detection and highlighting
 * - Error block detection
 * - File path and URL detection
 * - Long output folding markers
 * - Timestamp detection
 */

export interface DetectedBlock {
  type: 'code' | 'error' | 'file' | 'url' | 'timestamp' | 'text';
  start: number;
  end: number;
  content: string;
  language?: string;
  filePath?: string;
  lineNumber?: number;
  url?: string;
  timestamp?: Date;
  errorType?: string;
  isFolded?: boolean;
  foldId?: string;
}

export interface FoldableSection {
  id: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  isFolded: boolean;
  preview: string;
}

// Regex patterns for detection
const PATTERNS = {
  // Code blocks (markdown style ```code``` or ```python```)
  codeBlockStart: /^```(\w*)\s*$/,
  codeBlockEnd: /^```\s*$/,

  // File paths (common patterns)
  filePath: /(?:^|\s)([~\w./\\-]+\.(?:js|ts|jsx|tsx|py|rs|go|java|cpp|c|h|hpp|json|yaml|yml|md|txt|sh|bash|zsh|fish|html|css|scss|less))(?::(\d+))?(?:$|\s)/g,

  // URLs
  url: /(https?:\/\/[^\s<>]+)/g,

  // Error patterns
  error: /^(?:error|Error|ERROR|Traceback|panic|Panic|PANIC|fatal|Fatal|FATAL)[\s:].*$/gm,
  errorType: /^(error|Error|ERROR|Traceback|panic|Panic|PANIC|fatal|Fatal|FATAL)/,

  // Timestamps (ISO 8601, or common formats)
  timestamp: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/,
  timestampLocal: /\[(?:\d{4}-\d{2}-\d{2}\s)?\d{2}:\d{2}:\d{2}\]/,
};

/**
 * Strip ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Parse terminal output lines and detect special blocks
 */
export function parseTerminalOutput(lines: string[]): DetectedBlock[] {
  const blocks: DetectedBlock[] = [];
  let inCodeBlock = false;
  let codeBlockStart = 0;
  let codeLanguage = '';
  let currentPosition = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = stripAnsi(line);

    // Check for code block start
    const codeStartMatch = cleanLine.match(PATTERNS.codeBlockStart);
    if (codeStartMatch && !inCodeBlock) {
      // Add any text before code block
      if (currentPosition < i) {
        blocks.push({
          type: 'text',
          start: currentPosition,
          end: i,
          content: lines.slice(currentPosition, i).join('\n'),
        });
      }

      inCodeBlock = true;
      codeBlockStart = i;
      codeLanguage = codeStartMatch[1] || '';
      currentPosition = i;
      continue;
    }

    // Check for code block end
    const codeEndMatch = cleanLine.match(PATTERNS.codeBlockEnd);
    if (codeEndMatch && inCodeBlock) {
      blocks.push({
        type: 'code',
        start: codeBlockStart,
        end: i + 1,
        content: lines.slice(codeBlockStart, i + 1).join('\n'),
        language: codeLanguage,
      });

      inCodeBlock = false;
      currentPosition = i + 1;
      continue;
    }

    // If not in code block, check for other patterns
    if (!inCodeBlock) {
      // Check for errors
      const errorMatch = cleanLine.match(PATTERNS.error);
      if (errorMatch) {
        // Add any text before error
        if (currentPosition < i) {
          blocks.push({
            type: 'text',
            start: currentPosition,
            end: i,
            content: lines.slice(currentPosition, i).join('\n'),
          });
        }

        const errorTypeMatch = cleanLine.match(PATTERNS.errorType);
        blocks.push({
          type: 'error',
          start: i,
          end: i + 1,
          content: line,
          errorType: errorTypeMatch ? errorTypeMatch[1] : 'error',
        });

        currentPosition = i + 1;
        continue;
      }

      // Check for timestamps
      const timestampMatch = cleanLine.match(PATTERNS.timestamp);
      if (timestampMatch) {
        if (currentPosition < i) {
          blocks.push({
            type: 'text',
            start: currentPosition,
            end: i,
            content: lines.slice(currentPosition, i).join('\n'),
          });
        }

        blocks.push({
          type: 'timestamp',
          start: i,
          end: i + 1,
          content: line,
          timestamp: new Date(timestampMatch[1]),
        });

        currentPosition = i + 1;
        continue;
      }
    }
  }

  // Add remaining text
  if (currentPosition < lines.length) {
    if (inCodeBlock) {
      // Unclosed code block
      blocks.push({
        type: 'code',
        start: codeBlockStart,
        end: lines.length,
        content: lines.slice(codeBlockStart).join('\n'),
        language: codeLanguage,
      });
    } else {
      blocks.push({
        type: 'text',
        start: currentPosition,
        end: lines.length,
        content: lines.slice(currentPosition).join('\n'),
      });
    }
  }

  return blocks;
}

/**
 * Detect file paths and URLs in a text block
 */
export function detectLinks(text: string): Array<{
  type: 'file' | 'url';
  start: number;
  end: number;
  content: string;
  filePath?: string;
  lineNumber?: number;
  url?: string;
}> {
  const links: Array<{
    type: 'file' | 'url';
    start: number;
    end: number;
    content: string;
    filePath?: string;
    lineNumber?: number;
    url?: string;
  }> = [];

  const cleanText = stripAnsi(text);

  // Detect URLs
  let urlMatch;
  PATTERNS.url.lastIndex = 0;
  while ((urlMatch = PATTERNS.url.exec(cleanText)) !== null) {
    links.push({
      type: 'url',
      start: urlMatch.index,
      end: urlMatch.index + urlMatch[0].length,
      content: urlMatch[0],
      url: urlMatch[0],
    });
  }

  // Detect file paths
  let fileMatch: RegExpExecArray | null;
  PATTERNS.filePath.lastIndex = 0;
  while ((fileMatch = PATTERNS.filePath.exec(cleanText)) !== null) {
    // Skip if this overlaps with a URL
    const overlaps = links.some(
      (link) =>
        link.type === 'url' &&
        !(fileMatch!.index >= link.end || fileMatch!.index + fileMatch![0].length <= link.start)
    );

    if (!overlaps) {
      links.push({
        type: 'file',
        start: fileMatch.index,
        end: fileMatch.index + fileMatch[0].length,
        content: fileMatch[0],
        filePath: fileMatch[1],
        lineNumber: fileMatch[2] ? parseInt(fileMatch[2], 10) : undefined,
      });
    }
  }

  // Sort by position
  links.sort((a, b) => a.start - b.start);

  return links;
}

/**
 * Find foldable sections (long output blocks)
 */
export function findFoldableSections(
  lines: string[],
  minLineCount: number = 20
): FoldableSection[] {
  const sections: FoldableSection[] = [];
  let consecutiveTextLines = 0;
  let sectionStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const cleanLine = stripAnsi(lines[i]);

    // Skip empty lines for threshold, but include in section
    if (cleanLine.trim() === '') {
      continue;
    }

    // Check for code block markers
    if (cleanLine.match(PATTERNS.codeBlockStart) || cleanLine.match(PATTERNS.codeBlockEnd)) {
      if (sectionStart >= 0 && i - sectionStart >= minLineCount) {
        sections.push(createFoldableSection(sectionStart, i - 1, lines));
      }
      sectionStart = -1;
      consecutiveTextLines = 0;
      continue;
    }

    if (sectionStart < 0) {
      sectionStart = i;
    }
    consecutiveTextLines++;
  }

  // Check if we have an ongoing section
  if (sectionStart >= 0 && lines.length - sectionStart >= minLineCount) {
    sections.push(createFoldableSection(sectionStart, lines.length - 1, lines));
  }

  return sections;
}

function createFoldableSection(
  startLine: number,
  endLine: number,
  lines: string[]
): FoldableSection {
  const previewLines = lines.slice(startLine, startLine + 3);
  return {
    id: `fold-${startLine}-${endLine}`,
    startLine,
    endLine,
    lineCount: endLine - startLine + 1,
    isFolded: false,
    preview: previewLines.map((l) => stripAnsi(l)).join('\n'),
  };
}

/**
 * Get language for syntax highlighting
 */
export function getLanguageClass(language: string): string {
  const langMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'jsx',
    tsx: 'tsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    rb: 'ruby',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    sql: 'sql',
    xml: 'xml',
  };

  return langMap[language.toLowerCase()] || language || 'text';
}
