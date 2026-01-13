// Clipboard History Canvas - Clipboard history manager TUI

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type ClipboardConfig,
  type ClipboardResult,
  type ClipboardEntry,
  type ViewMode,
  CLIPBOARD_COLORS,
} from "./clipboard/types";
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
  clipboardHistory,
  setClipboard,
  watchClipboard,
  formatSize,
  formatRelativeTime,
} from "../services/clipboard";

// Clipboard-specific keybindings
const CLIPBOARD_BINDINGS: KeyBinding[] = [
  {
    key: "Enter",
    description: "Copy selected to clipboard",
    category: "action",
  },
  { key: "d", description: "Delete selected entry", category: "action" },
  { key: "c", description: "Clear all history", category: "action" },
  { key: "/", description: "Search/filter entries", category: "action" },
  { key: "Up/Down", description: "Navigate entries", category: "navigation" },
  { key: "p", description: "Preview selected entry", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: ClipboardConfig;
  socketPath?: string;
  scenario?: string;
}

// Type indicator icon
function getTypeIcon(type: string): string {
  switch (type) {
    case "text":
      return "T";
    case "image":
      return "I";
    case "file":
      return "F";
    default:
      return "?";
  }
}

// Type color
function getTypeColor(type: string): string {
  switch (type) {
    case "text":
      return CLIPBOARD_COLORS.text;
    case "image":
      return CLIPBOARD_COLORS.image;
    case "file":
      return CLIPBOARD_COLORS.file;
    default:
      return CLIPBOARD_COLORS.muted;
  }
}

// Clipboard entry list item
function ClipboardListItem({
  entry,
  isSelected,
  width,
}: {
  entry: ClipboardEntry;
  isSelected: boolean;
  width: number;
}) {
  const timeStr = formatRelativeTime(entry.timestamp);
  const sizeStr = entry.size ? formatSize(entry.size) : "";
  const typeIcon = getTypeIcon(entry.type);
  const metaWidth = 20; // Space for time, size, type
  const previewWidth = Math.max(10, width - metaWidth);

  // Create single-line preview
  const preview =
    entry.preview || entry.content.replace(/\n/g, " ").slice(0, previewWidth);
  const displayPreview =
    preview.length > previewWidth
      ? preview.slice(0, previewWidth - 3) + "..."
      : preview;

  return (
    <Box flexDirection="row">
      <Text
        color={isSelected ? CLIPBOARD_COLORS.accent : CLIPBOARD_COLORS.muted}
      >
        {isSelected ? "> " : "  "}
      </Text>
      <Text color={getTypeColor(entry.type)} bold={isSelected}>
        [{typeIcon}]{" "}
      </Text>
      <Text
        color={isSelected ? "white" : CLIPBOARD_COLORS.muted}
        bold={isSelected}
      >
        {displayPreview.padEnd(previewWidth - 5)}
      </Text>
      <Text color={CLIPBOARD_COLORS.dim}>
        {" "}
        {sizeStr.padStart(7)} {timeStr.padStart(8)}
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
}: {
  query: string;
  onChange: (query: string) => void;
  onClose: () => void;
  resultCount: number;
}) {
  useInput((_, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box flexDirection="row" paddingX={1}>
      <Text color={CLIPBOARD_COLORS.secondary}>/ </Text>
      <TextInput
        value={query}
        onChange={onChange}
        placeholder="Search clipboard history..."
      />
      <Text color={CLIPBOARD_COLORS.muted}>
        {" "}
        ({resultCount} found) | Esc to close
      </Text>
    </Box>
  );
}

// Delete confirmation component
function DeleteConfirmation({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (input.toLowerCase() === "y") {
      onConfirm();
    } else if (input.toLowerCase() === "n" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={CLIPBOARD_COLORS.danger} bold>
        {message}
      </Text>
      <Text color={CLIPBOARD_COLORS.muted}>
        Press Y to confirm, N or Esc to cancel
      </Text>
    </Box>
  );
}

// Preview panel component
function PreviewPanel({
  entry,
  width,
  height,
}: {
  entry: ClipboardEntry;
  width: number;
  height: number;
}) {
  const lines = entry.content.split("\n");
  const maxLines = height - 4;
  const displayLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={CLIPBOARD_COLORS.accent}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={CLIPBOARD_COLORS.accent} bold>
          {"[ PREVIEW ]"}
        </Text>
        <Text color={CLIPBOARD_COLORS.muted}>
          {" "}
          {entry.type} | {entry.size ? formatSize(entry.size) : ""} |{" "}
          {formatRelativeTime(entry.timestamp)}
        </Text>
      </Box>
      <Box flexDirection="column">
        {displayLines.map((line, i) => (
          <Text key={i} color="white" wrap="truncate">
            {line.slice(0, width - 4)}
          </Text>
        ))}
        {hasMore && (
          <Text color={CLIPBOARD_COLORS.muted}>
            ... {lines.length - maxLines} more lines
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function ClipboardCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "clipboard",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Clipboard state
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEntries, setFilteredEntries] = useState<ClipboardEntry[]>([]);

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"entry" | "all" | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Config
  const maxHistory = initialConfig?.maxHistory || 50;
  const pollInterval = initialConfig?.pollInterval || 1000;

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
    "clipboard",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 80,
        height: stdout?.rows || 24,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Initialize clipboard history and watch for changes
  useEffect(() => {
    clipboardHistory.setMaxEntries(maxHistory);

    // Get initial history
    setEntries(clipboardHistory.getHistory());

    // Watch for new clipboard content
    const cleanup = watchClipboard((newEntry) => {
      setEntries(clipboardHistory.getHistory());
      showStatus("New clipboard content detected");
    }, pollInterval);

    return () => {
      cleanup();
    };
  }, [maxHistory, pollInterval]);

  // Update filtered entries when search query or entries change
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEntries(entries);
    } else {
      setFilteredEntries(clipboardHistory.filterEntries(searchQuery));
    }
    // Keep selection in bounds
    setSelectedIndex((i) =>
      Math.min(i, Math.max(0, filteredEntries.length - 1)),
    );
  }, [searchQuery, entries]);

  // Show status message temporarily
  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2000);
  }, []);

  // Copy selected entry to clipboard
  const copySelected = useCallback(async () => {
    const entry = filteredEntries[selectedIndex];
    if (entry) {
      try {
        await setClipboard(entry.content);
        showStatus(`Copied to clipboard (${formatSize(entry.size || 0)})`);

        const result: ClipboardResult = {
          action: "copy",
          data: {
            content: entry.content,
            entriesCount: entries.length,
          },
        };
        ipc.sendSelected(result);
      } catch (error) {
        showStatus("Failed to copy to clipboard");
      }
    }
  }, [filteredEntries, selectedIndex, entries.length, ipc, showStatus]);

  // Delete selected entry
  const deleteSelected = useCallback(() => {
    const entry = filteredEntries[selectedIndex];
    if (entry) {
      clipboardHistory.removeEntry(entry.id);
      setEntries(clipboardHistory.getHistory());
      setDeleteTarget(null);
      showStatus("Entry deleted");

      // Adjust selection
      if (selectedIndex >= filteredEntries.length - 1) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
    }
  }, [filteredEntries, selectedIndex, showStatus]);

  // Clear all history
  const clearHistory = useCallback(() => {
    clipboardHistory.clearHistory();
    setEntries([]);
    setDeleteTarget(null);
    setSelectedIndex(0);
    showStatus("History cleared");

    const result: ClipboardResult = {
      action: "clear",
      data: { entriesCount: 0 },
    };
    ipc.sendSelected(result);
  }, [ipc, showStatus]);

  // Keyboard input
  useInput(
    (input, key) => {
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

      // Handle delete confirmation
      if (deleteTarget) {
        // Handled by DeleteConfirmation component
        return;
      }

      // Handle search mode
      if (viewMode === "search") {
        if (key.escape) {
          setViewMode("list");
          setSearchQuery("");
        }
        return;
      }

      // List mode controls
      if (key.escape || input === "q") {
        const result: ClipboardResult = {
          action: "close",
          data: { entriesCount: entries.length },
        };
        ipc.sendSelected(result);
        clipboardHistory.stopWatching();
        exit();
        return;
      }

      // Navigation
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(filteredEntries.length - 1, i + 1));
      }

      // Actions
      if (key.return) {
        copySelected();
      } else if (input === "d") {
        if (filteredEntries.length > 0) {
          setDeleteTarget("entry");
        }
      } else if (input === "c") {
        if (entries.length > 0) {
          setDeleteTarget("all");
        }
      } else if (input === "/") {
        setViewMode("search");
        setSearchQuery("");
      } else if (input === "p") {
        setShowPreview((p) => !p);
      } else if (input === "r") {
        // Refresh - re-fetch history
        setEntries(clipboardHistory.getHistory());
        showStatus("Refreshed");
      }
    },
    { isActive: viewMode === "list" && !deleteTarget && !showNav },
  );

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Calculate visible entries
  const maxVisibleEntries = showPreview
    ? Math.floor(contentHeight / 2) - 2
    : contentHeight - 4;
  const visibleEntries = filteredEntries.slice(0, maxVisibleEntries);
  const selectedEntry = filteredEntries[selectedIndex];

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={CLIPBOARD_COLORS.accent}
      >
        <Text color={CLIPBOARD_COLORS.primary} bold>
          {"// CLIPBOARD HISTORY //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Search bar when in search mode */}
        {viewMode === "search" && (
          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={() => {
              setViewMode("list");
              setSearchQuery("");
            }}
            resultCount={filteredEntries.length}
          />
        )}

        {/* Delete confirmation */}
        {deleteTarget === "entry" && (
          <DeleteConfirmation
            message={`Delete this entry? "${selectedEntry?.preview?.slice(0, 30)}..."`}
            onConfirm={deleteSelected}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
        {deleteTarget === "all" && (
          <DeleteConfirmation
            message={`Clear all ${entries.length} entries from history?`}
            onConfirm={clearHistory}
            onCancel={() => setDeleteTarget(null)}
          />
        )}

        {/* Entry list */}
        {viewMode === "list" && !deleteTarget && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={CLIPBOARD_COLORS.secondary} bold>
                {"[ HISTORY ]"}
              </Text>
              <Text color={CLIPBOARD_COLORS.muted}>
                {" "}
                ({filteredEntries.length} entries
                {searchQuery ? ` matching "${searchQuery}"` : ""})
              </Text>
              {statusMessage && (
                <Text color={CLIPBOARD_COLORS.success}> - {statusMessage}</Text>
              )}
            </Box>

            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={CLIPBOARD_COLORS.muted}
              paddingX={1}
            >
              {visibleEntries.length > 0 ? (
                visibleEntries.map((entry, i) => (
                  <ClipboardListItem
                    key={entry.id}
                    entry={entry}
                    isSelected={i === selectedIndex}
                    width={termWidth - 6}
                  />
                ))
              ) : (
                <Text color={CLIPBOARD_COLORS.muted}>
                  {searchQuery
                    ? "No entries match your search"
                    : "Clipboard history is empty. Copy something to get started."}
                </Text>
              )}
              {filteredEntries.length > maxVisibleEntries && (
                <Text color={CLIPBOARD_COLORS.dim}>
                  ... {filteredEntries.length - maxVisibleEntries} more entries
                </Text>
              )}
            </Box>

            {/* Preview panel (when toggled) */}
            {showPreview && selectedEntry && (
              <Box marginTop={1}>
                <PreviewPanel
                  entry={selectedEntry}
                  width={termWidth - 4}
                  height={Math.floor(contentHeight / 2)}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={CLIPBOARD_COLORS.muted}>
          Tab nav | ? help | Enter copy | d delete | c clear | / search | p
          preview | q quit
        </Text>
        <Text color={CLIPBOARD_COLORS.dim}>
          {entries.length}/{maxHistory}
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
            title="CLIPBOARD"
            bindings={CLIPBOARD_BINDINGS}
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
            currentCanvas="clipboard"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
