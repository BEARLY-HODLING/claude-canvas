// JSON Viewer Canvas - Interactive JSON file browser TUI

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type JSONConfig,
  type JSONResult,
  type ViewMode,
  type SearchState,
  JSON_COLORS,
} from "./json/types";
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
import { FilePicker } from "../components/file-picker";
import {
  readJSONFile,
  parseJSONString,
  type JSONTreeNode,
  type JSONValue,
  pathToString,
  formatValue,
  getValueColor,
  searchJSON,
  getVisibleNodes,
  expandToNode,
  toggleNode,
  expandAll,
  collapseAll,
  getValueAtPath,
  copyToClipboard,
  getJSONStats,
} from "../services/json";
import os from "os";
import path from "path";
import fs from "fs";

interface Props {
  id: string;
  config?: JSONConfig;
  socketPath?: string;
  scenario?: string;
}

// JSON canvas keybindings
const JSON_BINDINGS: KeyBinding[] = [
  { key: "o", description: "Open JSON file", category: "action" },
  {
    key: "Enter/Space",
    description: "Expand/collapse node",
    category: "action",
  },
  { key: "c", description: "Copy value to clipboard", category: "action" },
  { key: "p", description: "Copy path to clipboard", category: "action" },
  { key: "/", description: "Search keys/values", category: "action" },
  {
    key: "n/N",
    description: "Next/prev search result",
    category: "navigation",
  },
  { key: "e", description: "Expand all nodes", category: "view" },
  { key: "E", description: "Collapse all nodes", category: "view" },
  { key: "Up/Down", description: "Navigate tree", category: "navigation" },
  {
    key: "Left/Right",
    description: "Collapse/expand node",
    category: "navigation",
  },
  { key: "g/G", description: "Go to top/bottom", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Tree node row component
function TreeNodeRow({
  node,
  isSelected,
  isSearchMatch,
  width,
}: {
  node: JSONTreeNode;
  isSelected: boolean;
  isSearchMatch: boolean;
  width: number;
}) {
  const indent = "  ".repeat(node.depth);
  const hasChildren =
    (node.type === "object" || node.type === "array") && node.childCount > 0;

  // Determine the expand/collapse icon
  let icon = " ";
  if (hasChildren) {
    icon = node.expanded ? "[-]" : "[+]";
  }

  // Format the key part
  let keyPart = "";
  if (node.key !== null) {
    if (typeof node.key === "number") {
      keyPart = `[${node.key}]`;
    } else {
      keyPart = `"${node.key}"`;
    }
  }

  // Format the value part
  let valuePart = "";
  const valueColor = getValueColor(node.type);

  if (node.type === "object") {
    valuePart = node.expanded
      ? "{"
      : `{...} (${node.childCount} ${node.childCount === 1 ? "key" : "keys"})`;
  } else if (node.type === "array") {
    valuePart = node.expanded
      ? "["
      : `[...] (${node.childCount} ${node.childCount === 1 ? "item" : "items"})`;
  } else {
    valuePart = formatValue(node.value, width - node.depth * 2 - 20);
  }

  // Calculate available width
  const maxWidth = width - 4;

  return (
    <Box>
      <Text
        color={isSelected ? JSON_COLORS.selected : JSON_COLORS.muted}
        backgroundColor={isSelected ? "blue" : undefined}
      >
        {indent}
      </Text>
      {hasChildren && (
        <Text
          color={
            isSelected
              ? JSON_COLORS.selected
              : node.expanded
                ? JSON_COLORS.collapseIcon
                : JSON_COLORS.expandIcon
          }
          backgroundColor={isSelected ? "blue" : undefined}
        >
          {icon}{" "}
        </Text>
      )}
      {!hasChildren && (
        <Text
          color={isSelected ? JSON_COLORS.selected : JSON_COLORS.muted}
          backgroundColor={isSelected ? "blue" : undefined}
        >
          {"    "}
        </Text>
      )}
      {keyPart && (
        <>
          <Text
            color={
              isSelected
                ? JSON_COLORS.selected
                : isSearchMatch
                  ? JSON_COLORS.matchHighlight
                  : JSON_COLORS.key
            }
            backgroundColor={isSelected ? "blue" : undefined}
            bold={isSearchMatch}
          >
            {keyPart}
          </Text>
          <Text
            color={isSelected ? JSON_COLORS.selected : JSON_COLORS.muted}
            backgroundColor={isSelected ? "blue" : undefined}
          >
            :
          </Text>
        </>
      )}
      <Text
        color={
          isSelected
            ? JSON_COLORS.selected
            : isSearchMatch
              ? JSON_COLORS.matchHighlight
              : JSON_COLORS[valueColor]
        }
        backgroundColor={isSelected ? "blue" : undefined}
      >
        {valuePart.slice(
          0,
          maxWidth - indent.length - (keyPart ? keyPart.length + 2 : 0) - 4,
        )}
      </Text>
    </Box>
  );
}

// Closing brackets for expanded objects/arrays
function ClosingBracket({
  node,
  isSelected,
}: {
  node: JSONTreeNode;
  isSelected: boolean;
}) {
  if (!node.expanded || node.childCount === 0) return null;

  const indent = "  ".repeat(node.depth);
  const bracket = node.type === "object" ? "}" : "]";

  return (
    <Box>
      <Text
        color={isSelected ? JSON_COLORS.selected : JSON_COLORS.muted}
        backgroundColor={isSelected ? "blue" : undefined}
      >
        {indent} {bracket}
      </Text>
    </Box>
  );
}

// Search bar component
function SearchBar({
  query,
  onChange,
  onClose,
  resultCount,
  currentIndex,
}: {
  query: string;
  onChange: (query: string) => void;
  onClose: () => void;
  resultCount: number;
  currentIndex: number;
}) {
  useInput((_, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box paddingX={1} borderStyle="single" borderColor={JSON_COLORS.secondary}>
      <Text color={JSON_COLORS.secondary}>/ </Text>
      <TextInput value={query} onChange={onChange} placeholder="Search..." />
      <Text color={JSON_COLORS.muted}>
        {" "}
        {resultCount > 0
          ? `(${currentIndex + 1}/${resultCount})`
          : "(0 matches)"}{" "}
        | n/N next/prev | Esc close
      </Text>
    </Box>
  );
}

// Info panel showing node details
function InfoPanel({
  node,
  raw,
  width,
}: {
  node: JSONTreeNode | null;
  raw: JSONValue | undefined;
  width: number;
}) {
  if (!node) return null;

  const pathStr = pathToString(node.path);
  const typeStr = node.type.charAt(0).toUpperCase() + node.type.slice(1);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={JSON_COLORS.muted}
      paddingX={1}
      width={width}
    >
      <Box>
        <Text color={JSON_COLORS.primary} bold>
          Path:{" "}
        </Text>
        <Text color={JSON_COLORS.accent}>
          {pathStr.length > width - 10
            ? "..." + pathStr.slice(-(width - 13))
            : pathStr}
        </Text>
      </Box>
      <Box>
        <Text color={JSON_COLORS.primary} bold>
          Type:{" "}
        </Text>
        <Text color={JSON_COLORS[getValueColor(node.type)]}>{typeStr}</Text>
        {(node.type === "object" || node.type === "array") && (
          <Text color={JSON_COLORS.muted}>
            {" "}
            ({node.childCount} {node.childCount === 1 ? "child" : "children"})
          </Text>
        )}
      </Box>
      {node.type !== "object" && node.type !== "array" && (
        <Box>
          <Text color={JSON_COLORS.primary} bold>
            Value:{" "}
          </Text>
          <Text color={JSON_COLORS[getValueColor(node.type)]}>
            {formatValue(node.value, width - 10)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Main JSON Canvas
export function JSONCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "json",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // JSON data state
  const [filePath, setFilePath] = useState<string | null>(
    initialConfig?.path || null,
  );
  const [root, setRoot] = useState<JSONTreeNode | null>(null);
  const [nodes, setNodes] = useState<Map<string, JSONTreeNode>>(new Map());
  const [raw, setRaw] = useState<JSONValue | undefined>(undefined);
  const [visibleNodes, setVisibleNodes] = useState<JSONTreeNode[]>([]);

  // Navigation state
  const [selectedIndex, setSelectedIndex] = useState(0);

  // UI state
  const [showFilePicker, setShowFilePicker] = useState(!initialConfig?.path);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({
    query: "",
    results: [],
    currentIndex: 0,
    caseSensitive: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    "json",
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

  // Update visible nodes when tree changes
  useEffect(() => {
    if (root && nodes.size > 0) {
      setVisibleNodes(getVisibleNodes(root, nodes));
    }
  }, [root, nodes]);

  // Clear message after delay
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  // Open a JSON file
  const openJSONFile = useCallback((jsonPath: string) => {
    const result = readJSONFile(jsonPath);

    if (!result.success) {
      setError(result.error || "Failed to open file");
      return;
    }

    setFilePath(jsonPath);
    setRoot(result.root!);
    setNodes(result.nodes!);
    setRaw(result.raw);
    setSelectedIndex(0);
    setError(null);
    setShowFilePicker(false);
    setMessage(`Opened: ${path.basename(jsonPath)}`);

    // Clear search
    setSearchState({
      query: "",
      results: [],
      currentIndex: 0,
      caseSensitive: false,
    });
  }, []);

  // Open initial file from config
  useEffect(() => {
    if (initialConfig?.path) {
      openJSONFile(initialConfig.path);
    }
  }, [initialConfig?.path, openJSONFile]);

  // Perform search
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim() || nodes.size === 0) {
        setSearchState((s) => ({ ...s, query, results: [], currentIndex: 0 }));
        return;
      }

      const matches = searchJSON(nodes, query, searchState.caseSensitive);
      const resultIds = matches.map((m) => m.nodeId);

      setSearchState((s) => ({
        ...s,
        query,
        results: resultIds,
        currentIndex: 0,
      }));

      // Navigate to first result
      if (resultIds.length > 0 && root) {
        expandToNode(resultIds[0]!, nodes);
        setNodes(new Map(nodes)); // Trigger re-render
        const newVisible = getVisibleNodes(root, nodes);
        setVisibleNodes(newVisible);
        const newIndex = newVisible.findIndex((n) => n.id === resultIds[0]);
        if (newIndex >= 0) {
          setSelectedIndex(newIndex);
        }
      }
    },
    [nodes, root, searchState.caseSensitive],
  );

  // Navigate to search result
  const navigateToSearchResult = useCallback(
    (direction: "next" | "prev") => {
      if (searchState.results.length === 0 || !root) return;

      let newIndex = searchState.currentIndex;
      if (direction === "next") {
        newIndex = (newIndex + 1) % searchState.results.length;
      } else {
        newIndex =
          (newIndex - 1 + searchState.results.length) %
          searchState.results.length;
      }

      const nodeId = searchState.results[newIndex];
      if (!nodeId) return;

      expandToNode(nodeId, nodes);
      setNodes(new Map(nodes));
      const newVisible = getVisibleNodes(root, nodes);
      setVisibleNodes(newVisible);
      const visibleIndex = newVisible.findIndex((n) => n.id === nodeId);
      if (visibleIndex >= 0) {
        setSelectedIndex(visibleIndex);
      }

      setSearchState((s) => ({ ...s, currentIndex: newIndex }));
    },
    [searchState, root, nodes],
  );

  // Copy current value
  const copyCurrentValue = useCallback(async () => {
    const currentNode = visibleNodes[selectedIndex];
    if (!currentNode || !raw) return;

    try {
      const value = getValueAtPath(raw, currentNode.path);
      await copyToClipboard(value);
      setMessage("Value copied to clipboard");
    } catch (err) {
      setError(`Copy failed: ${(err as Error).message}`);
    }
  }, [visibleNodes, selectedIndex, raw]);

  // Copy current path
  const copyCurrentPath = useCallback(async () => {
    const currentNode = visibleNodes[selectedIndex];
    if (!currentNode) return;

    try {
      const pathStr = pathToString(currentNode.path);
      await copyToClipboard(pathStr);
      setMessage("Path copied to clipboard");
    } catch (err) {
      setError(`Copy failed: ${(err as Error).message}`);
    }
  }, [visibleNodes, selectedIndex]);

  // Keyboard input
  useInput(
    (input, key) => {
      // File picker is handled by its own component
      if (showFilePicker) return;

      // Search bar
      if (showSearch) {
        if (key.return) {
          performSearch(searchState.query);
        } else if (input === "n") {
          navigateToSearchResult("next");
        } else if (input === "N") {
          navigateToSearchResult("prev");
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

      // Open file
      if (input === "o") {
        setShowFilePicker(true);
        return;
      }

      // Search
      if (input === "/") {
        setShowSearch(true);
        setSearchState((s) => ({ ...s, query: "" }));
        return;
      }

      // Navigate search results (when not in search input mode)
      if (input === "n" && searchState.results.length > 0) {
        navigateToSearchResult("next");
        return;
      }
      if (input === "N" && searchState.results.length > 0) {
        navigateToSearchResult("prev");
        return;
      }

      // Copy value
      if (input === "c") {
        copyCurrentValue();
        return;
      }

      // Copy path
      if (input === "p") {
        copyCurrentPath();
        return;
      }

      // Expand all
      if (input === "e" && nodes.size > 0) {
        expandAll(nodes);
        setNodes(new Map(nodes));
        setMessage("Expanded all nodes");
        return;
      }

      // Collapse all
      if (input === "E" && root) {
        collapseAll(root, nodes);
        setNodes(new Map(nodes));
        setSelectedIndex(0);
        setMessage("Collapsed all nodes");
        return;
      }

      // Go to top
      if (input === "g") {
        setSelectedIndex(0);
        return;
      }

      // Go to bottom
      if (input === "G") {
        setSelectedIndex(Math.max(0, visibleNodes.length - 1));
        return;
      }

      // Navigation
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(visibleNodes.length - 1, i + 1));
      } else if (key.leftArrow) {
        // Collapse current node or go to parent
        const currentNode = visibleNodes[selectedIndex];
        if (currentNode) {
          if (
            currentNode.expanded &&
            (currentNode.type === "object" || currentNode.type === "array")
          ) {
            toggleNode(currentNode.id, nodes);
            setNodes(new Map(nodes));
          } else if (currentNode.parent) {
            // Go to parent
            const parentIndex = visibleNodes.findIndex(
              (n) => n.id === currentNode.parent,
            );
            if (parentIndex >= 0) {
              setSelectedIndex(parentIndex);
            }
          }
        }
      } else if (key.rightArrow) {
        // Expand current node
        const currentNode = visibleNodes[selectedIndex];
        if (
          currentNode &&
          !currentNode.expanded &&
          (currentNode.type === "object" || currentNode.type === "array")
        ) {
          toggleNode(currentNode.id, nodes);
          setNodes(new Map(nodes));
        }
      } else if (key.return || input === " ") {
        // Toggle expand/collapse
        const currentNode = visibleNodes[selectedIndex];
        if (currentNode) {
          if (toggleNode(currentNode.id, nodes)) {
            setNodes(new Map(nodes));
          }
        }
      }

      // Refresh
      if (input === "r" && filePath) {
        openJSONFile(filePath);
        return;
      }
    },
    {
      isActive: !showFilePicker && !showNav,
    },
  );

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const infoPanelHeight = 4;
  const searchBarHeight = showSearch ? 3 : 0;
  const contentHeight =
    termHeight -
    headerHeight -
    statusBarHeight -
    infoPanelHeight -
    searchBarHeight -
    2;

  // Calculate visible rows
  const visibleRowCount = Math.max(1, contentHeight - 2);
  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(visibleRowCount / 2),
      visibleNodes.length - visibleRowCount,
    ),
  );
  const displayNodes = visibleNodes.slice(
    startIndex,
    startIndex + visibleRowCount,
  );

  // Get current selected node
  const selectedNode = visibleNodes[selectedIndex] || null;

  // Get stats for display
  const stats = nodes.size > 0 ? getJSONStats(nodes) : null;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={JSON_COLORS.primary}
      >
        <Text color={JSON_COLORS.accent} bold>
          {"// JSON VIEWER //"}
        </Text>
        {filePath && (
          <Text color={JSON_COLORS.muted}>
            {path.basename(filePath)} | {nodes.size} nodes
            {stats && ` | depth ${stats.maxDepth}`}
          </Text>
        )}
      </Box>

      {/* Status/message bar */}
      <Box paddingX={1} marginY={1}>
        {error ? (
          <Text color={JSON_COLORS.danger}>Error: {error}</Text>
        ) : message ? (
          <Text color={JSON_COLORS.success}>{message}</Text>
        ) : (
          <Text color={JSON_COLORS.muted}>
            {filePath
              ? `${visibleNodes.length} visible | ${selectedIndex + 1}/${visibleNodes.length}`
              : "No file open. Press 'o' to open a JSON file."}
          </Text>
        )}
      </Box>

      {/* Search bar */}
      {showSearch && (
        <SearchBar
          query={searchState.query}
          onChange={(q) => {
            setSearchState((s) => ({ ...s, query: q }));
            performSearch(q);
          }}
          onClose={() => setShowSearch(false)}
          resultCount={searchState.results.length}
          currentIndex={searchState.currentIndex}
        />
      )}

      {/* Main content area - JSON Tree */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={JSON_COLORS.muted}
        height={contentHeight}
        paddingX={1}
      >
        {visibleNodes.length === 0 ? (
          <Text color={JSON_COLORS.muted}>
            {filePath ? "Empty JSON" : "No file loaded"}
          </Text>
        ) : (
          displayNodes.map((node, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;
            const isSearchMatch = searchState.results.includes(node.id);

            return (
              <TreeNodeRow
                key={node.id}
                node={node}
                isSelected={isSelected}
                isSearchMatch={isSearchMatch}
                width={termWidth - 4}
              />
            );
          })
        )}
      </Box>

      {/* Info panel */}
      <InfoPanel node={selectedNode} raw={raw} width={termWidth} />

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={JSON_COLORS.muted}>
          o open | Enter expand | c copy | p path | / search | e/E
          expand/collapse all | ? help | q quit
        </Text>
      </Box>

      {/* File picker overlay */}
      {showFilePicker && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <FilePicker
            currentPath={
              initialConfig?.path
                ? path.dirname(initialConfig.path)
                : os.homedir()
            }
            onSelect={openJSONFile}
            onCancel={() => {
              setShowFilePicker(false);
              if (!root) {
                exit();
              }
            }}
            width={termWidth}
            height={termHeight}
            extensions={[".json", ".jsonl"]}
            title="[ OPEN JSON FILE ]"
            emptyMessage="No .json or .jsonl files found"
            colors={JSON_COLORS}
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
            title="JSON VIEWER"
            bindings={JSON_BINDINGS}
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
            currentCanvas="json"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
