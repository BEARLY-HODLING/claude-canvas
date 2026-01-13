// Process Manager Canvas - Type Definitions

import type {
  Process,
  ProcessTree,
  ProcessTreeNode,
} from "../../services/process";

export type { Process, ProcessTree, ProcessTreeNode };

/**
 * Sort field options
 */
export type SortField = "cpu" | "mem" | "pid" | "command";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Process canvas configuration
 */
export interface ProcessConfig {
  mode?: "process";
  title?: string;
  refreshInterval?: number; // Seconds (default: 2)
  showTree?: boolean; // Show tree view by default
  sortField?: SortField; // Default sort field
  sortDirection?: SortDirection; // Default sort direction
  alertThresholds?: {
    cpu?: number; // % to trigger alert
    memory?: number; // % to trigger alert
  };
  filter?: string; // Default search filter
}

/**
 * Process canvas result
 */
export interface ProcessResult {
  action: "close" | "kill" | "navigate";
  data?: {
    pid?: number;
    signal?: string;
    canvas?: string;
  };
}

/**
 * Kill confirmation state
 */
export interface KillConfirmation {
  process: Process;
  signal: string;
  confirmed: boolean;
}

/**
 * Search state
 */
export interface SearchState {
  active: boolean;
  query: string;
}

// Shared cyberpunk color palette (matching other canvases)
export const PROCESS_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;
