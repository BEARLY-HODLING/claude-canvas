// Bookmarks Canvas - URL bookmark manager with folders and tags

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type BookmarksConfig,
  type BookmarksResult,
  type Bookmark,
  type ViewMode,
  BOOKMARKS_COLORS,
} from "./bookmarks/types";
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
  BookmarksService,
  DEFAULT_BOOKMARKS_PATH,
  formatRelativeTime,
  getDomainFromUrl,
} from "../services/bookmarks";
import { exec } from "child_process";

interface Props {
  id: string;
  config?: BookmarksConfig;
  socketPath?: string;
  scenario?: string;
}

// Bookmarks-specific keybindings
const BOOKMARKS_BINDINGS: KeyBinding[] = [
  { key: "a", description: "Add new bookmark", category: "action" },
  { key: "e", description: "Edit selected bookmark", category: "action" },
  { key: "d", description: "Delete bookmark", category: "action" },
  { key: "t", description: "Add tag to bookmark", category: "action" },
  { key: "Enter", description: "Open in browser", category: "action" },
  { key: "/", description: "Search bookmarks", category: "action" },
  { key: "up/down", description: "Navigate bookmarks", category: "navigation" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Bookmark list item component
function BookmarkListItem({
  bookmark,
  isSelected,
  width,
}: {
  bookmark: Bookmark;
  isSelected: boolean;
  width: number;
}) {
  const maxTitleWidth = Math.max(15, Math.floor(width * 0.35));
  const maxUrlWidth = Math.max(20, Math.floor(width * 0.35));
  const displayTitle = bookmark.title.slice(0, maxTitleWidth);
  const domain = getDomainFromUrl(bookmark.url);
  const displayUrl = domain.slice(0, maxUrlWidth);
  const timeStr = formatRelativeTime(bookmark.created);

  return (
    <Box flexDirection="row">
      <Text
        color={isSelected ? BOOKMARKS_COLORS.accent : BOOKMARKS_COLORS.muted}
      >
        {isSelected ? "> " : "  "}
      </Text>
      <Text
        color={isSelected ? BOOKMARKS_COLORS.primary : "white"}
        bold={isSelected}
      >
        {displayTitle.padEnd(maxTitleWidth)}
      </Text>
      <Text color={BOOKMARKS_COLORS.muted}> | </Text>
      <Text color={BOOKMARKS_COLORS.secondary}>{displayUrl}</Text>
      {bookmark.tags.length > 0 && (
        <>
          <Text color={BOOKMARKS_COLORS.muted}> </Text>
          {bookmark.tags.slice(0, 3).map((tag) => (
            <Text key={tag} color={BOOKMARKS_COLORS.tag}>
              [{tag}]
            </Text>
          ))}
        </>
      )}
      <Text color={BOOKMARKS_COLORS.muted}> {timeStr}</Text>
    </Box>
  );
}

// Folder header component
function FolderHeader({
  folder,
  count,
  isExpanded,
  isSelected,
}: {
  folder: string;
  count: number;
  isExpanded: boolean;
  isSelected: boolean;
}) {
  return (
    <Box flexDirection="row">
      <Text
        color={isSelected ? BOOKMARKS_COLORS.accent : BOOKMARKS_COLORS.folder}
      >
        {isSelected ? "> " : "  "}
        {isExpanded ? "v " : "> "}
      </Text>
      <Text color={BOOKMARKS_COLORS.folder} bold>
        {folder}
      </Text>
      <Text color={BOOKMARKS_COLORS.muted}> ({count})</Text>
    </Box>
  );
}

// Add/Edit bookmark form
function BookmarkForm({
  bookmark,
  isNew,
  onSave,
  onCancel,
  width,
}: {
  bookmark: Bookmark | null;
  isNew: boolean;
  onSave: (title: string, url: string, tags: string, folder: string) => void;
  onCancel: () => void;
  width: number;
}) {
  const [title, setTitle] = useState(bookmark?.title || "");
  const [url, setUrl] = useState(bookmark?.url || "");
  const [tags, setTags] = useState(bookmark?.tags.join(", ") || "");
  const [folder, setFolder] = useState(bookmark?.folder || "");
  const [focusedField, setFocusedField] = useState<
    "title" | "url" | "tags" | "folder"
  >("url");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Ctrl+S to save
    if (key.ctrl && input === "s") {
      if (url.trim().length > 0) {
        onSave(title, url, tags, folder);
      }
      return;
    }

    // Tab to switch fields
    if (key.tab) {
      const fields: Array<"title" | "url" | "tags" | "folder"> = [
        "url",
        "title",
        "tags",
        "folder",
      ];
      const currentIndex = fields.indexOf(focusedField);
      const nextIndex = (currentIndex + 1) % fields.length;
      setFocusedField(fields[nextIndex]!);
    }

    // Enter on last field saves
    if (key.return && focusedField === "folder") {
      if (url.trim().length > 0) {
        onSave(title, url, tags, folder);
      }
    }
  });

  const renderField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    field: "title" | "url" | "tags" | "folder",
    placeholder: string,
  ) => (
    <Box flexDirection="row" marginBottom={1}>
      <Text color={BOOKMARKS_COLORS.muted}>{label.padEnd(8)}</Text>
      {focusedField === field ? (
        <TextInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <Text color={BOOKMARKS_COLORS.muted}>{value || placeholder}</Text>
      )}
    </Box>
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={BOOKMARKS_COLORS.accent}
      paddingX={1}
      paddingY={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={BOOKMARKS_COLORS.accent} bold>
          {"[ "}
          {isNew ? "ADD BOOKMARK" : "EDIT BOOKMARK"}
          {" ]"}
        </Text>
      </Box>

      {renderField("URL:", url, setUrl, "url", "https://example.com")}
      {renderField("Title:", title, setTitle, "title", "Website Title")}
      {renderField("Tags:", tags, setTags, "tags", "tag1, tag2")}
      {renderField("Folder:", folder, setFolder, "folder", "(optional)")}

      <Box marginTop={1}>
        <Text color={BOOKMARKS_COLORS.muted}>
          Tab switch fields | Ctrl+S save | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}

// Add tag input component
function AddTagInput({
  onAdd,
  onCancel,
}: {
  onAdd: (tag: string) => void;
  onCancel: () => void;
}) {
  const [tag, setTag] = useState("");

  useInput((_, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="row" paddingX={1}>
      <Text color={BOOKMARKS_COLORS.accent}>Add tag: </Text>
      <TextInput
        value={tag}
        onChange={setTag}
        onSubmit={() => {
          if (tag.trim()) {
            onAdd(tag.trim());
          }
        }}
        placeholder="tag name"
      />
      <Text color={BOOKMARKS_COLORS.muted}> | Esc to cancel</Text>
    </Box>
  );
}

// Delete confirmation component
function DeleteConfirmation({
  bookmark,
  onConfirm,
  onCancel,
}: {
  bookmark: Bookmark;
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
      <Text color={BOOKMARKS_COLORS.danger} bold>
        Delete "{bookmark.title}"?
      </Text>
      <Text color={BOOKMARKS_COLORS.muted}>
        Press Y to confirm, N or Esc to cancel
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
      <Text color={BOOKMARKS_COLORS.secondary}>/ </Text>
      <TextInput
        value={query}
        onChange={onChange}
        placeholder="Search bookmarks..."
      />
      <Text color={BOOKMARKS_COLORS.muted}>
        {" "}
        ({resultCount} found) | Esc to close
      </Text>
    </Box>
  );
}

// Open URL in default browser
function openInBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;

  if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.error("Failed to open URL:", err);
    }
  });
}

export function BookmarksCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "bookmarks",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Service instance
  const serviceRef = useRef<BookmarksService>(
    new BookmarksService(initialConfig?.storePath || DEFAULT_BOOKMARKS_PATH),
  );

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Edit state
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isNewBookmark, setIsNewBookmark] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    "bookmarks",
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

  // Load bookmarks on mount
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const loaded = await serviceRef.current.load();
        setBookmarks(loaded);
        setFilteredBookmarks(loaded);
      } catch (err) {
        setError("Failed to load bookmarks");
      }
    };
    loadBookmarks();
  }, []);

  // Update filtered bookmarks when search query changes
  useEffect(() => {
    const filterBookmarks = async () => {
      if (searchQuery.trim() === "") {
        setFilteredBookmarks(bookmarks);
      } else {
        const results = await serviceRef.current.search(searchQuery);
        setFilteredBookmarks(results);
      }
      setSelectedIndex(0);
    };
    filterBookmarks();
  }, [searchQuery, bookmarks]);

  // Add new bookmark
  const addBookmark = useCallback(() => {
    setIsNewBookmark(true);
    setEditingBookmark(null);
    setViewMode("add");
  }, []);

  // Edit selected bookmark
  const editBookmark = useCallback(() => {
    const bookmark = filteredBookmarks[selectedIndex];
    if (bookmark) {
      setIsNewBookmark(false);
      setEditingBookmark(bookmark);
      setViewMode("edit");
    }
  }, [filteredBookmarks, selectedIndex]);

  // Save bookmark (add or edit)
  const handleSaveBookmark = useCallback(
    async (title: string, url: string, tagsStr: string, folder: string) => {
      try {
        const tags = tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        if (isNewBookmark) {
          await serviceRef.current.create(
            title,
            url,
            tags,
            folder || undefined,
          );
        } else if (editingBookmark) {
          await serviceRef.current.update(editingBookmark.id, {
            title,
            url,
            tags,
            folder: folder || undefined,
          });
        }

        // Reload bookmarks
        const loaded = await serviceRef.current.getAll();
        setBookmarks(loaded);
        setViewMode("list");
        setEditingBookmark(null);
        setIsNewBookmark(false);
        setError(null);
      } catch (err) {
        setError("Failed to save bookmark");
      }
    },
    [isNewBookmark, editingBookmark],
  );

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingBookmark(null);
    setIsNewBookmark(false);
    setViewMode("list");
  }, []);

  // Request delete confirmation
  const requestDelete = useCallback(() => {
    const bookmark = filteredBookmarks[selectedIndex];
    if (bookmark) {
      setDeleteTarget(bookmark);
    }
  }, [filteredBookmarks, selectedIndex]);

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    if (deleteTarget) {
      try {
        await serviceRef.current.delete(deleteTarget.id);
        const loaded = await serviceRef.current.getAll();
        setBookmarks(loaded);
        setDeleteTarget(null);
        // Adjust selected index if needed
        if (selectedIndex >= filteredBookmarks.length - 1) {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        }
      } catch (err) {
        setError("Failed to delete bookmark");
      }
    }
  }, [deleteTarget, filteredBookmarks.length, selectedIndex]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // Start add tag mode
  const startAddTag = useCallback(() => {
    const bookmark = filteredBookmarks[selectedIndex];
    if (bookmark) {
      setViewMode("addTag");
    }
  }, [filteredBookmarks, selectedIndex]);

  // Add tag to selected bookmark
  const handleAddTag = useCallback(
    async (tag: string) => {
      const bookmark = filteredBookmarks[selectedIndex];
      if (bookmark) {
        try {
          await serviceRef.current.addTag(bookmark.id, tag);
          const loaded = await serviceRef.current.getAll();
          setBookmarks(loaded);
          setViewMode("list");
        } catch (err) {
          setError("Failed to add tag");
        }
      }
    },
    [filteredBookmarks, selectedIndex],
  );

  // Start search
  const startSearch = useCallback(() => {
    setViewMode("search");
    setSearchQuery("");
  }, []);

  // End search
  const endSearch = useCallback(() => {
    setViewMode("list");
    setSearchQuery("");
  }, []);

  // Open selected bookmark in browser
  const openSelected = useCallback(async () => {
    const bookmark = filteredBookmarks[selectedIndex];
    if (bookmark) {
      openInBrowser(bookmark.url);
      // Record visit
      await serviceRef.current.recordVisit(bookmark.id);
      ipc.sendSelected({
        action: "open",
        bookmark,
      } as BookmarksResult);
    }
  }, [filteredBookmarks, selectedIndex, ipc]);

  // Keyboard input (list mode)
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
        // Input is handled by DeleteConfirmation component
        return;
      }

      // Handle search mode
      if (viewMode === "search") {
        if (key.escape) {
          endSearch();
        }
        return;
      }

      // Handle add tag mode
      if (viewMode === "addTag") {
        return;
      }

      // Handle add/edit mode
      if (viewMode === "add" || viewMode === "edit") {
        // Input is handled by BookmarkForm component
        return;
      }

      // List mode controls
      if (key.escape || input === "q") {
        const result: BookmarksResult = {
          action: "close",
          bookmarkCount: bookmarks.length,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Navigation
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(filteredBookmarks.length - 1, i + 1));
      }

      // Actions
      if (input === "a") {
        addBookmark();
      } else if (input === "e") {
        editBookmark();
      } else if (input === "d") {
        requestDelete();
      } else if (input === "t") {
        startAddTag();
      } else if (input === "/") {
        startSearch();
      } else if (key.return) {
        openSelected();
      } else if (input === "r") {
        // Refresh - reload from file
        serviceRef.current.load().then((loaded) => {
          setBookmarks(loaded);
        });
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
  const listWidth = Math.max(40, termWidth - 4);

  // Calculate visible bookmarks
  const maxVisibleBookmarks = Math.max(1, contentHeight - 4);
  const visibleBookmarks = filteredBookmarks.slice(0, maxVisibleBookmarks);

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={BOOKMARKS_COLORS.accent}
      >
        <Text color={BOOKMARKS_COLORS.primary} bold>
          {"// BOOKMARKS //"}
        </Text>
        <Text color={BOOKMARKS_COLORS.muted}>{bookmarks.length} bookmarks</Text>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1}>
          <Text color={BOOKMARKS_COLORS.danger}>Error: {error}</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Search bar when in search mode */}
        {viewMode === "search" && (
          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={endSearch}
            resultCount={filteredBookmarks.length}
          />
        )}

        {/* Add tag input */}
        {viewMode === "addTag" && (
          <AddTagInput
            onAdd={handleAddTag}
            onCancel={() => setViewMode("list")}
          />
        )}

        {/* Delete confirmation */}
        {deleteTarget && (
          <DeleteConfirmation
            bookmark={deleteTarget}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
        )}

        {/* Bookmark form */}
        {(viewMode === "add" || viewMode === "edit") && (
          <BookmarkForm
            bookmark={editingBookmark}
            isNew={isNewBookmark}
            onSave={handleSaveBookmark}
            onCancel={handleCancelEdit}
            width={listWidth}
          />
        )}

        {/* Bookmarks list */}
        {viewMode === "list" && !deleteTarget && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={BOOKMARKS_COLORS.secondary} bold>
                {"[ BOOKMARKS ]"}
              </Text>
              <Text color={BOOKMARKS_COLORS.muted}>
                {" "}
                ({filteredBookmarks.length})
              </Text>
            </Box>

            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={BOOKMARKS_COLORS.muted}
              paddingX={1}
            >
              {visibleBookmarks.length > 0 ? (
                visibleBookmarks.map((bookmark, i) => (
                  <BookmarkListItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    isSelected={i === selectedIndex}
                    width={listWidth - 4}
                  />
                ))
              ) : (
                <Text color={BOOKMARKS_COLORS.muted}>
                  No bookmarks yet. Press 'a' to add one.
                </Text>
              )}
            </Box>

            {/* Bookmark preview */}
            {filteredBookmarks[selectedIndex] && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={BOOKMARKS_COLORS.secondary} bold>
                  {"[ DETAILS ]"}
                </Text>
                <Box
                  borderStyle="single"
                  borderColor={BOOKMARKS_COLORS.muted}
                  paddingX={1}
                  flexDirection="column"
                >
                  <Text color={BOOKMARKS_COLORS.accent}>
                    {filteredBookmarks[selectedIndex]!.title}
                  </Text>
                  <Text color={BOOKMARKS_COLORS.primary}>
                    {filteredBookmarks[selectedIndex]!.url}
                  </Text>
                  {filteredBookmarks[selectedIndex]!.tags.length > 0 && (
                    <Box>
                      <Text color={BOOKMARKS_COLORS.muted}>Tags: </Text>
                      {filteredBookmarks[selectedIndex]!.tags.map((tag) => (
                        <Text key={tag} color={BOOKMARKS_COLORS.tag}>
                          [{tag}]{" "}
                        </Text>
                      ))}
                    </Box>
                  )}
                  {filteredBookmarks[selectedIndex]!.folder && (
                    <Text color={BOOKMARKS_COLORS.muted}>
                      Folder: {filteredBookmarks[selectedIndex]!.folder}
                    </Text>
                  )}
                  <Text color={BOOKMARKS_COLORS.muted}>
                    Visited: {filteredBookmarks[selectedIndex]!.visitCount}{" "}
                    times
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={BOOKMARKS_COLORS.muted}>
          Tab nav | ? help | a add | e edit | d del | t tag | / search | Enter
          open | q quit
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
            title="BOOKMARKS"
            bindings={BOOKMARKS_BINDINGS}
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
            currentCanvas="bookmarks"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
