// Log Viewer Service - File reading, tailing, and watching
// Uses Bun.file for file operations

import { watch as fsWatch, type FSWatcher } from "fs";
import { stat } from "fs/promises";

/**
 * Log level detection
 */
export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "UNKNOWN";

/**
 * Log line with parsed metadata
 */
export interface LogLine {
  content: string;
  level: LogLevel;
  timestamp: string | null;
  lineNumber: number;
}

/**
 * File watcher handle
 */
export interface Watcher {
  close: () => void;
}

/**
 * File info
 */
export interface FileInfo {
  exists: boolean;
  size: number;
  lastModified: Date | null;
  error: string | null;
}

/**
 * Detect log level from line content
 */
export function detectLogLevel(line: string): LogLevel {
  const upper = line.toUpperCase();

  // Check for common log level patterns
  if (
    /\bERROR\b|\bERR\b|\bFATAL\b|\bCRIT(ICAL)?\b|\bFAILED\b|\bFAILURE\b/.test(
      upper,
    )
  ) {
    return "ERROR";
  }
  if (/\bWARN(ING)?\b/.test(upper)) {
    return "WARN";
  }
  if (/\bINFO\b|\bNOTICE\b/.test(upper)) {
    return "INFO";
  }
  if (/\bDEBUG\b|\bTRACE\b|\bVERBOSE\b/.test(upper)) {
    return "DEBUG";
  }

  return "UNKNOWN";
}

/**
 * Extract timestamp from log line
 * Supports various common formats
 */
export function extractTimestamp(line: string): string | null {
  // ISO 8601: 2024-01-15T10:30:45.123Z
  const isoMatch = line.match(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/,
  );
  if (isoMatch) return isoMatch[0];

  // Common log format: 2024-01-15 10:30:45
  const commonMatch = line.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  if (commonMatch) return commonMatch[0];

  // Syslog format: Jan 15 10:30:45
  const syslogMatch = line.match(/[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/);
  if (syslogMatch) return syslogMatch[0];

  // Time only: 10:30:45
  const timeMatch = line.match(/\d{2}:\d{2}:\d{2}(\.\d{3})?/);
  if (timeMatch) return timeMatch[0];

  return null;
}

/**
 * Parse a raw line into a LogLine with metadata
 */
export function parseLine(content: string, lineNumber: number): LogLine {
  return {
    content,
    level: detectLogLevel(content),
    timestamp: extractTimestamp(content),
    lineNumber,
  };
}

/**
 * Get file information
 */
export async function getFileInfo(path: string): Promise<FileInfo> {
  try {
    const file = Bun.file(path);
    const exists = await file.exists();

    if (!exists) {
      return {
        exists: false,
        size: 0,
        lastModified: null,
        error: "File not found",
      };
    }

    const stats = await stat(path);
    return {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime,
      error: null,
    };
  } catch (err) {
    return {
      exists: false,
      size: 0,
      lastModified: null,
      error: (err as Error).message,
    };
  }
}

/**
 * Read last N lines from a file (tail)
 */
export async function tailFile(path: string, lines: number): Promise<string[]> {
  try {
    const file = Bun.file(path);
    const exists = await file.exists();

    if (!exists) {
      return [];
    }

    const text = await file.text();
    const allLines = text.split("\n");

    // Remove empty last line if file ends with newline
    if (allLines.length > 0 && allLines[allLines.length - 1] === "") {
      allLines.pop();
    }

    // Return last N lines
    return allLines.slice(-lines);
  } catch {
    return [];
  }
}

/**
 * Read all lines from a file
 */
export async function readAllLines(path: string): Promise<string[]> {
  try {
    const file = Bun.file(path);
    const exists = await file.exists();

    if (!exists) {
      return [];
    }

    const text = await file.text();
    const allLines = text.split("\n");

    // Remove empty last line if file ends with newline
    if (allLines.length > 0 && allLines[allLines.length - 1] === "") {
      allLines.pop();
    }

    return allLines;
  } catch {
    return [];
  }
}

/**
 * Watch a file for changes
 * Calls callback with new lines when file changes
 */
export function watchFile(
  path: string,
  callback: (newLines: string[]) => void,
): Watcher {
  let lastSize = 0;
  let watcher: FSWatcher | null = null;

  // Initialize with current file size
  const initSize = async () => {
    try {
      const file = Bun.file(path);
      if (await file.exists()) {
        const stats = await stat(path);
        lastSize = stats.size;
      }
    } catch {
      lastSize = 0;
    }
  };

  initSize();

  // Watch for file changes
  try {
    watcher = fsWatch(path, async (eventType) => {
      if (eventType === "change") {
        try {
          const file = Bun.file(path);
          if (!(await file.exists())) return;

          const stats = await stat(path);

          // File was truncated or replaced
          if (stats.size < lastSize) {
            lastSize = 0;
          }

          // Read new content if file grew
          if (stats.size > lastSize) {
            // Read the new portion
            const text = await file.text();
            const allLines = text.split("\n");

            // Calculate how many bytes we need to skip
            const newText = text.slice(lastSize);
            const newLines = newText.split("\n").filter((line) => line !== "");

            if (newLines.length > 0) {
              callback(newLines);
            }

            lastSize = stats.size;
          }
        } catch {
          // File may have been deleted
        }
      }
    });
  } catch {
    // File doesn't exist yet or can't be watched
  }

  return {
    close: () => {
      watcher?.close();
    },
  };
}

/**
 * Filter lines by regex pattern
 */
export function filterLines(lines: string[], pattern: string): string[] {
  if (!pattern) return lines;

  try {
    const regex = new RegExp(pattern, "i");
    return lines.filter((line) => regex.test(line));
  } catch {
    // Invalid regex, fall back to simple string match
    const lowerPattern = pattern.toLowerCase();
    return lines.filter((line) => line.toLowerCase().includes(lowerPattern));
  }
}

/**
 * Filter LogLines by regex pattern
 */
export function filterLogLines(lines: LogLine[], pattern: string): LogLine[] {
  if (!pattern) return lines;

  try {
    const regex = new RegExp(pattern, "i");
    return lines.filter((line) => regex.test(line.content));
  } catch {
    // Invalid regex, fall back to simple string match
    const lowerPattern = pattern.toLowerCase();
    return lines.filter((line) =>
      line.content.toLowerCase().includes(lowerPattern),
    );
  }
}

/**
 * Filter LogLines by log level
 */
export function filterByLevel(lines: LogLine[], levels: LogLevel[]): LogLine[] {
  if (levels.length === 0) return lines;
  return lines.filter((line) => levels.includes(line.level));
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

/**
 * Log viewer service class
 */
export class LogService {
  private watchers: Map<string, Watcher> = new Map();

  /**
   * Get file info
   */
  async getInfo(path: string): Promise<FileInfo> {
    return getFileInfo(path);
  }

  /**
   * Tail a file
   */
  async tail(path: string, lines: number = 100): Promise<LogLine[]> {
    const rawLines = await tailFile(path, lines);
    const startLineNumber = Math.max(1, rawLines.length - lines + 1);

    return rawLines.map((content, index) =>
      parseLine(content, startLineNumber + index),
    );
  }

  /**
   * Read all lines from a file
   */
  async readAll(path: string): Promise<LogLine[]> {
    const rawLines = await readAllLines(path);
    return rawLines.map((content, index) => parseLine(content, index + 1));
  }

  /**
   * Watch a file
   */
  watch(path: string, callback: (newLines: LogLine[]) => void): void {
    // Stop existing watcher for this path
    this.unwatch(path);

    const watcher = watchFile(path, (newRawLines) => {
      // We don't know the exact line numbers for new lines in watch mode
      // Just use 0 as placeholder since real-time logs scroll anyway
      const newLines = newRawLines.map((content, index) =>
        parseLine(content, 0),
      );
      callback(newLines);
    });

    this.watchers.set(path, watcher);
  }

  /**
   * Stop watching a file
   */
  unwatch(path: string): void {
    const watcher = this.watchers.get(path);
    if (watcher) {
      watcher.close();
      this.watchers.delete(path);
    }
  }

  /**
   * Stop all watchers
   */
  unwatchAll(): void {
    Array.from(this.watchers.values()).forEach((watcher) => {
      watcher.close();
    });
    this.watchers.clear();
  }
}

// Default service instance
export const logService = new LogService();
