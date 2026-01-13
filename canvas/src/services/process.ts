// Process Manager Service - Process listing, killing, and tree view
// Uses ps aux on macOS/Linux

import { $ } from "bun";

/**
 * Process information
 */
export interface Process {
  pid: number;
  user: string;
  cpu: number; // %
  mem: number; // %
  command: string;
  state: string;
  vsz?: number; // Virtual memory size
  rss?: number; // Resident set size
  started?: string;
  time?: string;
}

/**
 * Process tree node
 */
export interface ProcessTreeNode {
  process: Process;
  children: ProcessTreeNode[];
  depth: number;
}

/**
 * Process tree structure
 */
export interface ProcessTree {
  root: ProcessTreeNode[];
  processCount: number;
}

/**
 * Kill result
 */
export interface KillResult {
  success: boolean;
  error?: string;
}

/**
 * Process Manager Service
 */
export class ProcessService {
  /**
   * Get list of all processes
   */
  async getProcessList(): Promise<Process[]> {
    try {
      // ps aux format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
      const result = await $`ps aux`.text();
      const lines = result.trim().split("\n").slice(1); // Skip header

      const processes: Process[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const user = parts[0] || "";
          const pid = parseInt(parts[1] || "0", 10);
          const cpu = parseFloat(parts[2] || "0");
          const mem = parseFloat(parts[3] || "0");
          const vsz = parseInt(parts[4] || "0", 10);
          const rss = parseInt(parts[5] || "0", 10);
          // Skip TTY (parts[6])
          const state = parts[7] || "";
          const started = parts[8] || "";
          const time = parts[9] || "";
          const command = parts.slice(10).join(" ");

          // Skip kernel idle process
          if (pid > 0) {
            processes.push({
              pid,
              user,
              cpu: Math.round(cpu * 10) / 10,
              mem: Math.round(mem * 10) / 10,
              command,
              state,
              vsz,
              rss,
              started,
              time,
            });
          }
        }
      }

      return processes;
    } catch (error) {
      console.error("Failed to get process list:", error);
      return [];
    }
  }

  /**
   * Kill a process by PID
   * @param pid Process ID to kill
   * @param signal Signal to send (default: TERM)
   */
  async killProcess(pid: number, signal: string = "TERM"): Promise<KillResult> {
    try {
      // Validate PID
      if (pid <= 0 || pid === 1) {
        return { success: false, error: "Invalid or protected PID" };
      }

      // Send kill signal
      const result = await $`kill -${signal} ${pid} 2>&1`.text();

      // Check if process still exists after kill
      try {
        await $`kill -0 ${pid} 2>&1`.text();
        // Process still exists - might need SIGKILL for non-responsive
        if (signal !== "KILL" && signal !== "9") {
          return {
            success: true,
            error: "Signal sent, but process may still be running",
          };
        }
      } catch {
        // Process is gone, success
      }

      return { success: true };
    } catch (error) {
      const errorMessage = (error as Error).message || "Unknown error";
      if (errorMessage.includes("No such process")) {
        return { success: true }; // Process already gone
      }
      if (errorMessage.includes("Operation not permitted")) {
        return { success: false, error: "Permission denied" };
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get process tree showing parent-child relationships
   */
  async getProcessTree(): Promise<ProcessTree> {
    try {
      // Get processes with parent PID
      const result =
        await $`ps -axo pid,ppid,pcpu,pmem,state,user,command`.text();
      const lines = result.trim().split("\n").slice(1);

      // Parse all processes
      interface ProcessWithParent extends Process {
        ppid: number;
      }

      const processMap = new Map<number, ProcessWithParent>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 7) {
          const pid = parseInt(parts[0] || "0", 10);
          const ppid = parseInt(parts[1] || "0", 10);
          const cpu = parseFloat(parts[2] || "0");
          const mem = parseFloat(parts[3] || "0");
          const state = parts[4] || "";
          const user = parts[5] || "";
          const command = parts.slice(6).join(" ");

          if (pid > 0) {
            processMap.set(pid, {
              pid,
              ppid,
              user,
              cpu: Math.round(cpu * 10) / 10,
              mem: Math.round(mem * 10) / 10,
              command,
              state,
            });
          }
        }
      }

      // Build tree structure
      const childrenMap = new Map<number, number[]>();
      for (const [pid, proc] of processMap) {
        const siblings = childrenMap.get(proc.ppid) || [];
        siblings.push(pid);
        childrenMap.set(proc.ppid, siblings);
      }

      // Build tree nodes recursively
      const buildNode = (
        pid: number,
        depth: number,
      ): ProcessTreeNode | null => {
        const proc = processMap.get(pid);
        if (!proc) return null;

        const childPids = childrenMap.get(pid) || [];
        const children: ProcessTreeNode[] = [];

        for (const childPid of childPids) {
          const childNode = buildNode(childPid, depth + 1);
          if (childNode) {
            children.push(childNode);
          }
        }

        // Sort children by CPU usage (descending)
        children.sort((a, b) => b.process.cpu - a.process.cpu);

        return {
          process: proc,
          children,
          depth,
        };
      };

      // Find root processes (ppid = 0 or 1, or orphans)
      const roots: ProcessTreeNode[] = [];
      for (const [pid, proc] of processMap) {
        if (proc.ppid === 0 || proc.ppid === 1 || !processMap.has(proc.ppid)) {
          const node = buildNode(pid, 0);
          if (node) {
            roots.push(node);
          }
        }
      }

      // Sort roots by CPU usage
      roots.sort((a, b) => {
        // Calculate total CPU for subtree
        const getCpuRecursive = (node: ProcessTreeNode): number => {
          let total = node.process.cpu;
          for (const child of node.children) {
            total += getCpuRecursive(child);
          }
          return total;
        };
        return getCpuRecursive(b) - getCpuRecursive(a);
      });

      return {
        root: roots,
        processCount: processMap.size,
      };
    } catch (error) {
      console.error("Failed to get process tree:", error);
      return { root: [], processCount: 0 };
    }
  }

  /**
   * Get process info by PID
   */
  async getProcess(pid: number): Promise<Process | null> {
    try {
      const result =
        await $`ps -p ${pid} -o pid,user,pcpu,pmem,state,command`.text();
      const lines = result.trim().split("\n");

      const dataLine = lines[1];
      if (lines.length < 2 || !dataLine) return null;

      const parts = dataLine.trim().split(/\s+/);
      if (parts.length >= 6) {
        return {
          pid: parseInt(parts[0] || "0", 10),
          user: parts[1] || "",
          cpu: parseFloat(parts[2] || "0"),
          mem: parseFloat(parts[3] || "0"),
          state: parts[4] || "",
          command: parts.slice(5).join(" "),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search processes by name or command
   */
  async searchProcesses(query: string): Promise<Process[]> {
    const allProcesses = await this.getProcessList();
    const lowerQuery = query.toLowerCase();

    return allProcesses.filter(
      (p) =>
        p.command.toLowerCase().includes(lowerQuery) ||
        p.user.toLowerCase().includes(lowerQuery) ||
        p.pid.toString().includes(query),
    );
  }
}

// Default service instance
export const processService = new ProcessService();

/**
 * Format state code to human-readable
 */
export function formatState(state: string): string {
  const firstChar = state[0] || "";
  switch (firstChar) {
    case "R":
      return "Running";
    case "S":
      return "Sleeping";
    case "D":
      return "Disk sleep";
    case "Z":
      return "Zombie";
    case "T":
      return "Stopped";
    case "t":
      return "Tracing";
    case "X":
      return "Dead";
    case "I":
      return "Idle";
    case "U":
      return "Uninterruptible";
    default:
      return state;
  }
}

/**
 * Get state color based on state code
 */
export function getStateColor(state: string): string {
  const firstChar = state[0] || "";
  switch (firstChar) {
    case "R":
      return "green"; // Running
    case "S":
      return "cyan"; // Sleeping (normal)
    case "D":
      return "yellow"; // Disk sleep (may indicate I/O issue)
    case "Z":
      return "red"; // Zombie
    case "T":
    case "t":
      return "magenta"; // Stopped/Tracing
    case "I":
      return "gray"; // Idle
    default:
      return "white";
  }
}

/**
 * Get state icon based on state code
 */
export function getStateIcon(state: string): string {
  const firstChar = state[0] || "";
  switch (firstChar) {
    case "R":
      return "\u25B6"; // Running triangle
    case "S":
      return "\u25CB"; // Sleeping circle
    case "D":
      return "\u25D4"; // Disk sleep (half circle)
    case "Z":
      return "\u2620"; // Zombie skull
    case "T":
    case "t":
      return "\u25A0"; // Stopped square
    case "I":
      return "\u25CC"; // Idle dotted circle
    default:
      return "\u25CF"; // Default filled circle
  }
}

/**
 * Format memory (KB to human readable)
 */
export function formatMemory(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
}
