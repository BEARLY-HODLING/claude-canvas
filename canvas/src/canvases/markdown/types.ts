// Markdown Preview Canvas - Type Definitions

/**
 * Configuration for the Markdown canvas
 */
export interface MarkdownConfig {
  mode?: "markdown";
  title?: string;
  filePath?: string; // Path to markdown file to preview
  content?: string; // Direct markdown content (alternative to filePath)
  showLineNumbers?: boolean; // Show line numbers (default: true)
  syntaxHighlighting?: boolean; // Enable syntax highlighting for code blocks (default: true)
  wrapLines?: boolean; // Word wrap long lines (default: true)
}

/**
 * Result returned from markdown canvas actions
 */
export interface MarkdownResult {
  action: "close" | "navigate" | "search";
  filePath?: string;
  data?: unknown;
}

/**
 * View modes for the markdown canvas
 */
export type MarkdownViewMode = "preview" | "search" | "toc" | "fileInput";

/**
 * Scroll state
 */
export interface ScrollState {
  offset: number;
  maxOffset: number;
  viewportHeight: number;
}

/**
 * Search state
 */
export interface SearchState {
  query: string;
  matches: {
    lineNumber: number;
    columnStart: number;
    columnEnd: number;
    matchText: string;
    context: string;
  }[];
  currentMatch: number;
  caseSensitive: boolean;
}

/**
 * Table of contents entry
 */
export interface TocEntry {
  level: number;
  text: string;
  lineNumber: number;
}

// Canvas color palette (matching cyberpunk theme)
export const MARKDOWN_COLORS = {
  // UI colors
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "magenta",
  secondary: "yellow",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  bg: "black",

  // Markdown element colors
  heading1: "cyan",
  heading2: "cyan",
  heading3: "magenta",
  heading4: "yellow",
  code: "green",
  codeBlock: "green",
  link: "blue",
  blockquote: "gray",
  list: "cyan",
  bold: "white",
  italic: "white",
  highlight: "yellowBright",
  searchMatch: "yellowBright",
} as const;

export type MarkdownColor = keyof typeof MARKDOWN_COLORS;
