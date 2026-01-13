// Log Viewer Canvas - Type Definitions

import type { LogLevel } from "../../services/logs";

export interface LogsConfig {
  mode?: "logs";
  title?: string;
  files?: string[]; // Files to watch (can be multiple)
  filter?: string; // Initial regex filter pattern
  followMode?: boolean; // Auto-scroll to bottom
  maxLines?: number; // Max lines to keep in memory (default: 5000)
  showTimestamp?: boolean; // Show extracted timestamps
  showLineNumbers?: boolean; // Show line numbers
  levelFilter?: LogLevel[]; // Filter by log levels
}

export interface LogLine {
  content: string;
  level: LogLevel;
  timestamp: string | null;
  lineNumber: number;
}

export interface LogsResult {
  action: "close" | "error" | "file-opened";
  data?: unknown;
}

// Color scheme matching other canvases
export const LOG_COLORS = {
  // Log level colors
  ERROR: "red",
  WARN: "yellow",
  INFO: "cyan",
  DEBUG: "gray",
  UNKNOWN: "white",

  // UI colors (matching system.tsx cyber theme)
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;

export type LogColor = keyof typeof LOG_COLORS;
