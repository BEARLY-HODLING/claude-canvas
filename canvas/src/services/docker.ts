// Docker Service - Container monitoring via docker CLI
// Uses Bun's shell API for executing docker commands

import { $ } from "bun";

/**
 * Container info from docker ps
 */
export interface Container {
  id: string; // Short container ID
  name: string;
  image: string;
  status: string; // e.g., "Up 2 hours", "Exited (0) 5 minutes ago"
  state: "running" | "paused" | "exited" | "created" | "restarting" | "dead";
  ports: string; // Port mappings
  created: string; // Creation time
  command: string; // Command being run
}

/**
 * Container stats from docker stats
 */
export interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memoryUsage: number; // bytes
  memoryLimit: number; // bytes
  memoryPercent: number;
  netIO: { rx: number; tx: number }; // bytes
  blockIO: { read: number; write: number }; // bytes
  pids: number;
}

/**
 * Docker system info
 */
export interface DockerInfo {
  available: boolean;
  version?: string;
  containers: {
    total: number;
    running: number;
    paused: number;
    stopped: number;
  };
  images: number;
  serverVersion?: string;
}

/**
 * Parse container state from status string
 */
function parseState(
  status: string,
): "running" | "paused" | "exited" | "created" | "restarting" | "dead" {
  const lower = status.toLowerCase();
  if (lower.includes("up") && lower.includes("paused")) return "paused";
  if (lower.includes("up")) return "running";
  if (lower.includes("exited")) return "exited";
  if (lower.includes("created")) return "created";
  if (lower.includes("restarting")) return "restarting";
  if (lower.includes("dead")) return "dead";
  return "exited";
}

/**
 * Parse byte size string (e.g., "1.5GiB", "256MiB", "1.2kB")
 */
function parseByteSize(str: string): number {
  if (!str || str === "--") return 0;

  const match = str.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || "0");
  const unit = (match[2] || "B").toLowerCase();

  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    kib: 1024,
    mb: 1024 * 1024,
    mib: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    gib: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
    tib: 1024 * 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1);
}

/**
 * Parse IO string (e.g., "1.5MB / 2.3GB")
 */
function parseIOString(str: string): { input: number; output: number } {
  if (!str || str === "-- / --") return { input: 0, output: 0 };

  const parts = str.split("/").map((s) => s.trim());
  return {
    input: parseByteSize(parts[0] || "0"),
    output: parseByteSize(parts[1] || "0"),
  };
}

/**
 * Docker Service
 */
export class DockerService {
  /**
   * Check if docker is available and get system info
   */
  async getInfo(): Promise<DockerInfo> {
    try {
      // Try to get docker version
      const versionOutput =
        await $`docker version --format '{{.Server.Version}}'`
          .text()
          .catch(() => "");

      if (!versionOutput.trim()) {
        return {
          available: false,
          containers: { total: 0, running: 0, paused: 0, stopped: 0 },
          images: 0,
        };
      }

      // Get container counts
      const psOutput = await $`docker ps -a --format '{{.State}}'`.text();
      const states = psOutput.trim().split("\n").filter(Boolean);

      const running = states.filter((s) => s === "running").length;
      const paused = states.filter((s) => s === "paused").length;
      const stopped = states.filter(
        (s) => s !== "running" && s !== "paused",
      ).length;

      // Get image count
      const imageOutput = await $`docker images -q`.text();
      const images = imageOutput.trim().split("\n").filter(Boolean).length;

      return {
        available: true,
        version: versionOutput.trim(),
        serverVersion: versionOutput.trim(),
        containers: {
          total: states.length,
          running,
          paused,
          stopped,
        },
        images,
      };
    } catch {
      return {
        available: false,
        containers: { total: 0, running: 0, paused: 0, stopped: 0 },
        images: 0,
      };
    }
  }

  /**
   * List all containers
   */
  async listContainers(): Promise<Container[]> {
    try {
      // Use custom format for consistent parsing
      const format =
        "{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.State}}\\t{{.Ports}}\\t{{.CreatedAt}}\\t{{.Command}}";
      const output = await $`docker ps -a --format ${format}`.text();

      if (!output.trim()) return [];

      const lines = output.trim().split("\n");
      const containers: Container[] = [];

      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length >= 5) {
          containers.push({
            id: parts[0] || "",
            name: parts[1] || "",
            image: parts[2] || "",
            status: parts[3] || "",
            state: parseState(parts[4] || ""),
            ports: parts[5] || "",
            created: parts[6] || "",
            command: parts[7] || "",
          });
        }
      }

      return containers;
    } catch {
      return [];
    }
  }

  /**
   * Get stats for a specific container
   */
  async getContainerStats(id: string): Promise<ContainerStats | null> {
    try {
      // Use JSON format for stats
      const format =
        "{{.ID}}\\t{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}\\t{{.PIDs}}";
      const output =
        await $`docker stats ${id} --no-stream --format ${format}`.text();

      if (!output.trim()) return null;

      const parts = output.trim().split("\t");
      if (parts.length < 8) return null;

      // Parse memory usage "256MiB / 8GiB"
      const memParts = (parts[3] || "").split("/").map((s) => s.trim());
      const memUsage = parseByteSize(memParts[0] || "0");
      const memLimit = parseByteSize(memParts[1] || "0");

      // Parse network I/O
      const netIO = parseIOString(parts[5] || "");

      // Parse block I/O
      const blockIO = parseIOString(parts[6] || "");

      return {
        id: parts[0] || "",
        name: (parts[1] || "").replace(/^\//, ""), // Remove leading slash
        cpuPercent: parseFloat((parts[2] || "0").replace("%", "")),
        memoryUsage: memUsage,
        memoryLimit: memLimit,
        memoryPercent: parseFloat((parts[4] || "0").replace("%", "")),
        netIO: { rx: netIO.input, tx: netIO.output },
        blockIO: { read: blockIO.input, write: blockIO.output },
        pids: parseInt(parts[7] || "0", 10),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get stats for all running containers
   */
  async getAllContainerStats(): Promise<Map<string, ContainerStats>> {
    const statsMap = new Map<string, ContainerStats>();

    try {
      const format =
        "{{.ID}}\\t{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}\\t{{.PIDs}}";
      const output =
        await $`docker stats --no-stream --format ${format}`.text();

      if (!output.trim()) return statsMap;

      const lines = output.trim().split("\n");

      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length >= 8) {
          const id = parts[0] || "";

          // Parse memory usage
          const memParts = (parts[3] || "").split("/").map((s) => s.trim());
          const memUsage = parseByteSize(memParts[0] || "0");
          const memLimit = parseByteSize(memParts[1] || "0");

          // Parse I/O
          const netIO = parseIOString(parts[5] || "");
          const blockIO = parseIOString(parts[6] || "");

          statsMap.set(id, {
            id,
            name: (parts[1] || "").replace(/^\//, ""),
            cpuPercent: parseFloat((parts[2] || "0").replace("%", "")),
            memoryUsage: memUsage,
            memoryLimit: memLimit,
            memoryPercent: parseFloat((parts[4] || "0").replace("%", "")),
            netIO: { rx: netIO.input, tx: netIO.output },
            blockIO: { read: blockIO.input, write: blockIO.output },
            pids: parseInt(parts[7] || "0", 10),
          });
        }
      }
    } catch {
      // Return empty map on error
    }

    return statsMap;
  }

  /**
   * Get container logs
   */
  async getContainerLogs(id: string, lines: number = 50): Promise<string> {
    try {
      const output = await $`docker logs ${id} --tail ${lines} 2>&1`.text();
      return output;
    } catch (err) {
      return `Error fetching logs: ${(err as Error).message}`;
    }
  }

  /**
   * Start a container
   */
  async startContainer(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await $`docker start ${id}`.text();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await $`docker stop ${id}`.text();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await $`docker restart ${id}`.text();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Pause a container
   */
  async pauseContainer(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await $`docker pause ${id}`.text();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Unpause a container
   */
  async unpauseContainer(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await $`docker unpause ${id}`.text();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

// Default service instance
export const dockerService = new DockerService();

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

/**
 * Create ASCII progress bar
 */
export function progressBar(
  percent: number,
  width: number = 20,
  filled: string = "█",
  empty: string = "░",
): string {
  const fillCount = Math.round((percent / 100) * width);
  return (
    filled.repeat(Math.min(fillCount, width)) +
    empty.repeat(Math.max(0, width - fillCount))
  );
}

/**
 * Get color for container state
 */
export function getStateColor(state: Container["state"]): string {
  switch (state) {
    case "running":
      return "green";
    case "paused":
      return "yellow";
    case "exited":
    case "dead":
      return "red";
    case "created":
    case "restarting":
      return "cyan";
    default:
      return "gray";
  }
}

/**
 * Get icon for container state
 */
export function getStateIcon(state: Container["state"]): string {
  switch (state) {
    case "running":
      return "●";
    case "paused":
      return "⏸";
    case "exited":
      return "○";
    case "dead":
      return "✗";
    case "created":
      return "◐";
    case "restarting":
      return "↻";
    default:
      return "?";
  }
}
