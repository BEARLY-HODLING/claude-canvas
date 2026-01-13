// Notes Canvas - Type Definitions

export interface NotesConfig {
  mode?: "notes";
  title?: string;
  filePath?: string; // Where to save notes (default: ~/.canvas-notes.md)
  autoSave?: boolean; // Auto-save on quit (default: true)
  autoSaveInterval?: number; // Seconds between auto-saves (default: 30)
}

export interface NotesResult {
  action: "save" | "close" | "cancel";
  notesCount?: number;
  filePath?: string;
  data?: unknown;
}

// Individual note structure
export interface Note {
  id: string;
  title: string; // First line of content
  content: string; // Full content
  createdAt: Date;
  updatedAt: Date;
}

// Serialized note for file storage (ISO date strings)
export interface SerializedNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// View modes
export type ViewMode = "list" | "edit" | "search";

// Canvas color palette
export const NOTE_COLORS = {
  accent: "yellow",
  accentDim: "yellowBright",
  primary: "cyan",
  secondary: "magenta",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  bg: "black",
} as const;
