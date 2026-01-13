// Process Manager Canvas - htop-like process viewer TUI

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type ProcessConfig,
  type SortField,
  type SortDirection,
  type KillConfirmation,
  type SearchState,
  PROCESS_COLORS,
} from "./process/types";
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
  processService,
  formatState,
  getStateColor,
  getStateIcon,
  type Process,
  type ProcessTreeNode,
} from "../services/process";

interface Props {
  id: string;
  config?: ProcessConfig;
  socketPath?: string;
  scenario?: string;
}

// Process canvas keybindings
export const PROCESS_BINDINGS: KeyBinding[] = [
  {
    key: "j/k or Up/Dn",
    description: "Navigate process list",
    category: "navigation",
  },
  { key: "c", description: "Sort by CPU", category: "action" },
  { key: "m", description: "Sort by MEM", category: "action" },
  { key: "p", description: "Sort by PID", category: "action" },
  { key: "n", description: "Sort by NAME", category: "action" },
  { key: "k", description: "Kill process (SIGTERM)", category: "action" },
  { key: "K", description: "Force kill (SIGKILL)", category: "action" },
  { key: "t", description: "Toggle tree view", category: "view" },
  { key: "/", description: "Search/filter processes", category: "action" },
  { key: "Esc", description: "Clear search/cancel", category: "action" },
  { key: "Space", description: "Pause/resume auto-refresh", category: "view" },
  { key: "+/-", description: "Adjust refresh interval", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Progress bar component
function ProgressBar({
  percent,
  width,
  color,
}: {
  percent: number;
  width: number;
  color: string;
}) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color={PROCESS_COLORS.dim}>{"░".repeat(empty)}</Text>
    </Text>
  );
}

// Get color for CPU percentage
function getCpuColor(cpu: number): string {
  if (cpu > 80) return PROCESS_COLORS.neonRed;
  if (cpu > 50) return PROCESS_COLORS.neonYellow;
  return PROCESS_COLORS.neonGreen;
}

// Get color for MEM percentage
function getMemColor(mem: number): string {
  if (mem > 80) return PROCESS_COLORS.neonRed;
  if (mem > 50) return PROCESS_COLORS.neonYellow;
  return PROCESS_COLORS.neonCyan;
}

// Process row component
function ProcessRow({
  process,
  isSelected,
  width,
  barWidth,
}: {
  process: Process;
  isSelected: boolean;
  width: number;
  barWidth: number;
}) {
  const cpuColor = getCpuColor(process.cpu);
  const memColor = getMemColor(process.mem);
  const stateColor = getStateColor(process.state);
  const stateIcon = getStateIcon(process.state);

  // Calculate column widths
  const pidWidth = 7;
  const userWidth = Math.min(10, Math.floor(width * 0.08));
  const cpuBarWidth = Math.max(8, barWidth);
  const memBarWidth = Math.max(8, barWidth);
  const commandWidth = Math.max(
    20,
    width - pidWidth - userWidth - cpuBarWidth - memBarWidth - 25,
  );

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + "\u2026";
  };

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={isSelected ? PROCESS_COLORS.neonCyan : PROCESS_COLORS.dim}>
        {isSelected ? "\u25B6" : " "}
      </Text>

      {/* State icon */}
      <Text color={stateColor}> {stateIcon} </Text>

      {/* PID */}
      <Text color={isSelected ? "white" : PROCESS_COLORS.dim}>
        {process.pid.toString().padStart(pidWidth - 1)}
      </Text>

      {/* User */}
      <Text color={PROCESS_COLORS.dim}>
        {" "}
        {truncate(process.user, userWidth).padEnd(userWidth)}
      </Text>

      {/* CPU bar and percent */}
      <Text color={PROCESS_COLORS.dim}> </Text>
      <ProgressBar percent={process.cpu} width={cpuBarWidth} color={cpuColor} />
      <Text color={cpuColor}> {process.cpu.toFixed(1).padStart(5)}%</Text>

      {/* MEM bar and percent */}
      <Text color={PROCESS_COLORS.dim}> </Text>
      <ProgressBar percent={process.mem} width={memBarWidth} color={memColor} />
      <Text color={memColor}> {process.mem.toFixed(1).padStart(5)}%</Text>

      {/* Command */}
      <Text color={isSelected ? "white" : PROCESS_COLORS.dim}>
        {" "}
        {truncate(process.command, commandWidth)}
      </Text>
    </Box>
  );
}

// Tree process row component
function TreeProcessRow({
  node,
  isSelected,
  width,
  barWidth,
}: {
  node: ProcessTreeNode;
  isSelected: boolean;
  width: number;
  barWidth: number;
}) {
  const { process, depth } = node;
  const cpuColor = getCpuColor(process.cpu);
  const memColor = getMemColor(process.mem);
  const stateColor = getStateColor(process.state);
  const stateIcon = getStateIcon(process.state);

  // Indent for tree depth
  const indent = "  ".repeat(Math.min(depth, 5));
  const treeChar = depth > 0 ? "\u251C\u2500" : "";

  // Calculate column widths
  const pidWidth = 7;
  const cpuBarWidth = Math.max(6, barWidth - 2);
  const memBarWidth = Math.max(6, barWidth - 2);
  const indentWidth = indent.length + treeChar.length;
  const commandWidth = Math.max(
    15,
    width - pidWidth - cpuBarWidth - memBarWidth - indentWidth - 25,
  );

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + "\u2026";
  };

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={isSelected ? PROCESS_COLORS.neonCyan : PROCESS_COLORS.dim}>
        {isSelected ? "\u25B6" : " "}
      </Text>

      {/* State icon */}
      <Text color={stateColor}> {stateIcon} </Text>

      {/* PID */}
      <Text color={isSelected ? "white" : PROCESS_COLORS.dim}>
        {process.pid.toString().padStart(pidWidth - 1)}
      </Text>

      {/* Tree indent */}
      <Text color={PROCESS_COLORS.dim}>
        {" "}
        {indent}
        {treeChar}
      </Text>

      {/* CPU bar and percent */}
      <ProgressBar percent={process.cpu} width={cpuBarWidth} color={cpuColor} />
      <Text color={cpuColor}> {process.cpu.toFixed(1).padStart(5)}%</Text>

      {/* MEM bar and percent */}
      <Text color={PROCESS_COLORS.dim}> </Text>
      <ProgressBar percent={process.mem} width={memBarWidth} color={memColor} />
      <Text color={memColor}> {process.mem.toFixed(1).padStart(5)}%</Text>

      {/* Command */}
      <Text color={isSelected ? "white" : PROCESS_COLORS.dim}>
        {" "}
        {truncate(process.command, commandWidth)}
      </Text>
    </Box>
  );
}

// Kill confirmation dialog
function KillConfirmDialog({
  confirmation,
  width,
  onConfirm,
  onCancel,
}: {
  confirmation: KillConfirmation;
  width: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={PROCESS_COLORS.neonRed}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 4)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={PROCESS_COLORS.neonRed} bold>
          {"[ KILL PROCESS ]"}
        </Text>
      </Box>

      <Box>
        <Text color={PROCESS_COLORS.dim}>PID: </Text>
        <Text color="white">{confirmation.process.pid}</Text>
      </Box>
      <Box>
        <Text color={PROCESS_COLORS.dim}>Command: </Text>
        <Text color="white">{confirmation.process.command.slice(0, 40)}</Text>
      </Box>
      <Box>
        <Text color={PROCESS_COLORS.dim}>Signal: </Text>
        <Text
          color={
            confirmation.signal === "KILL"
              ? PROCESS_COLORS.neonRed
              : PROCESS_COLORS.neonYellow
          }
        >
          {confirmation.signal}
        </Text>
      </Box>

      <Box marginTop={1} justifyContent="center">
        <Text color={PROCESS_COLORS.neonYellow}>
          Are you sure? Press{" "}
          <Text color={PROCESS_COLORS.neonGreen} bold>
            y
          </Text>{" "}
          to confirm,{" "}
          <Text color={PROCESS_COLORS.neonRed} bold>
            n
          </Text>{" "}
          to cancel
        </Text>
      </Box>
    </Box>
  );
}

// Search input bar
function SearchBar({
  search,
  onQueryChange,
  onSubmit,
  onCancel,
}: {
  search: SearchState;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <Box>
      <Text color={PROCESS_COLORS.neonCyan} bold>
        Search:{" "}
      </Text>
      <TextInput
        value={search.query}
        onChange={onQueryChange}
        onSubmit={onSubmit}
        placeholder="filter by name, user, or PID..."
      />
      <Text color={PROCESS_COLORS.dim}> (Esc to clear)</Text>
    </Box>
  );
}

// Header with system info
function Header({
  processCount,
  sortField,
  sortDirection,
  treeMode,
  width,
}: {
  processCount: number;
  sortField: SortField;
  sortDirection: SortDirection;
  treeMode: boolean;
  width: number;
}) {
  const sortIndicator = sortDirection === "desc" ? "\u25BC" : "\u25B2";

  return (
    <Box
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderColor={PROCESS_COLORS.neonMagenta}
    >
      <Text color={PROCESS_COLORS.neonCyan} bold>
        {"// PROCESS MANAGER //"}
      </Text>
      <Text color={PROCESS_COLORS.dim}>
        {processCount} processes | Sort:{" "}
        <Text color={PROCESS_COLORS.neonYellow}>
          {sortField.toUpperCase()} {sortIndicator}
        </Text>
        {treeMode && <Text color={PROCESS_COLORS.neonGreen}> | TREE VIEW</Text>}
      </Text>
    </Box>
  );
}

// Column headers
function ColumnHeaders({
  width,
  barWidth,
}: {
  width: number;
  barWidth: number;
}) {
  return (
    <Box paddingX={1}>
      <Text color={PROCESS_COLORS.dim}>
        {"  "}ST{"   "}PID{"  "}USER{"       "}CPU%{"          "}MEM%
        {"         "}
        COMMAND
      </Text>
    </Box>
  );
}

// Main Process Canvas
export function ProcessCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "process",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Process data
  const [processes, setProcesses] = useState<Process[]>([]);
  const [treeNodes, setTreeNodes] = useState<ProcessTreeNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // View state
  const [paused, setPaused] = useState(false);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    initialConfig?.refreshInterval || 2,
  );
  const [treeMode, setTreeMode] = useState(initialConfig?.showTree || false);
  const [sortField, setSortField] = useState<SortField>(
    initialConfig?.sortField || "cpu",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialConfig?.sortDirection || "desc",
  );
  const [showHelp, setShowHelp] = useState(false);
  const [search, setSearch] = useState<SearchState>({
    active: false,
    query: initialConfig?.filter || "",
  });
  const [killConfirm, setKillConfirm] = useState<KillConfirmation | null>(null);

  // Alert thresholds
  const thresholds = initialConfig?.alertThresholds || {
    cpu: 90,
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
    "process",
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

  // Sort processes
  const sortProcesses = useCallback(
    (procs: Process[]): Process[] => {
      const sorted = [...procs];
      sorted.sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "cpu":
            cmp = a.cpu - b.cpu;
            break;
          case "mem":
            cmp = a.mem - b.mem;
            break;
          case "pid":
            cmp = a.pid - b.pid;
            break;
          case "command":
            cmp = a.command.localeCompare(b.command);
            break;
        }
        return sortDirection === "desc" ? -cmp : cmp;
      });
      return sorted;
    },
    [sortField, sortDirection],
  );

  // Filter processes
  const filterProcesses = useCallback(
    (procs: Process[]): Process[] => {
      if (!search.query) return procs;
      const query = search.query.toLowerCase();
      return procs.filter(
        (p) =>
          p.command.toLowerCase().includes(query) ||
          p.user.toLowerCase().includes(query) ||
          p.pid.toString().includes(query),
      );
    },
    [search.query],
  );

  // Flatten tree for navigation
  const flattenTree = useCallback(
    (nodes: ProcessTreeNode[]): ProcessTreeNode[] => {
      const result: ProcessTreeNode[] = [];
      const traverse = (node: ProcessTreeNode) => {
        result.push(node);
        for (const child of node.children) {
          traverse(child);
        }
      };
      for (const root of nodes) {
        traverse(root);
      }
      return result;
    },
    [],
  );

  // Fetch process data
  const fetchData = useCallback(async () => {
    if (paused) return;

    setIsRefreshing(true);
    try {
      if (treeMode) {
        const tree = await processService.getProcessTree();
        setTreeNodes(tree.root);
      } else {
        let procs = await processService.getProcessList();
        procs = filterProcesses(procs);
        procs = sortProcesses(procs);
        setProcesses(procs);
      }

      // Check for alert conditions
      const allProcs = treeMode
        ? flattenTree(treeNodes).map((n) => n.process)
        : processes;

      for (const proc of allProcs) {
        if (proc.cpu > (thresholds.cpu || 90)) {
          const alertKey = `cpu-${proc.pid}`;
          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);
            ipc.sendAlert({
              type: "process-cpu-high",
              message: `Process ${proc.command.slice(0, 20)} CPU at ${proc.cpu.toFixed(1)}%`,
              data: { pid: proc.pid, cpu: proc.cpu },
            });
          }
        }
      }

      setError(null);
    } catch (err) {
      setError(`Failed to fetch processes: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    paused,
    treeMode,
    sortProcesses,
    filterProcesses,
    flattenTree,
    thresholds,
    ipc,
    treeNodes,
    processes,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Re-fetch when sort/filter changes
  useEffect(() => {
    if (!paused) {
      fetchData();
    }
  }, [sortField, sortDirection, search.query, treeMode]);

  // Auto-refresh
  useEffect(() => {
    if (paused || killConfirm) return;

    const interval = setInterval(fetchData, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [paused, refreshIntervalSec, fetchData, killConfirm]);

  // Clear action message after delay
  useEffect(() => {
    if (!actionMessage) return;
    const timeout = setTimeout(() => setActionMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [actionMessage]);

  // Get current display list
  const flatTreeList = flattenTree(treeNodes);
  const displayList: (Process | ProcessTreeNode)[] = treeMode
    ? flatTreeList
    : processes;
  const selectedItem: Process | undefined = treeMode
    ? (flatTreeList[selectedIndex] as ProcessTreeNode)?.process
    : processes[selectedIndex];

  // Kill process handler
  const handleKill = async (signal: string) => {
    if (!selectedItem) return;

    if (!killConfirm) {
      setKillConfirm({
        process: selectedItem,
        signal,
        confirmed: false,
      });
      return;
    }

    // Actually kill the process
    const result = await processService.killProcess(
      killConfirm.process.pid,
      killConfirm.signal,
    );

    if (result.success) {
      setActionMessage(`Killed PID ${killConfirm.process.pid}`);
      setKillConfirm(null);
      fetchData();
    } else {
      setActionMessage(`Failed: ${result.error}`);
      setKillConfirm(null);
    }
  };

  // Keyboard input
  useInput((input, key) => {
    // Kill confirmation dialog
    if (killConfirm) {
      if (input === "y" || input === "Y") {
        handleKill(killConfirm.signal);
      } else if (input === "n" || input === "N" || key.escape) {
        setKillConfirm(null);
      }
      return;
    }

    // Search mode
    if (search.active) {
      if (key.escape) {
        setSearch({ active: false, query: "" });
      } else if (key.return) {
        setSearch((s) => ({ ...s, active: false }));
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
      if (search.query) {
        setSearch({ active: false, query: "" });
        return;
      }
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((i) => Math.min(displayList.length - 1, i + 1));
    }

    // Sort controls
    else if (input === "c") {
      setSortField("cpu");
      setSortDirection("desc");
    } else if (input === "m") {
      setSortField("mem");
      setSortDirection("desc");
    } else if (input === "p") {
      setSortField("pid");
      setSortDirection("asc");
    } else if (input === "n") {
      setSortField("command");
      setSortDirection("asc");
    }

    // Tree mode toggle
    else if (input === "t") {
      setTreeMode((t) => !t);
      setSelectedIndex(0);
    }

    // Search
    else if (input === "/") {
      setSearch((s) => ({ ...s, active: true }));
    }

    // Kill process
    else if (input === "K") {
      handleKill("KILL");
    } else if (input.toLowerCase() === "k" && !key.upArrow) {
      // 'k' alone without arrow key for kill
      if (input === "k" && !treeMode) {
        // In flat mode, k moves up only with arrow
        // So we need to distinguish
      }
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

  // Handle search input changes
  const handleSearchChange = (query: string) => {
    setSearch((s) => ({ ...s, query }));
  };

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const searchBarHeight = search.active ? 1 : 0;
  const contentHeight =
    termHeight - headerHeight - statusBarHeight - searchBarHeight - 3;
  const barWidth = Math.min(12, Math.floor(termWidth * 0.08));

  // Visible rows
  const maxVisibleRows = Math.max(5, contentHeight - 2);
  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(maxVisibleRows / 2),
      displayList.length - maxVisibleRows,
    ),
  );
  const visibleItems = displayList.slice(
    startIndex,
    startIndex + maxVisibleRows,
  );

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Header
        processCount={displayList.length}
        sortField={sortField}
        sortDirection={sortDirection}
        treeMode={treeMode}
        width={termWidth}
      />

      {/* Status indicator */}
      <Box paddingX={1} marginY={1}>
        {paused ? (
          <Text color={PROCESS_COLORS.neonYellow}>{"\u23F8"} PAUSED</Text>
        ) : isRefreshing ? (
          <Text color={PROCESS_COLORS.neonGreen}>
            <Spinner type="dots" /> Refreshing...
          </Text>
        ) : (
          <Text color={PROCESS_COLORS.dim}>
            {"\u25CF"} Live ({refreshIntervalSec}s interval)
          </Text>
        )}
        {actionMessage && (
          <Text color={PROCESS_COLORS.neonYellow}> | {actionMessage}</Text>
        )}
        {error && <Text color={PROCESS_COLORS.neonRed}> | Error: {error}</Text>}
      </Box>

      {/* Search bar */}
      {search.active && (
        <Box paddingX={1} marginBottom={1}>
          <SearchBar
            search={search}
            onQueryChange={handleSearchChange}
            onSubmit={() => setSearch((s) => ({ ...s, active: false }))}
            onCancel={() => setSearch({ active: false, query: "" })}
          />
        </Box>
      )}

      {/* Active filter indicator */}
      {!search.active && search.query && (
        <Box paddingX={1}>
          <Text color={PROCESS_COLORS.neonCyan}>
            Filter: "{search.query}" (Esc to clear)
          </Text>
        </Box>
      )}

      {/* Column headers */}
      <ColumnHeaders width={termWidth} barWidth={barWidth} />

      {/* Process list */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={PROCESS_COLORS.dim}
        height={contentHeight}
        paddingX={1}
      >
        {displayList.length === 0 ? (
          <Box>
            <Text color={PROCESS_COLORS.dim}>No processes found</Text>
          </Box>
        ) : treeMode ? (
          visibleItems.map((node, i) => (
            <TreeProcessRow
              key={(node as ProcessTreeNode).process.pid}
              node={node as ProcessTreeNode}
              isSelected={startIndex + i === selectedIndex}
              width={termWidth - 4}
              barWidth={barWidth}
            />
          ))
        ) : (
          visibleItems.map((item, i) => (
            <ProcessRow
              key={(item as Process).pid}
              process={item as Process}
              isSelected={startIndex + i === selectedIndex}
              width={termWidth - 4}
              barWidth={barWidth}
            />
          ))
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={PROCESS_COLORS.dim}>
          Tab switch | ? help | c/m/p/n sort | k kill | t tree | / search |
          Space pause | q quit
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
            title="PROCESS MANAGER"
            bindings={PROCESS_BINDINGS}
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
            currentCanvas="process"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}

      {/* Kill confirmation overlay */}
      {killConfirm && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <KillConfirmDialog
            confirmation={killConfirm}
            width={termWidth}
            onConfirm={() => handleKill(killConfirm.signal)}
            onCancel={() => setKillConfirm(null)}
          />
        </Box>
      )}
    </Box>
  );
}
