// Log Viewer Canvas - Real-time log file viewer TUI

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import { type LogsConfig, LOG_COLORS } from "./logs/types";
import {
  HelpOverlay,
  type KeyBinding,
  COMMON_BINDINGS,
} from "../components/help-overlay";

// Log viewer keybindings
const LOGS_BINDINGS: KeyBinding[] = [
  { key: "o", description: "Open file (path input)", category: "action" },
  { key: "/", description: "Filter by pattern", category: "action" },
  { key: "f", description: "Toggle follow mode", category: "view" },
  { key: "c", description: "Clear screen", category: "action" },
  { key: "↑/↓", description: "Scroll line by line", category: "navigation" },
  {
    key: "PgUp/PgDn",
    description: "Scroll page by page",
    category: "navigation",
  },
  { key: "g/G", description: "Go to top/bottom", category: "navigation" },
  { key: "l", description: "Toggle line numbers", category: "view" },
  { key: "t", description: "Toggle timestamps", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  logService,
  filterLogLines,
  formatSize,
  type LogLine,
  type LogLevel,
  type FileInfo,
} from "../services/logs";

interface Props {
  id: string;
  config?: LogsConfig;
  socketPath?: string;
  scenario?: string;
}

// Get color for log level
function getLevelColor(level: LogLevel): string {
  return LOG_COLORS[level] || LOG_COLORS.UNKNOWN;
}

// Log line display component
function LogLineDisplay({
  line,
  showLineNumber,
  showTimestamp,
  width,
}: {
  line: LogLine;
  showLineNumber: boolean;
  showTimestamp: boolean;
  width: number;
}) {
  const levelColor = getLevelColor(line.level);
  const lineNumWidth = showLineNumber ? 6 : 0;
  const timestampWidth =
    showTimestamp && line.timestamp ? line.timestamp.length + 1 : 0;
  const levelWidth = 6; // "[ERR] " etc
  const contentWidth = Math.max(
    10,
    width - lineNumWidth - timestampWidth - levelWidth,
  );

  // Truncate content if too long
  const displayContent =
    line.content.length > contentWidth
      ? line.content.slice(0, contentWidth - 3) + "..."
      : line.content;

  // Short level indicator
  const levelIndicator = {
    ERROR: "[ERR]",
    WARN: "[WRN]",
    INFO: "[INF]",
    DEBUG: "[DBG]",
    UNKNOWN: "[---]",
  }[line.level];

  return (
    <Box>
      {showLineNumber && (
        <Text color={LOG_COLORS.dim}>
          {line.lineNumber > 0
            ? line.lineNumber.toString().padStart(5, " ")
            : "    -"}{" "}
        </Text>
      )}
      {showTimestamp && line.timestamp && (
        <Text color={LOG_COLORS.dim}>{line.timestamp} </Text>
      )}
      <Text color={levelColor}>{levelIndicator} </Text>
      <Text color={line.level === "UNKNOWN" ? "white" : levelColor}>
        {displayContent}
      </Text>
    </Box>
  );
}

// File info header
function FileHeader({
  filePath,
  fileInfo,
  lineCount,
  filteredCount,
  filterPattern,
  followMode,
  width,
}: {
  filePath: string | null;
  fileInfo: FileInfo | null;
  lineCount: number;
  filteredCount: number;
  filterPattern: string;
  followMode: boolean;
  width: number;
}) {
  const displayPath = filePath
    ? filePath.length > width - 20
      ? "..." + filePath.slice(-(width - 23))
      : filePath
    : "No file opened";

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={LOG_COLORS.neonMagenta}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text color={LOG_COLORS.neonCyan} bold>
          {"// LOG VIEWER //"}
        </Text>
        <Box>
          {followMode && (
            <Text color={LOG_COLORS.neonGreen} bold>
              [FOLLOW]{" "}
            </Text>
          )}
          {filterPattern && (
            <Text color={LOG_COLORS.neonYellow}>
              Filter: /{filterPattern}/{" "}
            </Text>
          )}
        </Box>
      </Box>
      <Box justifyContent="space-between">
        <Text color={filePath ? LOG_COLORS.neonCyan : LOG_COLORS.dim}>
          {displayPath}
        </Text>
        {fileInfo && fileInfo.exists && (
          <Text color={LOG_COLORS.dim}>
            {formatSize(fileInfo.size)} | {lineCount} lines
            {filteredCount !== lineCount && ` (${filteredCount} shown)`}
          </Text>
        )}
      </Box>
    </Box>
  );
}

// Path input overlay
function PathInput({
  visible,
  value,
  onChange,
  onSubmit,
  onCancel,
  width,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  width: number;
}) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={LOG_COLORS.neonCyan}
      paddingX={2}
      paddingY={1}
      width={Math.min(width - 4, 80)}
    >
      <Text color={LOG_COLORS.neonCyan} bold>
        {"[ OPEN FILE ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={LOG_COLORS.dim}>Path: </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="/path/to/logfile.log"
        />
      </Box>
      <Box marginTop={1}>
        <Text color={LOG_COLORS.dim}>Enter to open | Esc to cancel</Text>
      </Box>
    </Box>
  );
}

// Filter input overlay
function FilterInput({
  visible,
  value,
  onChange,
  onSubmit,
  onCancel,
  width,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  width: number;
}) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={LOG_COLORS.neonYellow}
      paddingX={2}
      paddingY={1}
      width={Math.min(width - 4, 60)}
    >
      <Text color={LOG_COLORS.neonYellow} bold>
        {"[ FILTER ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={LOG_COLORS.dim}>Pattern: /</Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="error|warn|pattern.*"
        />
        <Text color={LOG_COLORS.dim}>/</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={LOG_COLORS.dim}>
          Enter to apply | Esc to cancel | Empty to clear
        </Text>
      </Box>
    </Box>
  );
}

export function LogsCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "logs",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // File state
  const [filePath, setFilePath] = useState<string | null>(
    initialConfig?.files?.[0] || null,
  );
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [scrollOffset, setScrollOffset] = useState(0);
  const [followMode, setFollowMode] = useState(
    initialConfig?.followMode !== false,
  );
  const [filterPattern, setFilterPattern] = useState(
    initialConfig?.filter || "",
  );
  const [showLineNumbers, setShowLineNumbers] = useState(
    initialConfig?.showLineNumbers !== false,
  );
  const [showTimestamps, setShowTimestamps] = useState(
    initialConfig?.showTimestamp !== false,
  );

  // Input state
  const [showPathInput, setShowPathInput] = useState(false);
  const [pathInputValue, setPathInputValue] = useState("");
  const [showFilterInput, setShowFilterInput] = useState(false);
  const [filterInputValue, setFilterInputValue] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Max lines to keep
  const maxLines = initialConfig?.maxLines || 5000;

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
    "logs",
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

  // Load file content
  const loadFile = useCallback(
    async (path: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Get file info
        const info = await logService.getInfo(path);
        setFileInfo(info);

        if (!info.exists) {
          setError(info.error || "File not found");
          setLines([]);
          setIsLoading(false);
          return;
        }

        // Read initial content (last maxLines lines)
        const fileLines = await logService.tail(path, maxLines);
        setLines(fileLines);

        // Scroll to bottom in follow mode
        setScrollOffset(Math.max(0, fileLines.length - getVisibleLineCount()));

        setFilePath(path);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [maxLines],
  );

  // Calculate visible line count
  const getVisibleLineCount = useCallback(() => {
    const headerHeight = 4;
    const statusBarHeight = 2;
    return Math.max(1, dimensions.height - headerHeight - statusBarHeight);
  }, [dimensions.height]);

  // Set up file watcher
  useEffect(() => {
    if (!filePath) return;

    logService.watch(filePath, (newLines) => {
      setLines((prev) => {
        const combined = [...prev, ...newLines];
        // Trim to max lines
        if (combined.length > maxLines) {
          return combined.slice(-maxLines);
        }
        return combined;
      });

      // Update file info
      logService.getInfo(filePath).then(setFileInfo);
    });

    return () => {
      logService.unwatch(filePath);
    };
  }, [filePath, maxLines]);

  // Auto-scroll in follow mode when new lines arrive
  useEffect(() => {
    if (followMode) {
      const filteredLines = filterLogLines(lines, filterPattern);
      const visibleCount = getVisibleLineCount();
      setScrollOffset(Math.max(0, filteredLines.length - visibleCount));
    }
  }, [lines, followMode, filterPattern, getVisibleLineCount]);

  // Load initial file if provided
  useEffect(() => {
    if (initialConfig?.files?.[0]) {
      loadFile(initialConfig.files[0]);
    }
  }, []);

  // Filtered lines
  const filteredLines = filterLogLines(lines, filterPattern);
  const visibleLineCount = getVisibleLineCount();

  // Keyboard input
  useInput((input, key) => {
    // Path input mode
    if (showPathInput) {
      if (key.escape) {
        setShowPathInput(false);
        setPathInputValue("");
      }
      return;
    }

    // Filter input mode
    if (showFilterInput) {
      if (key.escape) {
        setShowFilterInput(false);
        setFilterInputValue(filterPattern);
      }
      return;
    }

    // Canvas navigation takes priority
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

    // Quit
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      logService.unwatchAll();
      exit();
      return;
    }

    // Open file
    if (input === "o") {
      setPathInputValue(filePath || "");
      setShowPathInput(true);
      return;
    }

    // Filter
    if (input === "/") {
      setFilterInputValue(filterPattern);
      setShowFilterInput(true);
      return;
    }

    // Toggle follow mode
    if (input === "f") {
      setFollowMode((f) => !f);
      return;
    }

    // Clear screen (reload file)
    if (input === "c") {
      if (filePath) {
        loadFile(filePath);
      } else {
        setLines([]);
      }
      return;
    }

    // Toggle line numbers
    if (input === "l") {
      setShowLineNumbers((s) => !s);
      return;
    }

    // Toggle timestamps
    if (input === "t") {
      setShowTimestamps((s) => !s);
      return;
    }

    // Refresh
    if (input === "r") {
      if (filePath) {
        loadFile(filePath);
      }
      return;
    }

    // Scroll navigation
    if (key.upArrow) {
      setFollowMode(false);
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (key.downArrow) {
      setFollowMode(false);
      setScrollOffset((o) =>
        Math.min(filteredLines.length - visibleLineCount, o + 1),
      );
      return;
    }
    if (key.pageUp) {
      setFollowMode(false);
      setScrollOffset((o) => Math.max(0, o - visibleLineCount));
      return;
    }
    if (key.pageDown) {
      setFollowMode(false);
      setScrollOffset((o) =>
        Math.min(filteredLines.length - visibleLineCount, o + visibleLineCount),
      );
      return;
    }

    // Go to top
    if (input === "g") {
      setFollowMode(false);
      setScrollOffset(0);
      return;
    }

    // Go to bottom
    if (input === "G") {
      setFollowMode(true);
      setScrollOffset(Math.max(0, filteredLines.length - visibleLineCount));
      return;
    }
  });

  // Handle path input submit
  const handlePathSubmit = useCallback(() => {
    if (pathInputValue.trim()) {
      loadFile(pathInputValue.trim());
    }
    setShowPathInput(false);
    setPathInputValue("");
  }, [pathInputValue, loadFile]);

  // Handle filter input submit
  const handleFilterSubmit = useCallback(() => {
    setFilterPattern(filterInputValue);
    setShowFilterInput(false);
    // Reset scroll when filter changes
    setScrollOffset(0);
  }, [filterInputValue]);

  // Get visible lines
  const visibleLines = filteredLines.slice(
    scrollOffset,
    scrollOffset + visibleLineCount,
  );

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <FileHeader
        filePath={filePath}
        fileInfo={fileInfo}
        lineCount={lines.length}
        filteredCount={filteredLines.length}
        filterPattern={filterPattern}
        followMode={followMode}
        width={termWidth}
      />

      {/* Status indicator */}
      <Box paddingX={1} marginY={1}>
        {isLoading ? (
          <Text color={LOG_COLORS.neonGreen}>
            <Spinner type="dots" /> Loading...
          </Text>
        ) : error ? (
          <Text color={LOG_COLORS.neonRed}>Error: {error}</Text>
        ) : !filePath ? (
          <Text color={LOG_COLORS.dim}>Press 'o' to open a log file</Text>
        ) : (
          <Text color={LOG_COLORS.dim}>
            Showing {scrollOffset + 1}-
            {Math.min(scrollOffset + visibleLineCount, filteredLines.length)} of{" "}
            {filteredLines.length}
          </Text>
        )}
      </Box>

      {/* Log content */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        borderStyle="single"
        borderColor={LOG_COLORS.dim}
      >
        {visibleLines.length === 0 ? (
          <Box
            justifyContent="center"
            alignItems="center"
            height={visibleLineCount}
          >
            <Text color={LOG_COLORS.dim}>
              {!filePath
                ? "No file opened"
                : filterPattern
                  ? "No lines match filter"
                  : "File is empty"}
            </Text>
          </Box>
        ) : (
          visibleLines.map((line, index) => (
            <LogLineDisplay
              key={`${scrollOffset + index}-${line.content.slice(0, 20)}`}
              line={line}
              showLineNumber={showLineNumbers}
              showTimestamp={showTimestamps}
              width={termWidth - 4}
            />
          ))
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={LOG_COLORS.dim}>
          Tab switch | ? help | o open | / filter | f follow | g/G top/bottom |
          arrows scroll | q quit
        </Text>
      </Box>

      {/* Path input overlay */}
      {showPathInput && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <PathInput
            visible={showPathInput}
            value={pathInputValue}
            onChange={setPathInputValue}
            onSubmit={handlePathSubmit}
            onCancel={() => {
              setShowPathInput(false);
              setPathInputValue("");
            }}
            width={termWidth}
          />
        </Box>
      )}

      {/* Filter input overlay */}
      {showFilterInput && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <FilterInput
            visible={showFilterInput}
            value={filterInputValue}
            onChange={setFilterInputValue}
            onSubmit={handleFilterSubmit}
            onCancel={() => {
              setShowFilterInput(false);
              setFilterInputValue(filterPattern);
            }}
            width={termWidth}
          />
        </Box>
      )}

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
            title="LOG VIEWER"
            bindings={LOGS_BINDINGS}
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
            currentCanvas="logs"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
