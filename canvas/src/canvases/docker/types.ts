// Docker Canvas - Type Definitions

/**
 * Configuration for the Docker canvas
 */
export interface DockerConfig {
  mode?: "docker";
  title?: string;
  refreshInterval?: number; // Seconds (default: 5)
  showStats?: boolean; // Show CPU/memory stats (default: true)
  showPorts?: boolean; // Show port mappings (default: true)
  alertThresholds?: {
    cpu?: number; // % to trigger alert (default: 80)
    memory?: number; // % to trigger alert (default: 90)
  };
}

/**
 * Result returned from docker canvas actions
 */
export interface DockerResult {
  action: "close" | "start" | "stop" | "restart" | "logs" | "alert";
  containerId?: string;
  containerName?: string;
  data?: unknown;
}

/**
 * Container info with stats
 */
export interface ContainerWithStats {
  id: string;
  name: string;
  image: string;
  status: string;
  state: "running" | "paused" | "exited" | "created" | "restarting" | "dead";
  ports: string;
  created: string;
  command: string;
  // Stats (only for running containers)
  cpuPercent?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  memoryPercent?: number;
  netIO?: { rx: number; tx: number };
  blockIO?: { read: number; write: number };
  pids?: number;
}

/**
 * Log viewer state
 */
export interface LogViewerState {
  containerId: string;
  containerName: string;
  logs: string;
  scrollOffset: number;
}

// Shared cyberpunk color palette
export const DOCKER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  neonBlue: "blue",
  dim: "gray",
  bg: "black",
} as const;
