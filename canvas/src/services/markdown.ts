// Markdown Parsing Service - Parse markdown to styled terminal output
// Uses Bun.file for file operations

import { extname } from "path";

/**
 * Parsed markdown element types
 */
export type MarkdownElementType =
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "paragraph"
  | "codeBlock"
  | "inlineCode"
  | "list"
  | "orderedList"
  | "blockquote"
  | "horizontalRule"
  | "link"
  | "image"
  | "bold"
  | "italic"
  | "strikethrough"
  | "text"
  | "blank";

/**
 * Style definition for terminal rendering
 */
export interface TerminalStyle {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
}

/**
 * A styled segment of text
 */
export interface StyledSegment {
  text: string;
  style: TerminalStyle;
  type: MarkdownElementType;
}

/**
 * A rendered line with multiple segments
 */
export interface RenderedLine {
  lineNumber: number;
  segments: StyledSegment[];
  indent: number;
  isBlank: boolean;
  sourceLineStart: number; // Original line number in source
  sourceLineEnd: number;
}

/**
 * Parsed markdown document
 */
export interface ParsedDocument {
  lines: RenderedLine[];
  totalLines: number;
  title: string;
  headings: { level: number; text: string; lineNumber: number }[];
}

/**
 * Search match result
 */
export interface SearchMatch {
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  matchText: string;
  context: string;
}

// Style presets for different element types
export const MARKDOWN_STYLES: Record<MarkdownElementType, TerminalStyle> = {
  heading1: { color: "cyan", bold: true },
  heading2: { color: "cyan", bold: true },
  heading3: { color: "magenta", bold: true },
  heading4: { color: "yellow", bold: true },
  paragraph: { color: "white" },
  codeBlock: { color: "green", backgroundColor: "blackBright" },
  inlineCode: { color: "green", backgroundColor: "blackBright" },
  list: { color: "white" },
  orderedList: { color: "white" },
  blockquote: { color: "gray", italic: true },
  horizontalRule: { color: "gray", dim: true },
  link: { color: "blue", underline: true },
  image: { color: "magenta" },
  bold: { bold: true },
  italic: { italic: true },
  strikethrough: { strikethrough: true, dim: true },
  text: { color: "white" },
  blank: {},
};

// Language-specific syntax highlighting colors
export const SYNTAX_COLORS: Record<string, string> = {
  keyword: "magenta",
  string: "green",
  number: "yellow",
  comment: "gray",
  function: "blue",
  variable: "cyan",
  operator: "white",
  type: "yellow",
  builtin: "cyan",
};

// Common keywords for basic syntax highlighting
const KEYWORDS: Record<string, Set<string>> = {
  javascript: new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "class",
    "import",
    "export",
    "from",
    "async",
    "await",
    "try",
    "catch",
    "throw",
    "new",
    "this",
    "true",
    "false",
    "null",
    "undefined",
  ]),
  typescript: new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "class",
    "import",
    "export",
    "from",
    "async",
    "await",
    "try",
    "catch",
    "throw",
    "new",
    "this",
    "true",
    "false",
    "null",
    "undefined",
    "interface",
    "type",
    "enum",
    "implements",
    "extends",
    "public",
    "private",
    "protected",
  ]),
  python: new Set([
    "def",
    "class",
    "import",
    "from",
    "return",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "try",
    "except",
    "finally",
    "with",
    "as",
    "lambda",
    "True",
    "False",
    "None",
    "and",
    "or",
    "not",
    "in",
    "is",
    "pass",
    "break",
    "continue",
  ]),
  go: new Set([
    "func",
    "package",
    "import",
    "return",
    "if",
    "else",
    "for",
    "range",
    "switch",
    "case",
    "default",
    "struct",
    "interface",
    "type",
    "var",
    "const",
    "true",
    "false",
    "nil",
    "go",
    "defer",
    "chan",
  ]),
  rust: new Set([
    "fn",
    "let",
    "mut",
    "const",
    "pub",
    "struct",
    "enum",
    "impl",
    "trait",
    "use",
    "mod",
    "if",
    "else",
    "match",
    "for",
    "while",
    "loop",
    "return",
    "true",
    "false",
    "self",
    "Self",
  ]),
  bash: new Set([
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "while",
    "do",
    "done",
    "case",
    "esac",
    "function",
    "return",
    "export",
    "local",
    "echo",
    "exit",
  ]),
};

/**
 * Apply basic syntax highlighting to code
 */
function highlightCode(code: string, language: string): StyledSegment[] {
  const segments: StyledSegment[] = [];
  const keywords = KEYWORDS[language] || KEYWORDS["javascript"] || new Set();

  // Simple tokenizer - split by word boundaries while preserving structure
  const tokenPattern =
    /(\s+|"[^"]*"|'[^']*'|`[^`]*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|\b\d+\.?\d*\b|\b[a-zA-Z_]\w*\b|[^\s\w]+)/g;

  let match;
  while ((match = tokenPattern.exec(code)) !== null) {
    const token = match[0];

    // Determine token type and style
    let style: TerminalStyle = { color: "white" };
    let type: MarkdownElementType = "text";

    if (/^\s+$/.test(token)) {
      // Whitespace - preserve as-is
      style = {};
    } else if (/^["'`]/.test(token)) {
      // String literal
      style = { color: SYNTAX_COLORS.string };
    } else if (/^(\/\/|#|\/\*)/.test(token)) {
      // Comment
      style = { color: SYNTAX_COLORS.comment, dim: true };
    } else if (/^\d/.test(token)) {
      // Number
      style = { color: SYNTAX_COLORS.number };
    } else if (keywords.has(token)) {
      // Keyword
      style = { color: SYNTAX_COLORS.keyword, bold: true };
    } else if (/^[a-zA-Z_]\w*$/.test(token)) {
      // Identifier
      style = { color: "white" };
    } else {
      // Operator or punctuation
      style = { color: SYNTAX_COLORS.operator };
    }

    segments.push({ text: token, style, type });
  }

  return segments;
}

/**
 * Parse inline markdown elements (bold, italic, code, links)
 */
function parseInlineMarkdown(text: string): StyledSegment[] {
  const segments: StyledSegment[] = [];

  // Combined regex for inline elements
  const inlinePattern =
    /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\!\[([^\]]*)\]\(([^)]+)\))/g;

  let lastEnd = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastEnd) {
      const beforeText = text.slice(lastEnd, match.index);
      segments.push({
        text: beforeText,
        style: MARKDOWN_STYLES.text,
        type: "text",
      });
    }

    // Bold + Italic ***text***
    if (match[2] !== undefined) {
      segments.push({
        text: match[2],
        style: { bold: true, italic: true },
        type: "bold",
      });
    }
    // Bold **text** or __text__
    else if (match[3] !== undefined) {
      segments.push({
        text: match[3],
        style: MARKDOWN_STYLES.bold,
        type: "bold",
      });
    } else if (match[5] !== undefined) {
      segments.push({
        text: match[5],
        style: MARKDOWN_STYLES.bold,
        type: "bold",
      });
    }
    // Italic *text* or _text_
    else if (match[4] !== undefined) {
      segments.push({
        text: match[4],
        style: MARKDOWN_STYLES.italic,
        type: "italic",
      });
    } else if (match[6] !== undefined) {
      segments.push({
        text: match[6],
        style: MARKDOWN_STYLES.italic,
        type: "italic",
      });
    }
    // Strikethrough ~~text~~
    else if (match[7] !== undefined) {
      segments.push({
        text: match[7],
        style: MARKDOWN_STYLES.strikethrough,
        type: "strikethrough",
      });
    }
    // Inline code `text`
    else if (match[8] !== undefined) {
      segments.push({
        text: match[8],
        style: MARKDOWN_STYLES.inlineCode,
        type: "inlineCode",
      });
    }
    // Link [text](url)
    else if (match[9] !== undefined && match[10] !== undefined) {
      segments.push({
        text: `${match[9]} (${match[10]})`,
        style: MARKDOWN_STYLES.link,
        type: "link",
      });
    }
    // Image ![alt](url)
    else if (match[11] !== undefined && match[12] !== undefined) {
      segments.push({
        text: `[IMG: ${match[11] || match[12]}]`,
        style: MARKDOWN_STYLES.image,
        type: "image",
      });
    }

    lastEnd = match.index + match[0].length;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    segments.push({
      text: text.slice(lastEnd),
      style: MARKDOWN_STYLES.text,
      type: "text",
    });
  }

  // If no segments, return the whole text
  if (segments.length === 0) {
    segments.push({
      text: text,
      style: MARKDOWN_STYLES.text,
      type: "text",
    });
  }

  return segments;
}

/**
 * Parse markdown content into styled lines
 */
export function parseMarkdown(
  content: string,
  terminalWidth: number = 80,
): ParsedDocument {
  const lines: RenderedLine[] = [];
  const headings: { level: number; text: string; lineNumber: number }[] = [];
  const sourceLines = content.split("\n");

  let lineNumber = 1;
  let i = 0;
  let title = "";

  while (i < sourceLines.length) {
    const line = sourceLines[i] || "";
    const trimmedLine = line.trim();

    // Blank line
    if (trimmedLine === "") {
      lines.push({
        lineNumber: lineNumber++,
        segments: [{ text: "", style: {}, type: "blank" }],
        indent: 0,
        isBlank: true,
        sourceLineStart: i + 1,
        sourceLineEnd: i + 1,
      });
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = Math.min(headingMatch[1].length, 4) as 1 | 2 | 3 | 4;
      const text = headingMatch[2];
      const headingType = `heading${level}` as MarkdownElementType;

      headings.push({ level, text, lineNumber });
      if (!title && level === 1) {
        title = text;
      }

      const prefix = "#".repeat(level) + " ";
      const segments: StyledSegment[] = [
        {
          text: prefix,
          style: { ...MARKDOWN_STYLES[headingType], dim: true },
          type: headingType,
        },
        ...parseInlineMarkdown(text).map((seg) => ({
          ...seg,
          style: { ...seg.style, ...MARKDOWN_STYLES[headingType] },
        })),
      ];

      lines.push({
        lineNumber: lineNumber++,
        segments,
        indent: 0,
        isBlank: false,
        sourceLineStart: i + 1,
        sourceLineEnd: i + 1,
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(trimmedLine)) {
      lines.push({
        lineNumber: lineNumber++,
        segments: [
          {
            text: "\u2500".repeat(Math.min(terminalWidth - 4, 60)),
            style: MARKDOWN_STYLES.horizontalRule,
            type: "horizontalRule",
          },
        ],
        indent: 0,
        isBlank: false,
        sourceLineStart: i + 1,
        sourceLineEnd: i + 1,
      });
      i++;
      continue;
    }

    // Code block
    if (trimmedLine.startsWith("```")) {
      const language = trimmedLine.slice(3).trim() || "text";
      const codeStartLine = i + 1;
      const codeLines: string[] = [];
      i++;

      while (i < sourceLines.length) {
        const codeLine = sourceLines[i];
        if (codeLine === undefined || codeLine.trim().startsWith("```")) {
          break;
        }
        codeLines.push(codeLine);
        i++;
      }

      // Skip closing ```
      const codeEndLine = i + 1;
      i++;

      // Render each code line with syntax highlighting
      for (const codeLine of codeLines) {
        const segments = highlightCode(codeLine, language);
        lines.push({
          lineNumber: lineNumber++,
          segments:
            segments.length > 0
              ? segments
              : [
                  {
                    text: codeLine,
                    style: MARKDOWN_STYLES.codeBlock,
                    type: "codeBlock",
                  },
                ],
          indent: 2,
          isBlank: false,
          sourceLineStart: codeStartLine,
          sourceLineEnd: codeEndLine,
        });
      }
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith(">")) {
      const quoteStartLine = i + 1;
      const quoteLines: string[] = [];

      while (i < sourceLines.length) {
        const quoteLine = sourceLines[i];
        if (
          quoteLine === undefined ||
          (!quoteLine.startsWith(">") &&
            quoteLine.trim() !== "" &&
            !quoteLine.startsWith(" "))
        ) {
          break;
        }
        if (quoteLine.trim() === "") {
          break;
        }
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        i++;
      }

      for (const quoteLine of quoteLines) {
        const segments: StyledSegment[] = [
          { text: "\u2502 ", style: { color: "gray" }, type: "blockquote" },
          ...parseInlineMarkdown(quoteLine).map((seg) => ({
            ...seg,
            style: { ...seg.style, ...MARKDOWN_STYLES.blockquote },
            type: "blockquote" as MarkdownElementType,
          })),
        ];
        lines.push({
          lineNumber: lineNumber++,
          segments,
          indent: 0,
          isBlank: false,
          sourceLineStart: quoteStartLine,
          sourceLineEnd: i,
        });
      }
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(trimmedLine)) {
      const listStartLine = i + 1;
      const text = trimmedLine.replace(/^[-*+]\s+/, "");
      const segments: StyledSegment[] = [
        { text: "\u2022 ", style: { color: "cyan" }, type: "list" },
        ...parseInlineMarkdown(text),
      ];
      lines.push({
        lineNumber: lineNumber++,
        segments,
        indent: 2,
        isBlank: false,
        sourceLineStart: listStartLine,
        sourceLineEnd: i + 1,
      });
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmedLine)) {
      const listStartLine = i + 1;
      const numMatch = trimmedLine.match(/^(\d+)\.\s/);
      const num = numMatch ? numMatch[1] : "1";
      const text = trimmedLine.replace(/^\d+\.\s+/, "");
      const segments: StyledSegment[] = [
        { text: `${num}. `, style: { color: "cyan" }, type: "orderedList" },
        ...parseInlineMarkdown(text),
      ];
      lines.push({
        lineNumber: lineNumber++,
        segments,
        indent: 2,
        isBlank: false,
        sourceLineStart: listStartLine,
        sourceLineEnd: i + 1,
      });
      i++;
      continue;
    }

    // Regular paragraph
    const paraStartLine = i + 1;
    const paraLines: string[] = [trimmedLine];
    i++;

    // Collect continuation lines for paragraph
    while (i < sourceLines.length) {
      const paraLine = sourceLines[i];
      if (
        paraLine === undefined ||
        paraLine.trim() === "" ||
        /^(#{1,6}\s|[-*_]{3,}|```|>|[-*+]\s|\d+\.\s)/.test(paraLine.trim())
      ) {
        break;
      }
      paraLines.push(paraLine.trim());
      i++;
    }

    const fullPara = paraLines.join(" ");
    const segments = parseInlineMarkdown(fullPara);
    lines.push({
      lineNumber: lineNumber++,
      segments,
      indent: 0,
      isBlank: false,
      sourceLineStart: paraStartLine,
      sourceLineEnd: i,
    });
  }

  return {
    lines,
    totalLines: lines.length,
    title: title || "Untitled Document",
    headings,
  };
}

/**
 * Search for text within parsed document
 */
export function searchDocument(
  document: ParsedDocument,
  query: string,
  caseSensitive: boolean = false,
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  if (!query) return matches;

  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (const line of document.lines) {
    // Build full line text
    const lineText = line.segments.map((s) => s.text).join("");
    const searchText = caseSensitive ? lineText : lineText.toLowerCase();

    let startIdx = 0;
    let matchIdx: number;

    while ((matchIdx = searchText.indexOf(searchQuery, startIdx)) !== -1) {
      matches.push({
        lineNumber: line.lineNumber,
        columnStart: matchIdx,
        columnEnd: matchIdx + query.length,
        matchText: lineText.slice(matchIdx, matchIdx + query.length),
        context: lineText.slice(
          Math.max(0, matchIdx - 20),
          Math.min(lineText.length, matchIdx + query.length + 20),
        ),
      });
      startIdx = matchIdx + 1;
    }
  }

  return matches;
}

/**
 * Read markdown file and parse it
 */
export async function readMarkdownFile(
  filePath: string,
): Promise<{ content: string; parsed: ParsedDocument } | null> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      return null;
    }

    // Check if it's a markdown file
    const ext = extname(filePath).toLowerCase();
    if (ext !== ".md" && ext !== ".markdown" && ext !== ".mdx") {
      // Still try to read, but warn
      console.warn(`File ${filePath} is not a markdown file`);
    }

    const content = await file.text();
    const parsed = parseMarkdown(content);

    return { content, parsed };
  } catch (error) {
    console.error(`Failed to read markdown file: ${error}`);
    return null;
  }
}

/**
 * Get table of contents from parsed document
 */
export function getTableOfContents(
  document: ParsedDocument,
): { level: number; text: string; lineNumber: number }[] {
  return document.headings;
}

/**
 * Word wrap a line of text
 */
export function wordWrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];

  const result: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= width) {
      result.push(remaining);
      break;
    }

    // Find last space within width
    let breakPoint = remaining.lastIndexOf(" ", width);
    if (breakPoint === -1 || breakPoint === 0) {
      breakPoint = width;
    }

    result.push(remaining.slice(0, breakPoint).trimEnd());
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return result;
}
