// System Monitor Canvas - Type Definitions

export interface SystemConfig {
  mode?: "system";
  title?: string;
  refreshInterval?: number; // Seconds (default: 2)
  showProcesses?: boolean; // Show process list
  processLimit?: number; // Max processes to show
  alertThresholds?: {
    cpu?: number; // % to trigger alert
    memory?: number; // % to trigger alert
    disk?: number; // % to trigger alert
  };
}

export interface SystemResult {
  action: "close" | "alert";
  data?: unknown;
}

// Shared cyberpunk color palette
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;
