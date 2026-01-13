// Bookmarks Canvas - Type Definitions

/**
 * Individual bookmark structure
 */
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folder?: string; // Optional folder for organization
  created: Date;
  lastVisited?: Date;
  visitCount: number;
}

/**
 * Serialized bookmark for file storage (ISO date strings)
 */
export interface SerializedBookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folder?: string;
  created: string;
  lastVisited?: string;
  visitCount: number;
}

/**
 * Bookmarks canvas configuration
 */
export interface BookmarksConfig {
  mode?: "bookmarks";
  title?: string;
  storePath?: string; // Where to save bookmarks (default: ~/.canvas-bookmarks.json)
}

/**
 * Bookmarks canvas result
 */
export interface BookmarksResult {
  action: "open" | "add" | "edit" | "delete" | "close" | "navigate";
  bookmark?: Bookmark;
  bookmarkCount?: number;
  data?: unknown;
}

/**
 * View modes for the canvas
 */
export type ViewMode = "list" | "add" | "edit" | "search" | "addTag";

/**
 * Folder structure for organized display
 */
export interface FolderView {
  name: string;
  bookmarks: Bookmark[];
  isExpanded: boolean;
}

// Canvas color palette (cyan/blue theme for bookmarks)
export const BOOKMARKS_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "blue",
  secondary: "magenta",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  tag: "yellow",
  folder: "cyan",
  bg: "black",
} as const;
