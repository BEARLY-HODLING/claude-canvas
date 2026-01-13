// File Browser Service - Directory listing and file operations
// Uses Bun.file for file operations

import { readdir, stat } from "fs/promises";
import { join, extname, basename } from "path";

/**
 * File entry in directory listing
 */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  permissions: string;
}

/**
 * Detailed file information
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
  extension: string | null;
  permissions: string;
  isSymlink: boolean;
}

/**
 * Convert mode to rwx permission string
 */
function formatPermissions(mode: number): string {
  const perms = [
    mode & 0o400 ? "r" : "-",
    mode & 0o200 ? "w" : "-",
    mode & 0o100 ? "x" : "-",
    mode & 0o040 ? "r" : "-",
    mode & 0o020 ? "w" : "-",
    mode & 0o010 ? "x" : "-",
    mode & 0o004 ? "r" : "-",
    mode & 0o002 ? "w" : "-",
    mode & 0o001 ? "x" : "-",
  ];
  return perms.join("");
}

/**
 * List directory contents
 */
export async function listDirectory(
  path: string,
  showHidden: boolean = false,
): Promise<FileEntry[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const files: FileEntry[] = [];

    for (const entry of entries) {
      // Skip hidden files unless requested
      if (!showHidden && entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = join(path, entry.name);

      try {
        const stats = await stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
          permissions: formatPermissions(stats.mode),
        });
      } catch {
        // Skip files we can't stat (permission denied, etc.)
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: 0,
          modified: new Date(),
          permissions: "---------",
        });
      }
    }

    return files;
  } catch (err) {
    throw new Error(`Failed to list directory: ${(err as Error).message}`);
  }
}

/**
 * Get detailed file information
 */
export async function getFileInfo(path: string): Promise<FileInfo> {
  try {
    const stats = await stat(path);
    const name = basename(path);
    const ext = extname(name);

    return {
      name,
      path,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      extension: ext ? ext.slice(1) : null, // Remove leading dot
      permissions: formatPermissions(stats.mode),
      isSymlink: stats.isSymbolicLink(),
    };
  } catch (err) {
    throw new Error(`Failed to get file info: ${(err as Error).message}`);
  }
}

/**
 * Read first N lines of a file for preview
 */
export async function readFilePreview(
  path: string,
  lines: number = 50,
): Promise<string[]> {
  try {
    const file = Bun.file(path);
    const exists = await file.exists();

    if (!exists) {
      return [];
    }

    // Check if file is binary by reading first chunk
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for binary content (null bytes in first 8KB)
    const checkLength = Math.min(8192, bytes.length);
    for (let i = 0; i < checkLength; i++) {
      if (bytes[i] === 0) {
        // Binary file
        return [];
      }
    }

    const text = await file.text();
    const allLines = text.split("\n");

    // Return first N lines
    return allLines.slice(0, lines);
  } catch {
    return [];
  }
}

/**
 * Check if file is likely a text file based on extension
 */
export function isTextFile(path: string): boolean {
  const textExtensions = new Set([
    // Code
    "js",
    "ts",
    "jsx",
    "tsx",
    "py",
    "rb",
    "go",
    "rs",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "swift",
    "kt",
    "scala",
    "php",
    "pl",
    "sh",
    "bash",
    "zsh",
    "fish",
    // Config
    "json",
    "yaml",
    "yml",
    "toml",
    "xml",
    "ini",
    "conf",
    "cfg",
    "env",
    // Markup
    "md",
    "markdown",
    "txt",
    "rst",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    // Data
    "csv",
    "tsv",
    "sql",
    "log",
    // Misc
    "gitignore",
    "dockerignore",
    "editorconfig",
    "eslintrc",
    "prettierrc",
    "babelrc",
    "makefile",
    "dockerfile",
  ]);

  const ext = extname(path).toLowerCase().slice(1);
  return textExtensions.has(ext);
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
 * Format date for display
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Same day - show time only
  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Within a week - show day and time
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Same year - show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  // Different year - show full date
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Sort files with directories first
 */
export function sortFiles(
  files: FileEntry[],
  sortBy: "name" | "size" | "modified" | "type" = "name",
  ascending: boolean = true,
): FileEntry[] {
  const sorted = [...files].sort((a, b) => {
    // Directories always come first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
        break;
      case "size":
        comparison = a.size - b.size;
        break;
      case "modified":
        comparison = a.modified.getTime() - b.modified.getTime();
        break;
      case "type": {
        const extA = extname(a.name).toLowerCase();
        const extB = extname(b.name).toLowerCase();
        comparison = extA.localeCompare(extB);
        break;
      }
    }

    return ascending ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get file type icon
 */
export function getFileIcon(entry: FileEntry): string {
  if (entry.isDirectory) return "\uD83D\uDCC1"; // folder

  const ext = extname(entry.name).toLowerCase().slice(1);

  // Common file types
  const icons: Record<string, string> = {
    // Code
    js: "\uD83D\uDFE8",
    ts: "\uD83D\uDFE6",
    jsx: "\u2699",
    tsx: "\u2699",
    py: "\uD83D\uDC0D",
    rb: "\uD83D\uDD34",
    go: "\uD83D\uDC39",
    rs: "\uD83E\uDD80",
    java: "\u2615",
    // Markup
    html: "\uD83C\uDF10",
    css: "\uD83C\uDFA8",
    md: "\uD83D\uDCDD",
    json: "\uD83D\uDCC4",
    yaml: "\uD83D\uDCCB",
    yml: "\uD83D\uDCCB",
    xml: "\uD83D\uDCC4",
    // Images
    png: "\uD83D\uDDBC",
    jpg: "\uD83D\uDDBC",
    jpeg: "\uD83D\uDDBC",
    gif: "\uD83D\uDDBC",
    svg: "\uD83D\uDDBC",
    // Archives
    zip: "\uD83D\uDCE6",
    tar: "\uD83D\uDCE6",
    gz: "\uD83D\uDCE6",
    // Documents
    pdf: "\uD83D\uDCC4",
    doc: "\uD83D\uDCC3",
    docx: "\uD83D\uDCC3",
    // Shell
    sh: "\uD83D\uDCDF",
    bash: "\uD83D\uDCDF",
    zsh: "\uD83D\uDCDF",
    // Logs
    log: "\uD83D\uDCDC",
    // Config
    env: "\u2699",
    gitignore: "\u2699",
  };

  return icons[ext] || "\uD83D\uDCC4"; // default file icon
}

/**
 * File browser service class
 */
export class FileService {
  private currentPath: string;
  private history: string[] = [];
  private historyIndex: number = -1;

  constructor(startPath: string = process.env.HOME || "/") {
    this.currentPath = startPath;
    this.history.push(startPath);
    this.historyIndex = 0;
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.currentPath;
  }

  /**
   * Navigate to a directory
   */
  async navigateTo(path: string): Promise<FileEntry[]> {
    // Verify it's a directory
    const info = await getFileInfo(path);
    if (!info.isDirectory) {
      throw new Error("Not a directory");
    }

    // Update history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(path);
    this.historyIndex = this.history.length - 1;

    this.currentPath = path;
    return this.list();
  }

  /**
   * Go to parent directory
   */
  async navigateUp(): Promise<FileEntry[]> {
    const parent = join(this.currentPath, "..");
    return this.navigateTo(parent);
  }

  /**
   * Go back in history
   */
  async goBack(): Promise<FileEntry[] | null> {
    if (this.historyIndex <= 0) return null;
    this.historyIndex--;
    const path = this.history[this.historyIndex];
    if (!path) return null;
    this.currentPath = path;
    return this.list();
  }

  /**
   * Go forward in history
   */
  async goForward(): Promise<FileEntry[] | null> {
    if (this.historyIndex >= this.history.length - 1) return null;
    this.historyIndex++;
    const path = this.history[this.historyIndex];
    if (!path) return null;
    this.currentPath = path;
    return this.list();
  }

  /**
   * List current directory
   */
  async list(showHidden: boolean = false): Promise<FileEntry[]> {
    return listDirectory(this.currentPath, showHidden);
  }

  /**
   * Get file info
   */
  async getInfo(path: string): Promise<FileInfo> {
    return getFileInfo(path);
  }

  /**
   * Get file preview
   */
  async preview(path: string, lines: number = 50): Promise<string[]> {
    return readFilePreview(path, lines);
  }
}

// Default service instance
export const fileService = new FileService();
