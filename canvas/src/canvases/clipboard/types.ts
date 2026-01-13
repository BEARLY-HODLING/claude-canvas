// Clipboard Canvas - Type Definitions

/**
 * Type of clipboard content
 */
export type ClipboardContentType = "text" | "image" | "file";

/**
 * Configuration for the Clipboard canvas
 */
export interface ClipboardConfig {
  mode?: "clipboard";
  title?: string;
  maxHistory?: number; // Max entries to keep (default: 50)
  pollInterval?: number; // Milliseconds between clipboard checks (default: 1000)
}

/**
 * Result from the Clipboard canvas
 */
export interface ClipboardResult {
  action: "copy" | "close" | "cancel" | "clear";
  data?: {
    content?: string;
    entriesCount?: number;
  };
}

/**
 * A single clipboard history entry
 */
export interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: Date;
  type: ClipboardContentType;
  preview?: string; // Truncated preview for display
  size?: number; // Size in bytes
}

/**
 * View modes for the canvas
 */
export type ViewMode = "list" | "search" | "preview";

/**
 * Color palette for the Clipboard canvas
 */
export const CLIPBOARD_COLORS = {
  // Primary accent colors
  accent: "cyan",
  accentBright: "cyanBright",
  primary: "blue",
  secondary: "magenta",

  // Semantic colors
  success: "green",
  warning: "yellow",
  danger: "red",
  info: "cyan",

  // Type-specific colors
  text: "white",
  image: "magenta",
  file: "yellow",

  // UI elements
  muted: "gray",
  dim: "gray",
  bg: "black",

  // Neon theme (matching other canvases)
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
} as const;

export type ClipboardColor = keyof typeof CLIPBOARD_COLORS;
