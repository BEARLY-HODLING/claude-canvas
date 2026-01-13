// Network Monitor Canvas - Real-time network monitoring TUI

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type NetworkConfig,
  CYBER_COLORS,
  LATENCY_THRESHOLDS,
} from "./network/types";
import { HelpOverlay, type KeyBinding } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  networkService,
  getNetworkInterfaces,
  checkDNS,
  latencySparkline,
  getLatencyStatus,
  DEFAULT_HOSTS,
  type HostMonitor,
  type NetworkInterface,
  type DNSResult,
} from "../services/network";

interface Props {
  id: string;
  config?: NetworkConfig;
  socketPath?: string;
  scenario?: string;
}

// Network keybindings
const NETWORK_BINDINGS: KeyBinding[] = [
  { key: "↑/↓", description: "Navigate hosts", category: "navigation" },
  { key: "a", description: "Add host to monitor", category: "action" },
  { key: "d", description: "Remove selected host", category: "action" },
  { key: "+/-", description: "Adjust ping interval", category: "view" },
  { key: "r", description: "Manual refresh", category: "action" },
  { key: "i", description: "Toggle interfaces panel", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  { key: "q/Esc", description: "Quit", category: "other" },
  { key: "?", description: "Toggle help", category: "other" },
];

// Status indicator component
function StatusIndicator({
  status,
}: {
  status: "good" | "ok" | "slow" | "failed";
}) {
  const colors = {
    good: CYBER_COLORS.neonGreen,
    ok: CYBER_COLORS.neonYellow,
    slow: CYBER_COLORS.neonRed,
    failed: CYBER_COLORS.neonRed,
  };

  const symbols = {
    good: "●",
    ok: "●",
    slow: "●",
    failed: "×",
  };

  return <Text color={colors[status]}>{symbols[status]}</Text>;
}

// Host monitor row component
function HostRow({
  monitor,
  isSelected,
  width,
}: {
  monitor: HostMonitor;
  isSelected: boolean;
  width: number;
}) {
  const { status, label } = getLatencyStatus(monitor.lastResult?.latency ?? -1);
  const sparkline = latencySparkline(monitor.latencyHistory);
  const hostWidth = Math.min(25, Math.floor(width * 0.3));

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
        {isSelected ? "▶ " : "  "}
      </Text>

      {/* Status indicator */}
      <StatusIndicator status={status} />

      {/* Host name */}
      <Text
        color={isSelected ? CYBER_COLORS.neonCyan : "white"}
        bold={isSelected}
      >
        {" "}
        {monitor.host.padEnd(hostWidth).slice(0, hostWidth)}
      </Text>

      {/* Latency */}
      <Text
        color={status === "failed" ? CYBER_COLORS.neonRed : CYBER_COLORS.dim}
      >
        {" "}
        {monitor.lastResult?.latency !== undefined &&
        monitor.lastResult.latency >= 0
          ? `${monitor.lastResult.latency.toFixed(1)}ms`.padStart(10)
          : "---ms".padStart(10)}
      </Text>

      {/* Average latency */}
      <Text color={CYBER_COLORS.dim}>
        {" "}
        avg:{" "}
        {monitor.avgLatency >= 0
          ? `${monitor.avgLatency.toFixed(1)}ms`.padStart(8)
          : "---ms".padStart(8)}
      </Text>

      {/* Packet loss */}
      <Text
        color={
          monitor.packetLoss > 10
            ? CYBER_COLORS.neonRed
            : monitor.packetLoss > 0
              ? CYBER_COLORS.neonYellow
              : CYBER_COLORS.dim
        }
      >
        {" "}
        loss: {`${monitor.packetLoss.toFixed(1)}%`.padStart(6)}
      </Text>

      {/* Status label */}
      <Text
        color={
          status === "good"
            ? CYBER_COLORS.neonGreen
            : status === "ok"
              ? CYBER_COLORS.neonYellow
              : CYBER_COLORS.neonRed
        }
        bold
      >
        {" "}
        [{label.padEnd(4)}]
      </Text>
    </Box>
  );
}

// Sparkline history panel
function SparklinePanel({
  monitors,
  selectedIndex,
  width,
}: {
  monitors: HostMonitor[];
  selectedIndex: number;
  width: number;
}) {
  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ LATENCY HISTORY ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {monitors.map((monitor, i) => {
          const isSelected = i === selectedIndex;
          const sparkline = latencySparkline(monitor.latencyHistory);
          const { status } = getLatencyStatus(
            monitor.lastResult?.latency ?? -1,
          );

          return (
            <Box key={monitor.host}>
              <Text
                color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}
              >
                {isSelected ? "▶" : " "}
              </Text>
              <Text
                color={isSelected ? CYBER_COLORS.neonCyan : "white"}
                bold={isSelected}
              >
                {" "}
                {monitor.host.slice(0, 15).padEnd(15)}
              </Text>
              <Text
                color={
                  status === "good"
                    ? CYBER_COLORS.neonGreen
                    : status === "ok"
                      ? CYBER_COLORS.neonYellow
                      : status === "failed"
                        ? CYBER_COLORS.neonRed
                        : CYBER_COLORS.dim
                }
              >
                {" "}
                {sparkline || "No data"}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Network interfaces panel
function InterfacesPanel({
  interfaces,
  width,
}: {
  interfaces: NetworkInterface[];
  width: number;
}) {
  // Filter to show only IPv4 external interfaces
  const externalInterfaces = interfaces.filter(
    (iface) => iface.family === "IPv4" && !iface.internal,
  );

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ NETWORK INTERFACES ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {externalInterfaces.length === 0 ? (
          <Text color={CYBER_COLORS.dim}>No external interfaces</Text>
        ) : (
          externalInterfaces.map((iface) => (
            <Box key={`${iface.name}-${iface.address}`} flexDirection="column">
              <Box>
                <Text color={CYBER_COLORS.neonCyan} bold>
                  {iface.name}
                </Text>
                <Text color={CYBER_COLORS.dim}> ({iface.family})</Text>
              </Box>
              <Box marginLeft={2}>
                <Text color={CYBER_COLORS.dim}>IP: </Text>
                <Text color="white">{iface.address}</Text>
              </Box>
              <Box marginLeft={2}>
                <Text color={CYBER_COLORS.dim}>MAC: </Text>
                <Text color={CYBER_COLORS.dim}>{iface.mac}</Text>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

// DNS check panel
function DNSPanel({
  dnsResults,
  width,
}: {
  dnsResults: Map<string, DNSResult>;
  width: number;
}) {
  const results = Array.from(dnsResults.values());

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ DNS RESOLUTION ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {results.length === 0 ? (
          <Text color={CYBER_COLORS.dim}>No DNS checks</Text>
        ) : (
          results.map((result) => (
            <Box key={result.domain}>
              <StatusIndicator status={result.resolved ? "good" : "failed"} />
              <Text color="white"> {result.domain.padEnd(20)}</Text>
              <Text
                color={
                  result.resolved
                    ? CYBER_COLORS.neonGreen
                    : CYBER_COLORS.neonRed
                }
              >
                {result.resolved ? result.ip : "FAILED"}
              </Text>
              <Text color={CYBER_COLORS.dim}> ({result.time}ms)</Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

export function NetworkCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "network",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Host monitoring state
  const [monitors, setMonitors] = useState<HostMonitor[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Network interfaces
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [showInterfaces, setShowInterfaces] = useState(
    initialConfig?.showInterfaces !== false,
  );

  // DNS results
  const [dnsResults, setDnsResults] = useState<Map<string, DNSResult>>(
    new Map(),
  );
  const [showDNS, setShowDNS] = useState(initialConfig?.showDNS !== false);

  // Settings
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    initialConfig?.refreshInterval || 5,
  );
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Add host mode
  const [addHostMode, setAddHostMode] = useState(false);
  const [newHostInput, setNewHostInput] = useState("");

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Alert tracking
  const sentAlertsRef = useRef<Set<string>>(new Set());

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
    "network",
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

  // Initialize hosts
  useEffect(() => {
    const hosts = initialConfig?.hosts || DEFAULT_HOSTS;
    hosts.forEach((host) => networkService.addHost(host));
    setMonitors(networkService.getAllMonitors());
    // Get interfaces
    setInterfaces(getNetworkInterfaces());
  }, [initialConfig?.hosts]);

  // Ping all hosts
  const doPing = useCallback(async () => {
    if (paused) return;

    setIsRefreshing(true);
    try {
      await networkService.pingAllHosts();
      const updatedMonitors = networkService.getAllMonitors();
      setMonitors([...updatedMonitors]);

      // Check for DNS on domain hosts
      const domains = updatedMonitors.filter((m) => m.type === "domain");
      for (const domain of domains) {
        const dnsResult = await checkDNS(domain.host);
        setDnsResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(domain.host, dnsResult);
          return newMap;
        });
      }

      // Check for alert conditions (high latency or packet loss)
      for (const monitor of updatedMonitors) {
        if (monitor.status === "offline") {
          const alertKey = `offline-${monitor.host}`;
          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);
            ipc.sendAlert({
              type: "host-offline",
              message: `Host ${monitor.host} is offline`,
              data: { host: monitor.host },
            });
          }
        } else {
          sentAlertsRef.current.delete(`offline-${monitor.host}`);
        }

        if (monitor.packetLoss > 20) {
          const alertKey = `packetloss-${monitor.host}`;
          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);
            ipc.sendAlert({
              type: "packet-loss",
              message: `High packet loss on ${monitor.host}: ${monitor.packetLoss}%`,
              data: { host: monitor.host, packetLoss: monitor.packetLoss },
            });
          }
        } else {
          sentAlertsRef.current.delete(`packetloss-${monitor.host}`);
        }
      }

      setError(null);
    } catch (err) {
      setError(`Ping failed: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [paused, ipc]);

  // Initial ping
  useEffect(() => {
    doPing();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(doPing, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [paused, refreshIntervalSec, doPing]);

  // Add new host
  const addHost = useCallback((host: string) => {
    const trimmed = host.trim();
    if (!trimmed) return;

    networkService.addHost(trimmed);
    setMonitors(networkService.getAllMonitors());
    setAddHostMode(false);
    setNewHostInput("");
  }, []);

  // Remove selected host
  const removeHost = useCallback(() => {
    const monitor = monitors[selectedIndex];
    if (!monitor) return;

    networkService.removeHost(monitor.host);
    setMonitors(networkService.getAllMonitors());
    setSelectedIndex((i) => Math.max(0, Math.min(i, monitors.length - 2)));
  }, [monitors, selectedIndex]);

  // Keyboard input
  useInput((input, key) => {
    // Canvas navigation takes highest priority
    if (handleNavInput(input, key)) {
      return;
    }

    // Add host mode
    if (addHostMode) {
      if (key.escape) {
        setAddHostMode(false);
        setNewHostInput("");
        return;
      }
      // TextInput handles the rest
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

    // Quit
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Navigation
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(monitors.length - 1, i + 1));
    }

    // Actions
    if (input === "a") {
      setAddHostMode(true);
    } else if (input === "d") {
      removeHost();
    } else if (input === "r") {
      doPing();
    } else if (input === " " || input === "p") {
      setPaused((p) => !p);
    } else if (input === "i") {
      setShowInterfaces((s) => !s);
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

  const leftWidth = Math.floor(termWidth * 0.6);
  const rightWidth = termWidth - leftWidth - 2;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={CYBER_COLORS.neonMagenta}
      >
        <Text color={CYBER_COLORS.neonCyan} bold>
          {"// NETWORK MONITOR //"}
        </Text>
        <Text color={CYBER_COLORS.dim}>{monitors.length} hosts monitored</Text>
        <Text color={CYBER_COLORS.neonYellow}>
          Interval: {refreshIntervalSec}s
        </Text>
      </Box>

      {/* Status indicator */}
      <Box paddingX={1} marginY={1}>
        {paused ? (
          <Text color={CYBER_COLORS.neonYellow}>PAUSED</Text>
        ) : isRefreshing ? (
          <Text color={CYBER_COLORS.neonGreen}>
            <Spinner type="dots" /> Pinging...
          </Text>
        ) : (
          <Text color={CYBER_COLORS.dim}>
            Live ({refreshIntervalSec}s interval)
          </Text>
        )}
        {error && <Text color={CYBER_COLORS.neonRed}> | Error: {error}</Text>}
      </Box>

      {/* Add host input */}
      {addHostMode && (
        <Box paddingX={1} marginBottom={1}>
          <Text color={CYBER_COLORS.neonCyan}>Add host: </Text>
          <TextInput
            value={newHostInput}
            onChange={setNewHostInput}
            onSubmit={addHost}
            placeholder="IP or domain (e.g., 8.8.4.4 or cloudflare.com)"
          />
          <Text color={CYBER_COLORS.dim}> (Enter to add, Esc to cancel)</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left column - Host list and sparklines */}
        <Box flexDirection="column" width={leftWidth}>
          {/* Host list */}
          <Box flexDirection="column" marginBottom={1}>
            <Box marginBottom={1}>
              <Text color={CYBER_COLORS.neonMagenta} bold>
                {"[ PING MONITOR ]"}
              </Text>
            </Box>
            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={CYBER_COLORS.dim}
              paddingX={1}
            >
              {monitors.length === 0 ? (
                <Text color={CYBER_COLORS.dim}>
                  No hosts monitored. Press 'a' to add.
                </Text>
              ) : (
                monitors.map((monitor, i) => (
                  <HostRow
                    key={monitor.host}
                    monitor={monitor}
                    isSelected={i === selectedIndex}
                    width={leftWidth - 4}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* Sparkline history */}
          <SparklinePanel
            monitors={monitors}
            selectedIndex={selectedIndex}
            width={leftWidth - 2}
          />
        </Box>

        {/* Right column - Interfaces and DNS */}
        <Box flexDirection="column" width={rightWidth} marginLeft={1}>
          {showInterfaces && (
            <Box marginBottom={1}>
              <InterfacesPanel interfaces={interfaces} width={rightWidth - 1} />
            </Box>
          )}

          {showDNS && dnsResults.size > 0 && (
            <DNSPanel dnsResults={dnsResults} width={rightWidth - 1} />
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          Tab switch | ? help | a add | d remove | +/- interval | r refresh |
          space pause | q quit
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
            title="NETWORK MONITOR"
            bindings={NETWORK_BINDINGS}
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
            currentCanvas="network"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
