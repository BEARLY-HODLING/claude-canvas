// File Browser Canvas - Type Definitions

/**
 * Configuration for the Files canvas
 */
export interface FilesConfig {
  mode?: "files";
  title?: string;
  startPath?: string; // Starting directory path
  showHidden?: boolean; // Show hidden files (default: false)
  sortBy?: "name" | "size" | "modified" | "type";
  sortAscending?: boolean;
  previewLines?: number; // Lines to preview (default: 50)
}

/**
 * Re-export file types from service
 */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  permissions: string;
}

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
 * Result returned from files canvas actions
 */
export interface FilesResult {
  action: "close" | "select" | "open" | "navigate";
  path?: string;
  data?: unknown;
}

/**
 * Sort menu state
 */
export interface SortMenuState {
  visible: boolean;
  selected: number;
}

/**
 * Search state
 */
export interface SearchState {
  visible: boolean;
  query: string;
}

// Shared cyberpunk color palette
export const FILES_COLORS = {
  // File type colors
  directory: "cyan",
  executable: "green",
  symlink: "magenta",
  archive: "yellow",
  image: "magenta",
  code: "blue",
  document: "white",

  // UI colors (matching system.tsx cyber theme)
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  neonBlue: "blue",
  dim: "gray",
  bg: "black",
} as const;

export type FilesColor = keyof typeof FILES_COLORS;
