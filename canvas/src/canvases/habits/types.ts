// Habits Canvas - Type Definitions

export interface HabitsConfig {
  mode?: "habits";
  title?: string;
  filePath?: string; // Where to save habits (default: ~/.claude-canvas/habits.json)
  autoSave?: boolean; // Auto-save on changes (default: true)
}

export interface HabitsResult {
  action: "save" | "close" | "cancel";
  habitsCount?: number;
  filePath?: string;
  data?: unknown;
}

// Habit category
export type HabitCategory =
  | "health"
  | "productivity"
  | "learning"
  | "fitness"
  | "mindfulness"
  | "social"
  | "creative"
  | "other";

// Category metadata
export const CATEGORY_INFO: Record<
  HabitCategory,
  { icon: string; color: string }
> = {
  health: { icon: "H", color: "green" },
  productivity: { icon: "P", color: "cyan" },
  learning: { icon: "L", color: "blue" },
  fitness: { icon: "F", color: "red" },
  mindfulness: { icon: "M", color: "magenta" },
  social: { icon: "S", color: "yellow" },
  creative: { icon: "C", color: "magentaBright" },
  other: { icon: "O", color: "gray" },
};

// Individual habit structure
export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  description?: string;
  createdAt: Date;
  // Completion records: ISO date string (YYYY-MM-DD) -> boolean
  completions: Record<string, boolean>;
}

// Serialized habit for file storage
export interface SerializedHabit {
  id: string;
  name: string;
  category: HabitCategory;
  description?: string;
  createdAt: string;
  completions: Record<string, boolean>;
}

// Serialized data structure
export interface HabitsData {
  version: number;
  habits: SerializedHabit[];
}

// View modes
export type ViewMode = "list" | "create" | "edit" | "delete";

// Week day names
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Canvas color palette
export const HABIT_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "green",
  secondary: "magenta",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  bg: "black",
  // Completion colors
  done: "green",
  missed: "red",
  pending: "gray",
  future: "gray",
} as const;
