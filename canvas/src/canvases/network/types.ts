// Network Monitor Canvas - Type Definitions

export interface NetworkConfig {
  mode?: "network";
  title?: string;
  hosts?: string[]; // Hosts to monitor (default: 8.8.8.8, 1.1.1.1, google.com)
  refreshInterval?: number; // Seconds between pings (default: 5)
  historyLength?: number; // Number of pings to keep in history (default: 20)
  showInterfaces?: boolean; // Show network interfaces panel
  showDNS?: boolean; // Show DNS check panel
}

export interface NetworkResult {
  action: "close" | "alert";
  data?: unknown;
}

// Shared cyberpunk color palette (consistent with other canvases)
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;

// Latency status thresholds
export const LATENCY_THRESHOLDS = {
  good: 50, // < 50ms = green
  ok: 200, // < 200ms = yellow
  // >= 200ms or failed = red
} as const;
