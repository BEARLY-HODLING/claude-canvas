// System Monitor Service - CPU, Memory, Disk, Process monitoring
// Uses Node.js os module and Bun APIs

import * as os from "os";
import { $ } from "bun";

/**
 * CPU core info
 */
export interface CpuCore {
  model: string;
  speed: number; // MHz
  times: {
    user: number;
    nice: number;
    sys: number;
    idle: number;
    irq: number;
  };
}

/**
 * CPU usage snapshot
 */
export interface CpuUsage {
  user: number; // %
  system: number; // %
  idle: number; // %
  total: number; // % (user + system)
  cores: number;
  model: string;
  speed: number; // MHz
}

/**
 * Memory info
 */
export interface MemoryInfo {
  total: number; // bytes
  free: number; // bytes
  used: number; // bytes
  usedPercent: number; // % (raw, includes cached)
  pressure: number; // % (actual pressure - macOS only)
  pressureLevel: "normal" | "warn" | "critical"; // pressure status
  active: number; // bytes (actively used)
  inactive: number; // bytes (cached, reclaimable)
  wired: number; // bytes (kernel, not reclaimable)
  compressed: number; // bytes (in compressor)
  swapTotal: number; // bytes
  swapFree: number; // bytes
  swapUsed: number; // bytes
  swapUsedPercent: number; // %
}

/**
 * Disk info
 */
export interface DiskInfo {
  filesystem: string;
  mount: string;
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usedPercent: number; // %
}

/**
 * Process info
 */
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number; // %
  memory: number; // %
  state: string;
  user: string;
}

/**
 * Network interface info
 */
export interface NetworkInfo {
  name: string;
  address: string;
  netmask: string;
  family: "IPv4" | "IPv6";
  mac: string;
  internal: boolean;
}

/**
 * System overview
 */
export interface SystemOverview {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  uptime: number; // seconds
  loadAvg: [number, number, number]; // 1, 5, 15 min
}

/**
 * Full system snapshot
 */
export interface SystemSnapshot {
  timestamp: Date;
  overview: SystemOverview;
  cpu: CpuUsage;
  memory: MemoryInfo;
  disks: DiskInfo[];
  processes: ProcessInfo[];
  network: NetworkInfo[];
}

// Store previous CPU times for calculating usage
let prevCpuTimes: { idle: number; total: number } | null = null;

/**
 * System Monitor Service
 */
export class SystemService {
  /**
   * Get system overview
   */
  getOverview(): SystemOverview {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      loadAvg: os.loadavg() as [number, number, number],
    };
  }

  /**
   * Get CPU usage
   */
  getCpuUsage(): CpuUsage {
    const cpus = os.cpus();
    const firstCpu = cpus[0];

    // Sum all CPU times
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    // Calculate delta from previous reading
    let user = 0;
    let system = 0;
    let idle = 100;

    if (prevCpuTimes) {
      const deltaIdle = totalIdle - prevCpuTimes.idle;
      const deltaTotal = totalTick - prevCpuTimes.total;

      if (deltaTotal > 0) {
        idle = (deltaIdle / deltaTotal) * 100;
        const used = 100 - idle;

        // Estimate user vs system (simplified)
        let totalUser = 0;
        let totalSys = 0;
        for (const cpu of cpus) {
          totalUser += cpu.times.user + cpu.times.nice;
          totalSys += cpu.times.sys + cpu.times.irq;
        }
        const ratio = totalUser / (totalUser + totalSys) || 0.7;
        user = used * ratio;
        system = used * (1 - ratio);
      }
    }

    prevCpuTimes = { idle: totalIdle, total: totalTick };

    return {
      user: Math.round(user * 10) / 10,
      system: Math.round(system * 10) / 10,
      idle: Math.round(idle * 10) / 10,
      total: Math.round((user + system) * 10) / 10,
      cores: cpus.length,
      model: firstCpu?.model || "Unknown",
      speed: firstCpu?.speed || 0,
    };
  }

  /**
   * Get memory info with macOS memory pressure
   */
  async getMemoryInfo(): Promise<MemoryInfo> {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const pageSize = 16384; // macOS page size

    // Default values
    let pressure = Math.round((used / total) * 100);
    let pressureLevel: "normal" | "warn" | "critical" = "normal";
    let active = 0;
    let inactive = 0;
    let wired = 0;
    let compressed = 0;

    // On macOS, get actual memory pressure
    if (os.platform() === "darwin") {
      try {
        // Get memory pressure percentage
        const pressureResult = await $`memory_pressure 2>/dev/null`.text();
        const freeMatch = pressureResult.match(
          /System-wide memory free percentage:\s*(\d+)%/
        );
        if (freeMatch && freeMatch[1]) {
          const freePercent = parseInt(freeMatch[1], 10);
          pressure = 100 - freePercent;
        }

        // Get detailed vm_stat info
        const vmResult = await $`vm_stat`.text();
        const getPages = (pattern: RegExp): number => {
          const match = vmResult.match(pattern);
          return match && match[1] ? parseInt(match[1].replace(/\./g, ""), 10) : 0;
        };

        active = getPages(/Pages active:\s*(\d+)/) * pageSize;
        inactive = getPages(/Pages inactive:\s*(\d+)/) * pageSize;
        wired = getPages(/Pages wired down:\s*(\d+)/) * pageSize;
        compressed = getPages(/Pages occupied by compressor:\s*(\d+)/) * pageSize;

        // Determine pressure level
        if (pressure > 80) {
          pressureLevel = "critical";
        } else if (pressure > 50) {
          pressureLevel = "warn";
        }
      } catch {
        // Fall back to basic calculation
        pressure = Math.round((used / total) * 100);
      }
    }

    return {
      total,
      free,
      used,
      usedPercent: Math.round((used / total) * 1000) / 10,
      pressure,
      pressureLevel,
      active,
      inactive,
      wired,
      compressed,
      swapTotal: 0,
      swapFree: 0,
      swapUsed: 0,
      swapUsedPercent: 0,
    };
  }

  /**
   * Get disk info (macOS/Linux)
   */
  async getDiskInfo(): Promise<DiskInfo[]> {
    try {
      // Use df command
      const result = await $`df -k`.text();
      const lines = result.trim().split("\n").slice(1); // Skip header

      const disks: DiskInfo[] = [];

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          const filesystem = parts[0] || "";
          const mount = parts[parts.length - 1] || "";

          // Filter out virtual filesystems
          if (
            filesystem.startsWith("/dev/") ||
            mount === "/" ||
            mount.startsWith("/Volumes/")
          ) {
            const total = parseInt(parts[1] || "0", 10) * 1024;
            const used = parseInt(parts[2] || "0", 10) * 1024;
            const free = parseInt(parts[3] || "0", 10) * 1024;

            disks.push({
              filesystem,
              mount,
              total,
              used,
              free,
              usedPercent:
                total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
            });
          }
        }
      }

      return disks;
    } catch {
      return [];
    }
  }

  /**
   * Get top processes by CPU/memory
   */
  async getProcesses(limit: number = 10): Promise<ProcessInfo[]> {
    try {
      // Use ps command (works on macOS and Linux)
      const result = await $`ps -axo pid,pcpu,pmem,state,user,comm -r`.text();
      const lines = result.trim().split("\n").slice(1); // Skip header

      const processes: ProcessInfo[] = [];

      for (const line of lines) {
        if (processes.length >= limit) break;

        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          const pid = parseInt(parts[0] || "0", 10);
          const cpu = parseFloat(parts[1] || "0");
          const memory = parseFloat(parts[2] || "0");
          const state = parts[3] || "";
          const user = parts[4] || "";
          const name = parts.slice(5).join(" ");

          // Skip kernel processes and idle
          if (name && !name.startsWith("(") && cpu + memory > 0) {
            processes.push({
              pid,
              name,
              cpu: Math.round(cpu * 10) / 10,
              memory: Math.round(memory * 10) / 10,
              state,
              user,
            });
          }
        }
      }

      return processes;
    } catch {
      return [];
    }
  }

  /**
   * Get network interfaces
   */
  getNetworkInfo(): NetworkInfo[] {
    const interfaces = os.networkInterfaces();
    const result: NetworkInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;

      for (const addr of addrs) {
        if (addr.family === "IPv4") {
          result.push({
            name,
            address: addr.address,
            netmask: addr.netmask,
            family: "IPv4",
            mac: addr.mac,
            internal: addr.internal,
          });
        }
      }
    }

    return result;
  }

  /**
   * Get full system snapshot
   */
  async getSnapshot(): Promise<SystemSnapshot> {
    const [disks, processes, memory] = await Promise.all([
      this.getDiskInfo(),
      this.getProcesses(15),
      this.getMemoryInfo(),
    ]);

    return {
      timestamp: new Date(),
      overview: this.getOverview(),
      cpu: this.getCpuUsage(),
      memory,
      disks,
      processes,
      network: this.getNetworkInfo(),
    };
  }
}

// Default service instance
export const systemService = new SystemService();

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
 * Format uptime to human readable
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
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
  return filled.repeat(fillCount) + empty.repeat(width - fillCount);
}

/**
 * Create sparkline from array of values
 */
export function sparkline(values: number[], maxValue?: number): string {
  if (values.length === 0) return "";

  const chars = "▁▂▃▄▅▆▇█";
  const max = maxValue ?? Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values
    .map((v) => {
      const normalized = (v - min) / range;
      const index = Math.min(
        Math.floor(normalized * chars.length),
        chars.length - 1,
      );
      return chars[index];
    })
    .join("");
}
