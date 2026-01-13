// Kanban Canvas - Type Definitions

export interface KanbanConfig {
  mode?: "kanban";
  title?: string;
  filePath?: string; // Where to save kanban data (default: ~/.claude-canvas/kanban.json)
  boardId?: string; // Specific board to load
  autoSave?: boolean; // Auto-save on changes (default: true)
  autoSaveInterval?: number; // Seconds between auto-saves (default: 30)
}

export interface KanbanResult {
  action: "save" | "close" | "cancel";
  boardId?: string;
  cardCount?: number;
  filePath?: string;
  data?: unknown;
}

// Card priority levels
export type Priority = "low" | "medium" | "high" | "urgent";

// Column types for the board
export type ColumnType = "todo" | "in_progress" | "done";

// Individual card structure
export interface Card {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  column: ColumnType;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  tags?: string[];
}

// Serialized card for file storage (ISO date strings)
export interface SerializedCard {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  column: ColumnType;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags?: string[];
}

// Kanban board structure
export interface Board {
  id: string;
  name: string;
  cards: Card[];
  createdAt: Date;
  updatedAt: Date;
}

// Serialized board for storage
export interface SerializedBoard {
  id: string;
  name: string;
  cards: SerializedCard[];
  createdAt: string;
  updatedAt: string;
}

// Storage format
export interface KanbanStore {
  version: number;
  boards: SerializedBoard[];
  activeBoard?: string;
}

// View modes
export type ViewMode =
  | "board"
  | "add"
  | "edit"
  | "delete"
  | "board-select"
  | "board-add";

// Column configuration
export const COLUMNS: { type: ColumnType; label: string; emoji: string }[] = [
  { type: "todo", label: "Todo", emoji: "[ ]" },
  { type: "in_progress", label: "In Progress", emoji: "[~]" },
  { type: "done", label: "Done", emoji: "[x]" },
];

// Priority colors and labels
export const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; label: string; symbol: string }
> = {
  low: { color: "gray", label: "Low", symbol: "." },
  medium: { color: "cyan", label: "Medium", symbol: "-" },
  high: { color: "yellow", label: "High", symbol: "!" },
  urgent: { color: "red", label: "Urgent", symbol: "!!" },
};

// Canvas color palette
export const KANBAN_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "white",
  secondary: "magenta",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  bg: "black",
  todoColumn: "blue",
  progressColumn: "yellow",
  doneColumn: "green",
} as const;
