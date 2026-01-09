// System Monitor Canvas - Real-time system monitoring TUI

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import { type SystemConfig, CYBER_COLORS } from "./system/types";
import { HelpOverlay, SYSTEM_BINDINGS } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  systemService,
  formatBytes,
  formatUptime,
  progressBar,
  sparkline,
  type SystemSnapshot,
  type CpuUsage,
  type MemoryInfo,
  type DiskInfo,
  type ProcessInfo,
} from "../services/system";

interface Props {
  id: string;
  config?: SystemConfig;
  socketPath?: string;
  scenario?: string;
}

// CPU panel with sparkline history
function CpuPanel({
  cpu,
  history,
  width,
}: {
  cpu: CpuUsage | null;
  history: number[];
  width: number;
}) {
  if (!cpu) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color={CYBER_COLORS.dim}>Loading CPU...</Text>
      </Box>
    );
  }

  const barWidth = Math.min(30, width - 20);
  const cpuColor =
    cpu.total > 80
      ? CYBER_COLORS.neonRed
      : cpu.total > 50
        ? CYBER_COLORS.neonYellow
        : CYBER_COLORS.neonGreen;

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ CPU ]"}
        </Text>
        <Text color={CYBER_COLORS.dim}>
          {" "}
          {cpu.cores} cores @ {cpu.speed}MHz
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {/* Total usage */}
        <Box>
          <Text color={CYBER_COLORS.dim}>Total: </Text>
          <Text color={cpuColor}>{progressBar(cpu.total, barWidth)}</Text>
          <Text color={cpuColor} bold>
            {" "}
            {cpu.total.toFixed(1)}%
          </Text>
        </Box>

        {/* User/System breakdown */}
        <Box marginTop={1}>
          <Text color={CYBER_COLORS.dim}>User: </Text>
          <Text color={CYBER_COLORS.neonCyan}>{cpu.user.toFixed(1)}%</Text>
          <Text color={CYBER_COLORS.dim}> │ Sys: </Text>
          <Text color={CYBER_COLORS.neonMagenta}>{cpu.system.toFixed(1)}%</Text>
          <Text color={CYBER_COLORS.dim}> │ Idle: </Text>
          <Text color={CYBER_COLORS.dim}>{cpu.idle.toFixed(1)}%</Text>
        </Box>

        {/* Sparkline history */}
        {history.length > 5 && (
          <Box marginTop={1}>
            <Text color={CYBER_COLORS.dim}>History: </Text>
            <Text color={CYBER_COLORS.neonCyan}>
              {sparkline(history.slice(-40), 100)}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// Memory panel
function MemoryPanel({
  memory,
  width,
}: {
  memory: MemoryInfo | null;
  width: number;
}) {
  if (!memory) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color={CYBER_COLORS.dim}>Loading Memory...</Text>
      </Box>
    );
  }

  const barWidth = Math.min(30, width - 20);
  const memColor =
    memory.usedPercent > 90
      ? CYBER_COLORS.neonRed
      : memory.usedPercent > 70
        ? CYBER_COLORS.neonYellow
        : CYBER_COLORS.neonGreen;

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ MEMORY ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        <Box>
          <Text color={CYBER_COLORS.dim}>Used: </Text>
          <Text color={memColor}>
            {progressBar(memory.usedPercent, barWidth)}
          </Text>
          <Text color={memColor} bold>
            {" "}
            {memory.usedPercent.toFixed(1)}%
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={CYBER_COLORS.neonCyan}>{formatBytes(memory.used)}</Text>
          <Text color={CYBER_COLORS.dim}> / {formatBytes(memory.total)}</Text>
          <Text color={CYBER_COLORS.dim}> │ Free: </Text>
          <Text color={CYBER_COLORS.neonGreen}>{formatBytes(memory.free)}</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Disk panel
function DiskPanel({ disks, width }: { disks: DiskInfo[]; width: number }) {
  // Filter to most important disks
  const mainDisks = disks.filter(
    (d) =>
      d.mount === "/" ||
      d.mount === "/System/Volumes/Data" ||
      d.mount.startsWith("/Volumes/"),
  );

  if (mainDisks.length === 0) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color={CYBER_COLORS.dim}>No disks found</Text>
      </Box>
    );
  }

  const barWidth = Math.min(20, width - 30);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ DISK ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {mainDisks.slice(0, 4).map((disk) => {
          const diskColor =
            disk.usedPercent > 90
              ? CYBER_COLORS.neonRed
              : disk.usedPercent > 70
                ? CYBER_COLORS.neonYellow
                : CYBER_COLORS.neonGreen;

          const mountName =
            disk.mount === "/System/Volumes/Data"
              ? "Data"
              : disk.mount === "/"
                ? "Root"
                : disk.mount.replace("/Volumes/", "");

          return (
            <Box key={disk.mount} marginBottom={1}>
              <Text color={CYBER_COLORS.neonCyan}>
                {mountName.slice(0, 8).padEnd(8)}
              </Text>
              <Text color={diskColor}>
                {progressBar(disk.usedPercent, barWidth)}
              </Text>
              <Text color={diskColor}> {disk.usedPercent.toFixed(0)}%</Text>
              <Text color={CYBER_COLORS.dim}>
                {" "}
                {formatBytes(disk.free)} free
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Process list panel
function ProcessPanel({
  processes,
  width,
  height,
}: {
  processes: ProcessInfo[];
  width: number;
  height: number;
}) {
  const maxRows = Math.max(3, height - 4);
  const displayProcesses = processes.slice(0, maxRows);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ TOP PROCESSES ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {/* Header */}
        <Box>
          <Text color={CYBER_COLORS.dim}>
            {"PID".padStart(6)} {"CPU%".padStart(6)} {"MEM%".padStart(6)} NAME
          </Text>
        </Box>

        {/* Process rows */}
        {displayProcesses.map((proc) => {
          const cpuColor =
            proc.cpu > 50
              ? CYBER_COLORS.neonRed
              : proc.cpu > 20
                ? CYBER_COLORS.neonYellow
                : CYBER_COLORS.neonGreen;

          const memColor =
            proc.memory > 10 ? CYBER_COLORS.neonYellow : CYBER_COLORS.neonCyan;

          const nameWidth = Math.max(10, width - 25);
          const displayName = proc.name.slice(0, nameWidth);

          return (
            <Box key={proc.pid}>
              <Text color={CYBER_COLORS.dim}>
                {proc.pid.toString().padStart(6)}
              </Text>
              <Text color={cpuColor}> {proc.cpu.toFixed(1).padStart(5)}</Text>
              <Text color={memColor}>
                {" "}
                {proc.memory.toFixed(1).padStart(5)}
              </Text>
              <Text color="white"> {displayName}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// System overview header
function OverviewHeader({
  snapshot,
  width,
}: {
  snapshot: SystemSnapshot | null;
  width: number;
}) {
  if (!snapshot) {
    return (
      <Box
        justifyContent="center"
        borderStyle="single"
        borderColor={CYBER_COLORS.neonMagenta}
      >
        <Text color={CYBER_COLORS.neonCyan} bold>
          {"// SYSTEM MONITOR //"}
        </Text>
      </Box>
    );
  }

  const { overview } = snapshot;

  return (
    <Box
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderColor={CYBER_COLORS.neonMagenta}
    >
      <Text color={CYBER_COLORS.neonCyan} bold>
        {"// SYSTEM MONITOR //"}
      </Text>
      <Text color={CYBER_COLORS.dim}>
        {overview.hostname} │ {overview.platform}/{overview.arch} │ up{" "}
        {formatUptime(overview.uptime)}
      </Text>
      <Text color={CYBER_COLORS.neonYellow}>
        Load: {overview.loadAvg.map((l) => l.toFixed(2)).join(" ")}
      </Text>
    </Box>
  );
}

export function SystemCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "system",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // System data
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settings
  const [paused, setPaused] = useState(false);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    initialConfig?.refreshInterval || 2,
  );
  const [showProcesses, setShowProcesses] = useState(
    initialConfig?.showProcesses !== false,
  );
  const [showHelp, setShowHelp] = useState(false);

  // Alert thresholds
  const thresholds = initialConfig?.alertThresholds || {
    cpu: 90,
    memory: 95,
    disk: 95,
  };

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Track previous alerts to avoid spam
  const sentAlertsRef = useRef<Set<string>>(new Set());

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      // Send navigation request via IPC
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "system",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 120,
        height: stdout?.rows || 40,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Fetch system snapshot
  const fetchSnapshot = useCallback(async () => {
    if (paused) return;

    setIsRefreshing(true);
    try {
      const data = await systemService.getSnapshot();
      setSnapshot(data);

      // Track CPU history
      setCpuHistory((prev) => [...prev.slice(-100), data.cpu.total]);

      // Check for alert conditions
      if (data.cpu.total > (thresholds.cpu || 90)) {
        const alertKey = "cpu-high";
        if (!sentAlertsRef.current.has(alertKey)) {
          sentAlertsRef.current.add(alertKey);
          ipc.sendAlert({
            type: "cpu-high",
            message: `CPU usage at ${data.cpu.total.toFixed(1)}%`,
            data: { cpu: data.cpu.total },
          });
        }
      } else {
        sentAlertsRef.current.delete("cpu-high");
      }

      if (data.memory.usedPercent > (thresholds.memory || 95)) {
        const alertKey = "memory-high";
        if (!sentAlertsRef.current.has(alertKey)) {
          sentAlertsRef.current.add(alertKey);
          ipc.sendAlert({
            type: "memory-high",
            message: `Memory usage at ${data.memory.usedPercent.toFixed(1)}%`,
            data: { memory: data.memory.usedPercent },
          });
        }
      } else {
        sentAlertsRef.current.delete("memory-high");
      }

      setError(null);
    } catch (err) {
      setError(`Failed to fetch system info: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [paused, thresholds, ipc]);

  // Initial fetch
  useEffect(() => {
    fetchSnapshot();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(fetchSnapshot, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [paused, refreshIntervalSec, fetchSnapshot]);

  // Keyboard input
  useInput((input, key) => {
    // Canvas navigation takes highest priority
    if (handleNavInput(input, key)) {
      return;
    }

    // Help overlay takes next priority
    if (input === "?") {
      setShowHelp((h) => !h);
      return;
    }
    if (showHelp) {
      // Any key closes help
      setShowHelp(false);
      return;
    }

    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    if (input === " " || input === "p") {
      setPaused((p) => !p);
    } else if (input === "r") {
      fetchSnapshot();
    } else if (input === "t") {
      setShowProcesses((s) => !s);
    } else if (input === "+") {
      setRefreshIntervalSec((s) => Math.min(60, s + 1));
    } else if (input === "-") {
      setRefreshIntervalSec((s) => Math.max(1, s - 1));
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Two-column layout
  const leftWidth = Math.floor(termWidth * 0.5);
  const rightWidth = termWidth - leftWidth - 2;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <OverviewHeader snapshot={snapshot} width={termWidth} />

      {/* Status indicator */}
      <Box paddingX={1} marginY={1}>
        {paused ? (
          <Text color={CYBER_COLORS.neonYellow}>⏸ PAUSED</Text>
        ) : isRefreshing ? (
          <Text color={CYBER_COLORS.neonGreen}>
            <Spinner type="dots" /> Refreshing...
          </Text>
        ) : (
          <Text color={CYBER_COLORS.dim}>
            ● Live ({refreshIntervalSec}s interval)
          </Text>
        )}
        {error && <Text color={CYBER_COLORS.neonRed}> │ Error: {error}</Text>}
      </Box>

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left column - CPU & Memory */}
        <Box flexDirection="column" width={leftWidth}>
          <CpuPanel
            cpu={snapshot?.cpu || null}
            history={cpuHistory}
            width={leftWidth - 2}
          />
          <Box marginTop={1}>
            <MemoryPanel
              memory={snapshot?.memory || null}
              width={leftWidth - 2}
            />
          </Box>
          <Box marginTop={1}>
            <DiskPanel disks={snapshot?.disks || []} width={leftWidth - 2} />
          </Box>
        </Box>

        {/* Right column - Processes */}
        {showProcesses && (
          <Box flexDirection="column" width={rightWidth} marginLeft={1}>
            <ProcessPanel
              processes={snapshot?.processes || []}
              width={rightWidth - 1}
              height={contentHeight}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          Tab switch • ? help • space pause • r refresh • t procs • +/- interval
          • q quit
        </Text>
      </Box>

      {/* Help overlay (centered) */}
      {showHelp && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <HelpOverlay
            title="SYSTEM MONITOR"
            bindings={SYSTEM_BINDINGS}
            visible={showHelp}
            width={Math.min(50, termWidth - 10)}
          />
        </Box>
      )}

      {/* Canvas navigator overlay */}
      {showNav && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <CanvasNavigator
            visible={showNav}
            currentCanvas="system"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
