// File Browser Canvas - Interactive file browser TUI

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type FilesConfig,
  type FileEntry,
  type FileInfo,
  FILES_COLORS,
} from "./files/types";
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
  listDirectory,
  getFileInfo,
  readFilePreview,
  isTextFile,
  formatSize,
  formatDate,
  sortFiles,
  getFileIcon,
} from "../services/files";
import { join, dirname, basename } from "path";

interface Props {
  id: string;
  config?: FilesConfig;
  socketPath?: string;
  scenario?: string;
}

// Files canvas keybindings
const FILES_BINDINGS: KeyBinding[] = [
  {
    key: "j/k or Up/Dn",
    description: "Navigate files",
    category: "navigation",
  },
  {
    key: "Enter",
    description: "Open directory/preview file",
    category: "action",
  },
  {
    key: "Backspace",
    description: "Go to parent directory",
    category: "navigation",
  },
  { key: "h", description: "Toggle hidden files", category: "view" },
  { key: "s", description: "Sort options", category: "view" },
  { key: "/", description: "Search/filter files", category: "action" },
  { key: "g/G", description: "Go to top/bottom", category: "navigation" },
  { key: "o", description: "Open in default app", category: "action" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Sort options
const SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "modified", label: "Modified" },
  { key: "type", label: "Type" },
] as const;

// File row component
function FileRow({
  entry,
  isSelected,
  width,
}: {
  entry: FileEntry;
  isSelected: boolean;
  width: number;
}) {
  const icon = getFileIcon(entry);
  const nameWidth = Math.min(35, Math.floor(width * 0.4));
  const sizeWidth = 10;
  const dateWidth = 18;
  const permWidth = 10;

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str.padEnd(maxLen);
    return str.slice(0, maxLen - 1) + "\u2026";
  };

  // Get color based on file type
  const getNameColor = () => {
    if (entry.isDirectory) return FILES_COLORS.directory;
    if (entry.permissions.includes("x")) return FILES_COLORS.executable;
    return "white";
  };

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={isSelected ? FILES_COLORS.neonCyan : FILES_COLORS.dim}>
        {isSelected ? ">" : " "}
      </Text>

      {/* Icon */}
      <Text> {icon} </Text>

      {/* Name */}
      <Text color={getNameColor()} bold={isSelected}>
        {truncate(entry.name, nameWidth)}
      </Text>

      {/* Size */}
      <Text color={FILES_COLORS.dim}>
        {entry.isDirectory
          ? "-".padStart(sizeWidth)
          : formatSize(entry.size).padStart(sizeWidth)}
      </Text>

      {/* Modified date */}
      <Text color={FILES_COLORS.dim}>
        {" "}
        {formatDate(entry.modified).padStart(dateWidth)}
      </Text>

      {/* Permissions */}
      <Text color={FILES_COLORS.dim}> {entry.permissions}</Text>
    </Box>
  );
}

// File preview panel
function FilePreview({
  entry,
  preview,
  info,
  isLoading,
  width,
  height,
}: {
  entry: FileEntry | null;
  preview: string[];
  info: FileInfo | null;
  isLoading: boolean;
  width: number;
  height: number;
}) {
  if (!entry) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={FILES_COLORS.dim}
        paddingX={1}
        width={width}
        height={height}
      >
        <Text color={FILES_COLORS.dim}>No file selected</Text>
      </Box>
    );
  }

  const contentHeight = height - 8; // Account for header and info

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={FILES_COLORS.neonMagenta}
      paddingX={1}
      width={width}
      height={height}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={FILES_COLORS.neonCyan} bold>
          {"[ "}
          {getFileIcon(entry)} {entry.name}
          {" ]"}
        </Text>
      </Box>

      {/* File info */}
      {info && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={FILES_COLORS.dim}>Size: </Text>
            <Text color="white">{formatSize(info.size)}</Text>
          </Box>
          <Box>
            <Text color={FILES_COLORS.dim}>Modified: </Text>
            <Text color="white">{info.modified.toLocaleString()}</Text>
          </Box>
          {info.extension && (
            <Box>
              <Text color={FILES_COLORS.dim}>Type: </Text>
              <Text color="white">.{info.extension}</Text>
            </Box>
          )}
          <Box>
            <Text color={FILES_COLORS.dim}>Permissions: </Text>
            <Text color="white">{info.permissions}</Text>
          </Box>
        </Box>
      )}

      {/* Preview or info */}
      <Box marginTop={1}>
        <Text color={FILES_COLORS.neonMagenta} bold>
          {"[ PREVIEW ]"}
        </Text>
      </Box>

      <Box flexDirection="column" height={contentHeight}>
        {isLoading ? (
          <Text color={FILES_COLORS.neonGreen}>
            <Spinner type="dots" /> Loading...
          </Text>
        ) : entry.isDirectory ? (
          <Text color={FILES_COLORS.dim}>Directory - press Enter to open</Text>
        ) : preview.length === 0 ? (
          <Text color={FILES_COLORS.dim}>Binary file or cannot preview</Text>
        ) : (
          preview.slice(0, contentHeight).map((line, i) => (
            <Text key={i} color="white" wrap="truncate">
              {line.slice(0, width - 4)}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}

// Sort menu overlay
function SortMenu({
  visible,
  currentSort,
  ascending,
  onSelect,
  onClose,
  width,
}: {
  visible: boolean;
  currentSort: string;
  ascending: boolean;
  onSelect: (sort: string, ascending: boolean) => void;
  onClose: () => void;
  width: number;
}) {
  const [selected, setSelected] = useState(
    SORT_OPTIONS.findIndex((o) => o.key === currentSort),
  );
  const [asc, setAsc] = useState(ascending);

  useInput(
    (input, key) => {
      if (!visible) return;

      if (key.escape || input === "s") {
        onClose();
        return;
      }

      if (key.upArrow || input === "k") {
        setSelected((s) => Math.max(0, s - 1));
        return;
      }

      if (key.downArrow || input === "j") {
        setSelected((s) => Math.min(SORT_OPTIONS.length - 1, s + 1));
        return;
      }

      if (key.return) {
        const option = SORT_OPTIONS[selected];
        if (option) {
          onSelect(option.key, asc);
          onClose();
        }
        return;
      }

      if (input === "a") {
        setAsc((a) => !a);
        return;
      }
    },
    { isActive: visible },
  );

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={FILES_COLORS.neonYellow}
      paddingX={2}
      paddingY={1}
      width={Math.min(40, width - 10)}
    >
      <Text color={FILES_COLORS.neonYellow} bold>
        {"[ SORT BY ]"}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {SORT_OPTIONS.map((opt, i) => (
          <Box key={opt.key}>
            <Text
              color={i === selected ? FILES_COLORS.neonCyan : FILES_COLORS.dim}
            >
              {i === selected ? "> " : "  "}
            </Text>
            <Text
              color={i === selected ? "white" : FILES_COLORS.dim}
              bold={i === selected}
            >
              {opt.label}
            </Text>
            {opt.key === currentSort && (
              <Text color={FILES_COLORS.neonGreen}> *</Text>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={FILES_COLORS.dim}>Order: </Text>
        <Text color={FILES_COLORS.neonCyan}>
          {asc ? "Ascending" : "Descending"}
        </Text>
        <Text color={FILES_COLORS.dim}> (a to toggle)</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={FILES_COLORS.dim}>Enter select | Esc close</Text>
      </Box>
    </Box>
  );
}

// Search overlay
function SearchOverlay({
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
      borderColor={FILES_COLORS.neonCyan}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 10)}
    >
      <Text color={FILES_COLORS.neonCyan} bold>
        {"[ SEARCH ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={FILES_COLORS.dim}>Filter: </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="filename..."
        />
      </Box>
      <Box marginTop={1}>
        <Text color={FILES_COLORS.dim}>
          Enter apply | Esc cancel | Empty to clear
        </Text>
      </Box>
    </Box>
  );
}

// Main Files Canvas
export function FilesCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "files",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Directory state
  const [currentPath, setCurrentPath] = useState(
    initialConfig?.startPath || process.env.HOME || "/",
  );
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [showHidden, setShowHidden] = useState(
    initialConfig?.showHidden ?? false,
  );
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified" | "type">(
    initialConfig?.sortBy || "name",
  );
  const [sortAscending, setSortAscending] = useState(
    initialConfig?.sortAscending !== false,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Preview state
  const [preview, setPreview] = useState<string[]>([]);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");

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
    "files",
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

  // Load directory
  const loadDirectory = useCallback(
    async (path: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const entries = await listDirectory(path, showHidden);
        const sorted = sortFiles(entries, sortBy, sortAscending);
        setFiles(sorted);
        setFilteredFiles(sorted);
        setCurrentPath(path);
        setSelectedIndex(0);
        setSearchQuery("");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [showHidden, sortBy, sortAscending],
  );

  // Initial load
  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  // Re-sort when sort options change
  useEffect(() => {
    const sorted = sortFiles(files, sortBy, sortAscending);
    setFiles(sorted);

    // Apply search filter if active
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      setFilteredFiles(
        sorted.filter((f) => f.name.toLowerCase().includes(lower)),
      );
    } else {
      setFilteredFiles(sorted);
    }
  }, [sortBy, sortAscending]);

  // Reload when hidden toggle changes
  useEffect(() => {
    loadDirectory(currentPath);
  }, [showHidden]);

  // Load preview for selected file
  useEffect(() => {
    const selected = filteredFiles[selectedIndex];
    if (!selected || selected.isDirectory) {
      setPreview([]);
      setFileInfo(null);
      return;
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const info = await getFileInfo(selected.path);
        setFileInfo(info);

        if (isTextFile(selected.path)) {
          const lines = await readFilePreview(
            selected.path,
            initialConfig?.previewLines || 50,
          );
          setPreview(lines);
        } else {
          setPreview([]);
        }
      } catch {
        setPreview([]);
        setFileInfo(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [selectedIndex, filteredFiles, initialConfig?.previewLines]);

  // Apply search filter
  const applySearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query) {
        setFilteredFiles(files);
      } else {
        const lower = query.toLowerCase();
        setFilteredFiles(
          files.filter((f) => f.name.toLowerCase().includes(lower)),
        );
      }
      setSelectedIndex(0);
    },
    [files],
  );

  // Selected file
  const selectedFile = filteredFiles[selectedIndex] || null;

  // Keyboard input
  useInput((input, key) => {
    // Search input mode
    if (showSearch) {
      if (key.escape) {
        setShowSearch(false);
        setSearchInput(searchQuery);
      }
      return;
    }

    // Sort menu takes priority
    if (showSortMenu) {
      return; // Handled by SortMenu component
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
      exit();
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((i) => Math.min(filteredFiles.length - 1, i + 1));
      return;
    }

    // Go to top
    if (input === "g") {
      setSelectedIndex(0);
      return;
    }

    // Go to bottom
    if (input === "G") {
      setSelectedIndex(filteredFiles.length - 1);
      return;
    }

    // Enter directory or preview file
    if (key.return) {
      if (selectedFile?.isDirectory) {
        loadDirectory(selectedFile.path);
      }
      return;
    }

    // Go to parent
    if (key.backspace || key.delete) {
      const parent = dirname(currentPath);
      if (parent !== currentPath) {
        loadDirectory(parent);
      }
      return;
    }

    // Toggle hidden files
    if (input === "h") {
      setShowHidden((h) => !h);
      return;
    }

    // Sort menu
    if (input === "s") {
      setShowSortMenu(true);
      return;
    }

    // Search
    if (input === "/") {
      setSearchInput(searchQuery);
      setShowSearch(true);
      return;
    }

    // Open in default app
    if (input === "o" && selectedFile) {
      // Use 'open' on macOS
      const { execSync } = require("child_process");
      try {
        execSync(`open "${selectedFile.path}"`);
      } catch {
        // Ignore errors
      }
      return;
    }

    // Refresh
    if (input === "r") {
      loadDirectory(currentPath);
      return;
    }
  });

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    applySearch(searchInput);
    setShowSearch(false);
  }, [searchInput, applySearch]);

  // Handle sort selection
  const handleSortSelect = useCallback((sort: string, ascending: boolean) => {
    setSortBy(sort as "name" | "size" | "modified" | "type");
    setSortAscending(ascending);
  }, []);

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight - 4;

  const listWidth = Math.floor(termWidth * 0.55);
  const previewWidth = termWidth - listWidth - 3;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={FILES_COLORS.neonMagenta}
      >
        <Text color={FILES_COLORS.neonCyan} bold>
          {"// FILE BROWSER //"}
        </Text>
        <Box>
          {showHidden && <Text color={FILES_COLORS.neonYellow}>[hidden] </Text>}
          <Text color={FILES_COLORS.dim}>
            Sort: {sortBy} {sortAscending ? "\u2191" : "\u2193"}
          </Text>
        </Box>
      </Box>

      {/* Path bar */}
      <Box paddingX={1} marginY={1}>
        <Text color={FILES_COLORS.neonCyan}>{currentPath}</Text>
        {searchQuery && (
          <Text color={FILES_COLORS.neonYellow}>
            {" "}
            | Filter: "{searchQuery}"
          </Text>
        )}
        {error && <Text color={FILES_COLORS.neonRed}> | Error: {error}</Text>}
      </Box>

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* File list */}
        <Box flexDirection="column" width={listWidth}>
          <Box marginBottom={1}>
            <Text color={FILES_COLORS.neonMagenta} bold>
              {"[ FILES ]"}
            </Text>
            <Text color={FILES_COLORS.dim}>
              {" "}
              ({filteredFiles.length}
              {searchQuery && ` of ${files.length}`})
            </Text>
          </Box>

          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={FILES_COLORS.dim}
            height={contentHeight - 3}
          >
            {isLoading ? (
              <Box paddingX={1}>
                <Text color={FILES_COLORS.neonGreen}>
                  <Spinner type="dots" /> Loading...
                </Text>
              </Box>
            ) : filteredFiles.length === 0 ? (
              <Box paddingX={1}>
                <Text color={FILES_COLORS.dim}>
                  {searchQuery ? "No matching files" : "Empty directory"}
                </Text>
              </Box>
            ) : (
              filteredFiles
                .slice(0, contentHeight - 5)
                .map((entry, i) => (
                  <FileRow
                    key={entry.path}
                    entry={entry}
                    isSelected={i === selectedIndex}
                    width={listWidth - 2}
                  />
                ))
            )}
          </Box>
        </Box>

        {/* Preview panel */}
        <Box flexDirection="column" width={previewWidth} marginLeft={1}>
          <FilePreview
            entry={selectedFile}
            preview={preview}
            info={fileInfo}
            isLoading={isLoadingPreview}
            width={previewWidth}
            height={contentHeight}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={FILES_COLORS.dim}>
          Tab switch | ? help | h hidden | s sort | / search | Enter open |
          Backspace up | q quit
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
            title="FILE BROWSER"
            bindings={FILES_BINDINGS}
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
            currentCanvas="files"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}

      {/* Sort menu overlay */}
      {showSortMenu && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <SortMenu
            visible={showSortMenu}
            currentSort={sortBy}
            ascending={sortAscending}
            onSelect={handleSortSelect}
            onClose={() => setShowSortMenu(false)}
            width={termWidth}
          />
        </Box>
      )}

      {/* Search overlay */}
      {showSearch && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <SearchOverlay
            visible={showSearch}
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={handleSearchSubmit}
            onCancel={() => {
              setShowSearch(false);
              setSearchInput(searchQuery);
            }}
            width={termWidth}
          />
        </Box>
      )}
    </Box>
  );
}
