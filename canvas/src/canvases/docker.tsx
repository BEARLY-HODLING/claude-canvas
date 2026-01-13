// Docker Container Monitor Canvas - Real-time container monitoring TUI

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type DockerConfig,
  type ContainerWithStats,
  type LogViewerState,
  DOCKER_COLORS,
} from "./docker/types";
import {
  HelpOverlay,
  type KeyBinding,
  COMMON_BINDINGS,
} from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  dockerService,
  formatBytes,
  progressBar,
  getStateColor,
  getStateIcon,
  type Container,
  type ContainerStats,
  type DockerInfo,
} from "../services/docker";

interface Props {
  id: string;
  config?: DockerConfig;
  socketPath?: string;
  scenario?: string;
}

// Docker canvas keybindings
export const DOCKER_BINDINGS: KeyBinding[] = [
  {
    key: "j/k or Up/Dn",
    description: "Navigate containers",
    category: "navigation",
  },
  { key: "Enter", description: "Show container details", category: "action" },
  { key: "s", description: "Start container", category: "action" },
  { key: "x", description: "Stop container", category: "action" },
  { key: "l", description: "View logs (tail -50)", category: "action" },
  { key: "p", description: "Pause/unpause container", category: "action" },
  { key: "R", description: "Restart container", category: "action" },
  { key: "+/-", description: "Adjust refresh interval", category: "view" },
  { key: "Space", description: "Pause/resume auto-refresh", category: "view" },
  ...COMMON_BINDINGS,
];

// Container row component
function ContainerRow({
  container,
  isSelected,
  width,
  showStats,
}: {
  container: ContainerWithStats;
  isSelected: boolean;
  width: number;
  showStats: boolean;
}) {
  const stateColor = getStateColor(container.state);
  const stateIcon = getStateIcon(container.state);

  // Calculate column widths
  const nameWidth = Math.min(20, Math.floor(width * 0.15));
  const imageWidth = Math.min(25, Math.floor(width * 0.2));
  const statusWidth = Math.min(20, Math.floor(width * 0.15));
  const portsWidth = Math.min(25, Math.floor(width * 0.2));

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str.padEnd(maxLen);
    return str.slice(0, maxLen - 1) + "…";
  };

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={isSelected ? DOCKER_COLORS.neonCyan : DOCKER_COLORS.dim}>
        {isSelected ? ">" : " "}
      </Text>

      {/* State icon */}
      <Text color={stateColor}> {stateIcon} </Text>

      {/* Container name */}
      <Text color={isSelected ? "white" : DOCKER_COLORS.dim} bold={isSelected}>
        {truncate(container.name, nameWidth)}
      </Text>

      {/* Image */}
      <Text color={DOCKER_COLORS.dim}>
        {" "}
        {truncate(container.image, imageWidth)}
      </Text>

      {/* Status */}
      <Text color={stateColor}> {truncate(container.status, statusWidth)}</Text>

      {/* Ports */}
      <Text color={DOCKER_COLORS.neonCyan}>
        {" "}
        {truncate(container.ports || "-", portsWidth)}
      </Text>

      {/* Stats (if available and showing) */}
      {showStats && container.cpuPercent !== undefined && (
        <>
          <Text color={DOCKER_COLORS.dim}> CPU:</Text>
          <Text
            color={
              container.cpuPercent > 80
                ? DOCKER_COLORS.neonRed
                : container.cpuPercent > 50
                  ? DOCKER_COLORS.neonYellow
                  : DOCKER_COLORS.neonGreen
            }
          >
            {container.cpuPercent.toFixed(0).padStart(3)}%
          </Text>
          <Text color={DOCKER_COLORS.dim}> MEM:</Text>
          <Text
            color={
              (container.memoryPercent || 0) > 80
                ? DOCKER_COLORS.neonRed
                : (container.memoryPercent || 0) > 50
                  ? DOCKER_COLORS.neonYellow
                  : DOCKER_COLORS.neonGreen
            }
          >
            {(container.memoryPercent || 0).toFixed(0).padStart(3)}%
          </Text>
        </>
      )}
    </Box>
  );
}

// Container details panel
function ContainerDetails({
  container,
  width,
}: {
  container: ContainerWithStats | null;
  width: number;
}) {
  if (!container) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={DOCKER_COLORS.dim}
        paddingX={1}
        width={width}
      >
        <Text color={DOCKER_COLORS.dim}>No container selected</Text>
      </Box>
    );
  }

  const barWidth = Math.min(25, width - 20);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={DOCKER_COLORS.neonMagenta}
      paddingX={1}
      width={width}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={DOCKER_COLORS.neonCyan} bold>
          {"[ "}
          {container.name}
          {" ]"}
        </Text>
      </Box>

      {/* Basic info */}
      <Box>
        <Text color={DOCKER_COLORS.dim}>ID: </Text>
        <Text color="white">{container.id}</Text>
      </Box>
      <Box>
        <Text color={DOCKER_COLORS.dim}>Image: </Text>
        <Text color="white">{container.image}</Text>
      </Box>
      <Box>
        <Text color={DOCKER_COLORS.dim}>Status: </Text>
        <Text color={getStateColor(container.state)}>{container.status}</Text>
      </Box>
      <Box>
        <Text color={DOCKER_COLORS.dim}>Command: </Text>
        <Text color="white">{container.command.slice(0, 40)}</Text>
      </Box>
      {container.ports && (
        <Box>
          <Text color={DOCKER_COLORS.dim}>Ports: </Text>
          <Text color={DOCKER_COLORS.neonCyan}>{container.ports}</Text>
        </Box>
      )}

      {/* Stats (if running) */}
      {container.cpuPercent !== undefined && (
        <>
          <Box marginTop={1}>
            <Text color={DOCKER_COLORS.neonMagenta} bold>
              {"[ STATS ]"}
            </Text>
          </Box>
          <Box>
            <Text color={DOCKER_COLORS.dim}>CPU: </Text>
            <Text
              color={
                container.cpuPercent > 80
                  ? DOCKER_COLORS.neonRed
                  : container.cpuPercent > 50
                    ? DOCKER_COLORS.neonYellow
                    : DOCKER_COLORS.neonGreen
              }
            >
              {progressBar(container.cpuPercent, barWidth)}
            </Text>
            <Text color="white"> {container.cpuPercent.toFixed(1)}%</Text>
          </Box>
          <Box>
            <Text color={DOCKER_COLORS.dim}>MEM: </Text>
            <Text
              color={
                (container.memoryPercent || 0) > 80
                  ? DOCKER_COLORS.neonRed
                  : (container.memoryPercent || 0) > 50
                    ? DOCKER_COLORS.neonYellow
                    : DOCKER_COLORS.neonGreen
              }
            >
              {progressBar(container.memoryPercent || 0, barWidth)}
            </Text>
            <Text color="white">
              {" "}
              {formatBytes(container.memoryUsage || 0)} /{" "}
              {formatBytes(container.memoryLimit || 0)}
            </Text>
          </Box>
          {container.netIO && (
            <Box>
              <Text color={DOCKER_COLORS.dim}>NET I/O: </Text>
              <Text color={DOCKER_COLORS.neonCyan}>
                {formatBytes(container.netIO.rx)} /{" "}
                {formatBytes(container.netIO.tx)}
              </Text>
            </Box>
          )}
          {container.blockIO && (
            <Box>
              <Text color={DOCKER_COLORS.dim}>DISK I/O: </Text>
              <Text color={DOCKER_COLORS.neonCyan}>
                {formatBytes(container.blockIO.read)} /{" "}
                {formatBytes(container.blockIO.write)}
              </Text>
            </Box>
          )}
          {container.pids !== undefined && (
            <Box>
              <Text color={DOCKER_COLORS.dim}>PIDs: </Text>
              <Text color="white">{container.pids}</Text>
            </Box>
          )}
        </>
      )}

      {/* Controls hint */}
      <Box marginTop={1}>
        <Text color={DOCKER_COLORS.dim}>
          s:start x:stop R:restart l:logs p:pause
        </Text>
      </Box>
    </Box>
  );
}

// Log viewer overlay
function LogViewer({
  logState,
  width,
  height,
  onClose,
}: {
  logState: LogViewerState;
  width: number;
  height: number;
  onClose: () => void;
}) {
  const lines = logState.logs.split("\n");
  const visibleLines = height - 6;
  const startLine = Math.max(
    0,
    Math.min(logState.scrollOffset, lines.length - visibleLines),
  );
  const displayLines = lines.slice(startLine, startLine + visibleLines);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={DOCKER_COLORS.neonMagenta}
      paddingX={1}
      width={width}
      height={height}
    >
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={DOCKER_COLORS.neonCyan} bold>
          {"[ LOGS: "}
          {logState.containerName}
          {" ]"}
        </Text>
        <Text color={DOCKER_COLORS.dim}>
          Lines {startLine + 1}-{startLine + displayLines.length} of{" "}
          {lines.length}
        </Text>
      </Box>

      {/* Log content */}
      <Box flexDirection="column" height={visibleLines}>
        {displayLines.map((line, i) => (
          <Text key={i} color="white" wrap="truncate">
            {line.slice(0, width - 4)}
          </Text>
        ))}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color={DOCKER_COLORS.dim}>Up/Down scroll | Esc/q close</Text>
      </Box>
    </Box>
  );
}

// Docker not available error screen
function DockerUnavailable({ width }: { width: number }) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      borderStyle="double"
      borderColor={DOCKER_COLORS.neonRed}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 4)}
    >
      <Text color={DOCKER_COLORS.neonRed} bold>
        {"[ DOCKER NOT AVAILABLE ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={DOCKER_COLORS.dim}>
          Docker daemon is not running or docker command not found.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={DOCKER_COLORS.neonYellow}>
          Please ensure Docker is installed and running.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={DOCKER_COLORS.dim}>Press q to exit</Text>
      </Box>
    </Box>
  );
}

// Main Docker Canvas
export function DockerCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "docker",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Docker data
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [containers, setContainers] = useState<ContainerWithStats[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // View state
  const [paused, setPaused] = useState(false);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    initialConfig?.refreshInterval || 5,
  );
  const [showStats] = useState(initialConfig?.showStats !== false);
  const [showHelp, setShowHelp] = useState(false);
  const [logViewer, setLogViewer] = useState<LogViewerState | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  // Alert thresholds
  const thresholds = initialConfig?.alertThresholds || {
    cpu: 80,
    memory: 90,
  };

  // Track sent alerts
  const sentAlertsRef = useRef<Set<string>>(new Set());

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "docker",
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

  // Check Docker availability and fetch data
  const fetchData = useCallback(async () => {
    if (paused) return;

    setIsRefreshing(true);
    try {
      // Check Docker availability
      const info = await dockerService.getInfo();
      setDockerInfo(info);

      if (!info.available) {
        setContainers([]);
        setError("Docker is not available");
        setIsRefreshing(false);
        return;
      }

      // Get containers
      const containerList = await dockerService.listContainers();

      // Get stats for running containers
      const statsMap = await dockerService.getAllContainerStats();

      // Merge containers with stats
      const containersWithStats: ContainerWithStats[] = containerList.map(
        (c) => {
          const stats = statsMap.get(c.id);
          return {
            ...c,
            cpuPercent: stats?.cpuPercent,
            memoryUsage: stats?.memoryUsage,
            memoryLimit: stats?.memoryLimit,
            memoryPercent: stats?.memoryPercent,
            netIO: stats?.netIO,
            blockIO: stats?.blockIO,
            pids: stats?.pids,
          };
        },
      );

      setContainers(containersWithStats);

      // Check for alerts
      for (const c of containersWithStats) {
        if (
          c.cpuPercent !== undefined &&
          c.cpuPercent > (thresholds.cpu || 80)
        ) {
          const alertKey = `cpu-${c.id}`;
          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);
            ipc.sendAlert({
              type: "container-cpu-high",
              message: `Container ${c.name} CPU at ${c.cpuPercent.toFixed(1)}%`,
              data: { containerId: c.id, cpu: c.cpuPercent },
            });
          }
        }

        if (
          c.memoryPercent !== undefined &&
          c.memoryPercent > (thresholds.memory || 90)
        ) {
          const alertKey = `mem-${c.id}`;
          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);
            ipc.sendAlert({
              type: "container-memory-high",
              message: `Container ${c.name} memory at ${c.memoryPercent.toFixed(1)}%`,
              data: { containerId: c.id, memory: c.memoryPercent },
            });
          }
        }
      }

      setError(null);
    } catch (err) {
      setError(`Failed to fetch Docker data: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [paused, thresholds, ipc]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (paused || logViewer) return;

    const interval = setInterval(fetchData, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [paused, refreshIntervalSec, fetchData, logViewer]);

  // Clear action message after delay
  useEffect(() => {
    if (!actionMessage) return;
    const timeout = setTimeout(() => setActionMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [actionMessage]);

  // Get selected container
  const selectedContainer = containers[selectedIndex] || null;

  // Container action handlers
  const handleStart = async () => {
    if (!selectedContainer) return;
    const result = await dockerService.startContainer(selectedContainer.id);
    if (result.success) {
      setActionMessage(`Started ${selectedContainer.name}`);
      fetchData();
    } else {
      setActionMessage(`Failed: ${result.error}`);
    }
  };

  const handleStop = async () => {
    if (!selectedContainer) return;
    const result = await dockerService.stopContainer(selectedContainer.id);
    if (result.success) {
      setActionMessage(`Stopped ${selectedContainer.name}`);
      fetchData();
    } else {
      setActionMessage(`Failed: ${result.error}`);
    }
  };

  const handleRestart = async () => {
    if (!selectedContainer) return;
    const result = await dockerService.restartContainer(selectedContainer.id);
    if (result.success) {
      setActionMessage(`Restarted ${selectedContainer.name}`);
      fetchData();
    } else {
      setActionMessage(`Failed: ${result.error}`);
    }
  };

  const handlePauseToggle = async () => {
    if (!selectedContainer) return;
    if (selectedContainer.state === "paused") {
      const result = await dockerService.unpauseContainer(selectedContainer.id);
      if (result.success) {
        setActionMessage(`Unpaused ${selectedContainer.name}`);
        fetchData();
      } else {
        setActionMessage(`Failed: ${result.error}`);
      }
    } else if (selectedContainer.state === "running") {
      const result = await dockerService.pauseContainer(selectedContainer.id);
      if (result.success) {
        setActionMessage(`Paused ${selectedContainer.name}`);
        fetchData();
      } else {
        setActionMessage(`Failed: ${result.error}`);
      }
    }
  };

  const handleViewLogs = async () => {
    if (!selectedContainer) return;
    const logs = await dockerService.getContainerLogs(selectedContainer.id, 50);
    setLogViewer({
      containerId: selectedContainer.id,
      containerName: selectedContainer.name,
      logs,
      scrollOffset: 0,
    });
  };

  // Keyboard input
  useInput((input, key) => {
    // Log viewer mode
    if (logViewer) {
      if (key.escape || input === "q") {
        setLogViewer(null);
        return;
      }
      if (key.upArrow || input === "k") {
        setLogViewer((prev) =>
          prev
            ? { ...prev, scrollOffset: Math.max(0, prev.scrollOffset - 1) }
            : null,
        );
        return;
      }
      if (key.downArrow || input === "j") {
        const lines = logViewer.logs.split("\n").length;
        const maxOffset = Math.max(0, lines - (dimensions.height - 6));
        setLogViewer((prev) =>
          prev
            ? {
                ...prev,
                scrollOffset: Math.min(maxOffset, prev.scrollOffset + 1),
              }
            : null,
        );
        return;
      }
      return;
    }

    // Canvas navigation takes highest priority
    if (handleNavInput(input, key)) {
      return;
    }

    // Help overlay
    if (input === "?") {
      setShowHelp((h) => !h);
      return;
    }
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Exit
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((i) => Math.min(containers.length - 1, i + 1));
    }

    // Actions
    else if (input === "s") {
      handleStart();
    } else if (input === "x") {
      handleStop();
    } else if (input === "R") {
      handleRestart();
    } else if (input === "p") {
      handlePauseToggle();
    } else if (input === "l") {
      handleViewLogs();
    } else if (key.return) {
      setShowDetails((d) => !d);
    }

    // View controls
    else if (input === " ") {
      setPaused((p) => !p);
    } else if (input === "r") {
      fetchData();
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
  const contentHeight = termHeight - headerHeight - statusBarHeight - 4;

  const listWidth = showDetails ? Math.floor(termWidth * 0.55) : termWidth - 2;
  const detailsWidth = termWidth - listWidth - 3;

  // Docker not available screen
  if (dockerInfo && !dockerInfo.available) {
    return (
      <Box
        flexDirection="column"
        width={termWidth}
        height={termHeight}
        alignItems="center"
        justifyContent="center"
      >
        <DockerUnavailable width={termWidth} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={DOCKER_COLORS.neonMagenta}
      >
        <Text color={DOCKER_COLORS.neonCyan} bold>
          {"// DOCKER MONITOR //"}
        </Text>
        {dockerInfo && (
          <Text color={DOCKER_COLORS.dim}>
            v{dockerInfo.version} |{" "}
            <Text color={DOCKER_COLORS.neonGreen}>
              {dockerInfo.containers.running}
            </Text>{" "}
            running |{" "}
            <Text color={DOCKER_COLORS.neonYellow}>
              {dockerInfo.containers.paused}
            </Text>{" "}
            paused |{" "}
            <Text color={DOCKER_COLORS.neonRed}>
              {dockerInfo.containers.stopped}
            </Text>{" "}
            stopped
          </Text>
        )}
      </Box>

      {/* Status indicator */}
      <Box paddingX={1} marginY={1}>
        {paused ? (
          <Text color={DOCKER_COLORS.neonYellow}>PAUSED</Text>
        ) : isRefreshing ? (
          <Text color={DOCKER_COLORS.neonGreen}>
            <Spinner type="dots" /> Refreshing...
          </Text>
        ) : (
          <Text color={DOCKER_COLORS.dim}>
            Live ({refreshIntervalSec}s interval)
          </Text>
        )}
        {actionMessage && (
          <Text color={DOCKER_COLORS.neonYellow}> | {actionMessage}</Text>
        )}
        {error && <Text color={DOCKER_COLORS.neonRed}> | Error: {error}</Text>}
      </Box>

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Container list */}
        <Box flexDirection="column" width={listWidth}>
          <Box marginBottom={1}>
            <Text color={DOCKER_COLORS.neonMagenta} bold>
              {"[ CONTAINERS ]"}
            </Text>
            <Text color={DOCKER_COLORS.dim}> ({containers.length})</Text>
          </Box>

          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={DOCKER_COLORS.dim}
            height={contentHeight - 3}
          >
            {containers.length === 0 ? (
              <Box paddingX={1}>
                <Text color={DOCKER_COLORS.dim}>No containers found</Text>
              </Box>
            ) : (
              containers.map((container, i) => (
                <ContainerRow
                  key={container.id}
                  container={container}
                  isSelected={i === selectedIndex}
                  width={listWidth - 2}
                  showStats={showStats}
                />
              ))
            )}
          </Box>
        </Box>

        {/* Details panel */}
        {showDetails && (
          <Box flexDirection="column" width={detailsWidth} marginLeft={1}>
            <ContainerDetails
              container={selectedContainer}
              width={detailsWidth}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={DOCKER_COLORS.dim}>
          Tab switch | ? help | Space pause | r refresh | +/- interval | q quit
        </Text>
      </Box>

      {/* Help overlay */}
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
            title="DOCKER MONITOR"
            bindings={DOCKER_BINDINGS}
            visible={showHelp}
            width={Math.min(55, termWidth - 10)}
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
            currentCanvas="docker"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}

      {/* Log viewer overlay */}
      {logViewer && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <LogViewer
            logState={logViewer}
            width={Math.min(100, termWidth - 4)}
            height={Math.min(30, termHeight - 4)}
            onClose={() => setLogViewer(null)}
          />
        </Box>
      )}
    </Box>
  );
}
