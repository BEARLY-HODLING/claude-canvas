// JSON Viewer Canvas - Type Definitions

/**
 * Configuration for the JSON viewer canvas
 */
export interface JSONConfig {
  mode?: "json";
  path?: string; // Path to JSON file (can also be selected via file picker)
  expandDepth?: number; // Initial expand depth (default: 1)
  showLineNumbers?: boolean; // Show line numbers (default: true)
  theme?: "dark" | "light"; // Color theme (default: dark)
}

/**
 * Result from JSON canvas actions
 */
export interface JSONResult {
  action: "close" | "copy" | "navigate" | "select";
  path?: string; // JSON path if applicable
  value?: unknown; // Copied or selected value
  data?: unknown;
}

/**
 * View modes for the JSON canvas
 */
export type ViewMode = "tree" | "raw" | "search";

/**
 * Panel focus state
 */
export type FocusPanel = "tree" | "search" | "info";

/**
 * Canvas color palette for JSON viewer
 */
export const JSON_COLORS = {
  // Syntax highlighting colors
  key: "cyan",
  string: "green",
  number: "yellow",
  boolean: "magenta",
  null: "gray",
  bracket: "white",

  // UI colors
  accent: "cyan",
  accentBright: "cyanBright",
  primary: "magenta",
  secondary: "yellow",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  bg: "black",

  // Tree structure colors
  line: "gray",
  expandIcon: "cyan",
  collapseIcon: "magenta",
  selected: "white",
  matchHighlight: "yellowBright",
} as const;

/**
 * Type of icon for tree nodes
 */
export type TreeIcon = "expanded" | "collapsed" | "leaf";

/**
 * Display state for search
 */
export interface SearchState {
  query: string;
  results: string[]; // Node IDs matching search
  currentIndex: number; // Current result index
  caseSensitive: boolean;
}

/**
 * Info panel display data
 */
export interface InfoPanelData {
  path: string;
  type: string;
  childCount?: number;
  valuePreview?: string;
  stats?: {
    objects: number;
    arrays: number;
    strings: number;
    numbers: number;
    booleans: number;
    nulls: number;
    depth: number;
  };
}
