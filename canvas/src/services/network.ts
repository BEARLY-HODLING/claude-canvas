// Network Monitor Service - Ping, DNS, and Network Interface monitoring
// Uses system commands and Node.js os module

import * as os from "os";
import { $ } from "bun";

/**
 * Ping result for a single host
 */
export interface PingResult {
  host: string;
  success: boolean;
  latency: number; // milliseconds (-1 if failed)
  packetLoss: number; // percentage (0-100)
  timestamp: Date;
  error?: string;
}

/**
 * Network interface information
 */
export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: "IPv4" | "IPv6";
  mac: string;
  internal: boolean;
  cidr: string | null;
}

/**
 * DNS resolution result
 */
export interface DNSResult {
  domain: string;
  resolved: boolean;
  ip: string | null;
  time: number; // milliseconds
  timestamp: Date;
  error?: string;
}

/**
 * Host monitoring entry with history
 */
export interface HostMonitor {
  host: string;
  type: "ip" | "domain";
  latencyHistory: number[]; // Last N ping latencies
  lastResult: PingResult | null;
  avgLatency: number;
  packetLoss: number;
  status: "online" | "offline" | "unknown";
}

/**
 * Ping a single host using system ping command
 */
export async function ping(host: string): Promise<PingResult> {
  const timestamp = new Date();

  try {
    // Use ping with single packet (-c 1) and 2 second timeout (-W 2)
    // macOS uses -W for timeout in seconds, Linux uses -W for milliseconds
    const platform = os.platform();
    const timeoutFlag = platform === "darwin" ? "-W 2" : "-W 2000";

    const result = await $`ping -c 1 ${timeoutFlag} ${host} 2>&1`.text();

    // Parse the output for latency
    // macOS/Linux format: "time=X.XXX ms" or "time=X ms"
    const timeMatch = result.match(/time[=<](\d+\.?\d*)\s*ms/i);

    if (timeMatch && timeMatch[1]) {
      const latency = parseFloat(timeMatch[1]);
      return {
        host,
        success: true,
        latency: Math.round(latency * 10) / 10,
        packetLoss: 0,
        timestamp,
      };
    }

    // Check for packet loss in output
    const lossMatch = result.match(/(\d+)% packet loss/);
    const packetLoss = lossMatch?.[1] ? parseInt(lossMatch[1], 10) : 100;

    return {
      host,
      success: false,
      latency: -1,
      packetLoss,
      timestamp,
      error: "No response",
    };
  } catch (err) {
    return {
      host,
      success: false,
      latency: -1,
      packetLoss: 100,
      timestamp,
      error: (err as Error).message,
    };
  }
}

/**
 * Get all network interfaces with IPv4 addresses
 */
export function getNetworkInterfaces(): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const result: NetworkInterface[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      result.push({
        name,
        address: addr.address,
        netmask: addr.netmask,
        family: addr.family as "IPv4" | "IPv6",
        mac: addr.mac,
        internal: addr.internal,
        cidr: addr.cidr,
      });
    }
  }

  return result;
}

/**
 * Get only IPv4 external interfaces
 */
export function getExternalIPv4Interfaces(): NetworkInterface[] {
  return getNetworkInterfaces().filter(
    (iface) => iface.family === "IPv4" && !iface.internal,
  );
}

/**
 * Check DNS resolution for a domain
 */
export async function checkDNS(domain: string): Promise<DNSResult> {
  const timestamp = new Date();
  const startTime = performance.now();

  try {
    // Use host command for DNS lookup (available on macOS/Linux)
    const result = await $`host -W 2 ${domain} 2>&1`.text();
    const endTime = performance.now();
    const time = Math.round(endTime - startTime);

    // Parse the output for IP address
    // Format: "domain has address X.X.X.X"
    const ipMatch = result.match(/has address (\d+\.\d+\.\d+\.\d+)/);

    if (ipMatch && ipMatch[1]) {
      return {
        domain,
        resolved: true,
        ip: ipMatch[1],
        time,
        timestamp,
      };
    }

    // Check for NXDOMAIN or other failures
    if (
      result.includes("not found") ||
      result.includes("NXDOMAIN") ||
      result.includes("timed out")
    ) {
      return {
        domain,
        resolved: false,
        ip: null,
        time,
        timestamp,
        error: "Domain not found",
      };
    }

    return {
      domain,
      resolved: false,
      ip: null,
      time,
      timestamp,
      error: "Unknown DNS error",
    };
  } catch (err) {
    const endTime = performance.now();
    return {
      domain,
      resolved: false,
      ip: null,
      time: Math.round(endTime - startTime),
      timestamp,
      error: (err as Error).message,
    };
  }
}

/**
 * Network Monitor Service
 */
export class NetworkService {
  private monitors: Map<string, HostMonitor> = new Map();
  private historyLength: number;

  constructor(historyLength: number = 20) {
    this.historyLength = historyLength;
  }

  /**
   * Add a host to monitor
   */
  addHost(host: string): void {
    if (this.monitors.has(host)) return;

    const type = this.isIPAddress(host) ? "ip" : "domain";
    this.monitors.set(host, {
      host,
      type,
      latencyHistory: [],
      lastResult: null,
      avgLatency: -1,
      packetLoss: 0,
      status: "unknown",
    });
  }

  /**
   * Remove a host from monitoring
   */
  removeHost(host: string): void {
    this.monitors.delete(host);
  }

  /**
   * Get all monitored hosts
   */
  getHosts(): string[] {
    return Array.from(this.monitors.keys());
  }

  /**
   * Get monitor data for a host
   */
  getMonitor(host: string): HostMonitor | undefined {
    return this.monitors.get(host);
  }

  /**
   * Get all monitors
   */
  getAllMonitors(): HostMonitor[] {
    return Array.from(this.monitors.values());
  }

  /**
   * Ping a specific host and update its monitor
   */
  async pingHost(host: string): Promise<PingResult> {
    const result = await ping(host);

    const monitor = this.monitors.get(host);
    if (monitor) {
      monitor.lastResult = result;

      // Update latency history
      if (result.success) {
        monitor.latencyHistory.push(result.latency);
        if (monitor.latencyHistory.length > this.historyLength) {
          monitor.latencyHistory.shift();
        }

        // Calculate average latency
        const validLatencies = monitor.latencyHistory.filter((l) => l > 0);
        monitor.avgLatency =
          validLatencies.length > 0
            ? Math.round(
                (validLatencies.reduce((a, b) => a + b, 0) /
                  validLatencies.length) *
                  10,
              ) / 10
            : -1;

        monitor.status = "online";
      } else {
        // Add -1 for failed pings to track in history
        monitor.latencyHistory.push(-1);
        if (monitor.latencyHistory.length > this.historyLength) {
          monitor.latencyHistory.shift();
        }
        monitor.status = "offline";
      }

      // Calculate packet loss from history
      const totalPings = monitor.latencyHistory.length;
      const failedPings = monitor.latencyHistory.filter((l) => l < 0).length;
      monitor.packetLoss =
        totalPings > 0 ? Math.round((failedPings / totalPings) * 1000) / 10 : 0;
    }

    return result;
  }

  /**
   * Ping all monitored hosts
   */
  async pingAllHosts(): Promise<PingResult[]> {
    const hosts = this.getHosts();
    const results = await Promise.all(hosts.map((host) => this.pingHost(host)));
    return results;
  }

  /**
   * Check if a string is an IP address
   */
  private isIPAddress(str: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(str) || ipv6Regex.test(str);
  }
}

// Default service instance
export const networkService = new NetworkService(20);

// Default hosts to monitor
export const DEFAULT_HOSTS = ["8.8.8.8", "1.1.1.1", "google.com"];

/**
 * Get latency status color/label
 */
export function getLatencyStatus(latency: number): {
  status: "good" | "ok" | "slow" | "failed";
  label: string;
} {
  if (latency < 0) {
    return { status: "failed", label: "FAIL" };
  }
  if (latency < 50) {
    return { status: "good", label: "GOOD" };
  }
  if (latency < 200) {
    return { status: "ok", label: "OK" };
  }
  return { status: "slow", label: "SLOW" };
}

/**
 * Create sparkline from latency history
 */
export function latencySparkline(
  history: number[],
  maxLatency: number = 200,
): string {
  if (history.length === 0) return "";

  const chars = "▁▂▃▄▅▆▇█";
  const failChar = "×";

  return history
    .map((latency) => {
      if (latency < 0) return failChar;
      const normalized = Math.min(latency / maxLatency, 1);
      const index = Math.min(
        Math.floor(normalized * chars.length),
        chars.length - 1,
      );
      return chars[index];
    })
    .join("");
}
