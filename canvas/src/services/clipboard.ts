// Clipboard Service - macOS clipboard monitoring and history
// Uses pbpaste/pbcopy for clipboard access

import { $ } from "bun";

/**
 * Type of clipboard content
 */
export type ClipboardContentType = "text" | "image" | "file";

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
 * Serialized clipboard entry for storage
 */
export interface SerializedClipboardEntry {
  id: string;
  content: string;
  timestamp: string;
  type: ClipboardContentType;
  preview?: string;
  size?: number;
}

/**
 * Clipboard watch callback type
 */
export type ClipboardWatchCallback = (entry: ClipboardEntry) => void;

/**
 * Generate unique ID for clipboard entries
 */
function generateId(): string {
  return `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a preview from content
 */
function createPreview(content: string, maxLength: number = 100): string {
  const singleLine = content.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return singleLine.slice(0, maxLength - 3) + "...";
}

/**
 * Detect content type based on content analysis
 */
function detectContentType(content: string): ClipboardContentType {
  // Check for file paths (macOS format)
  if (
    content.startsWith("/") &&
    !content.includes("\n") &&
    content.length < 500
  ) {
    // Could be a file path
    const parts = content.split("/");
    const lastPart = parts[parts.length - 1];
    if (parts.length > 1 && lastPart && lastPart.includes(".")) {
      return "file";
    }
  }

  // Check for image data (base64 encoded)
  if (
    content.startsWith("data:image") ||
    content.match(/^[A-Za-z0-9+/=]{100,}$/)
  ) {
    return "image";
  }

  return "text";
}

/**
 * Get current clipboard content using pbpaste
 */
export async function getCurrentClipboard(): Promise<string> {
  try {
    const result = await $`pbpaste`.text();
    return result;
  } catch (error) {
    // Empty clipboard or error
    return "";
  }
}

/**
 * Set clipboard content using pbcopy
 */
export async function setClipboard(text: string): Promise<void> {
  try {
    // Use echo with -n to avoid trailing newline
    const proc = Bun.spawn(["pbcopy"], {
      stdin: "pipe",
    });
    proc.stdin.write(text);
    proc.stdin.end();
    await proc.exited;
  } catch (error) {
    throw new Error(`Failed to set clipboard: ${error}`);
  }
}

/**
 * In-memory clipboard history store
 */
class ClipboardHistoryStore {
  private entries: ClipboardEntry[] = [];
  private maxEntries: number = 50;
  private watchInterval: ReturnType<typeof setInterval> | null = null;
  private lastContent: string = "";
  private callbacks: Set<ClipboardWatchCallback> = new Set();

  constructor(maxEntries: number = 50) {
    this.maxEntries = maxEntries;
  }

  /**
   * Set maximum history entries
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max;
    this.trimHistory();
  }

  /**
   * Get all history entries
   */
  getHistory(): ClipboardEntry[] {
    return [...this.entries];
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): ClipboardEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /**
   * Add a new entry to history
   */
  addEntry(content: string, type?: ClipboardContentType): ClipboardEntry {
    const entry: ClipboardEntry = {
      id: generateId(),
      content,
      timestamp: new Date(),
      type: type || detectContentType(content),
      preview: createPreview(content),
      size: new TextEncoder().encode(content).length,
    };

    // Add to beginning of array (newest first)
    this.entries.unshift(entry);
    this.trimHistory();

    // Notify callbacks
    this.callbacks.forEach((cb) => cb(entry));

    return entry;
  }

  /**
   * Remove an entry by ID
   */
  removeEntry(id: string): boolean {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.entries = [];
  }

  /**
   * Filter entries by search query
   */
  filterEntries(query: string): ClipboardEntry[] {
    if (!query.trim()) {
      return this.entries;
    }
    const lowerQuery = query.toLowerCase();
    return this.entries.filter(
      (e) =>
        e.content.toLowerCase().includes(lowerQuery) ||
        e.preview?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Trim history to max entries
   */
  private trimHistory(): void {
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }

  /**
   * Start watching clipboard for changes
   */
  startWatching(
    callback: ClipboardWatchCallback,
    pollInterval: number = 1000,
  ): () => void {
    this.callbacks.add(callback);

    // Start polling if not already running
    if (!this.watchInterval) {
      // Get initial content
      getCurrentClipboard().then((content) => {
        this.lastContent = content;
      });

      this.watchInterval = setInterval(async () => {
        try {
          const currentContent = await getCurrentClipboard();

          // Check if content changed
          if (currentContent && currentContent !== this.lastContent) {
            this.lastContent = currentContent;

            // Check for duplicate content (don't add if same as most recent)
            const firstEntry = this.entries[0];
            if (
              this.entries.length === 0 ||
              !firstEntry ||
              firstEntry.content !== currentContent
            ) {
              this.addEntry(currentContent);
            }
          }
        } catch (error) {
          // Ignore polling errors
        }
      }, pollInterval);
    }

    // Return cleanup function
    return () => {
      this.callbacks.delete(callback);

      // Stop watching if no more callbacks
      if (this.callbacks.size === 0 && this.watchInterval) {
        clearInterval(this.watchInterval);
        this.watchInterval = null;
      }
    };
  }

  /**
   * Stop all watching
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.callbacks.clear();
  }

  /**
   * Export history as JSON
   */
  exportHistory(): SerializedClipboardEntry[] {
    return this.entries.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    }));
  }

  /**
   * Import history from JSON
   */
  importHistory(entries: SerializedClipboardEntry[]): void {
    this.entries = entries.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
    this.trimHistory();
  }
}

// Singleton instance
export const clipboardHistory = new ClipboardHistoryStore();

/**
 * Watch clipboard for changes
 * @param callback Called when clipboard content changes
 * @param pollInterval Milliseconds between clipboard checks (default: 1000)
 * @returns Cleanup function to stop watching
 */
export function watchClipboard(
  callback: ClipboardWatchCallback,
  pollInterval: number = 1000,
): () => void {
  return clipboardHistory.startWatching(callback, pollInterval);
}

/**
 * Format bytes to human-readable size
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return "just now";
}
