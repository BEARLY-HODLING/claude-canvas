// Notes Canvas - Quick notes scratchpad with auto-save

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type NotesConfig,
  type NotesResult,
  type Note,
  type SerializedNote,
  type ViewMode,
  NOTE_COLORS,
} from "./notes/types";
import {
  HelpOverlay,
  type KeyBinding,
  COMMON_BINDINGS,
} from "../components/help-overlay";

// Notes-specific keybindings
const NOTES_BINDINGS: KeyBinding[] = [
  { key: "n", description: "New note", category: "action" },
  { key: "Enter", description: "Edit selected note", category: "action" },
  { key: "d", description: "Delete note", category: "action" },
  { key: "/", description: "Search notes", category: "action" },
  { key: "↑/↓", description: "Navigate notes", category: "navigation" },
  ...COMMON_BINDINGS,
];
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import os from "os";
import path from "path";

interface Props {
  id: string;
  config?: NotesConfig;
  socketPath?: string;
  scenario?: string;
}

// Default file path for notes
const DEFAULT_NOTES_PATH = path.join(os.homedir(), ".canvas-notes.json");

// Generate unique ID
function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Extract title from content (first line)
function extractTitle(content: string): string {
  const firstLine = content.split("\n")[0]?.trim() || "";
  return firstLine.length > 0 ? firstLine : "Untitled Note";
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

// Format timestamp for display
function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Note list item component
function NoteListItem({
  note,
  isSelected,
  width,
}: {
  note: Note;
  isSelected: boolean;
  width: number;
}) {
  const maxTitleWidth = Math.max(10, width - 20);
  const displayTitle = note.title.slice(0, maxTitleWidth);
  const timeStr = formatRelativeTime(note.updatedAt);

  return (
    <Box flexDirection="row">
      <Text color={isSelected ? NOTE_COLORS.accent : NOTE_COLORS.muted}>
        {isSelected ? "> " : "  "}
      </Text>
      <Text
        color={isSelected ? NOTE_COLORS.primary : "white"}
        bold={isSelected}
      >
        {displayTitle.padEnd(maxTitleWidth)}
      </Text>
      <Text color={NOTE_COLORS.muted}> {timeStr}</Text>
    </Box>
  );
}

// Note editor component
function NoteEditor({
  note,
  isNew,
  onSave,
  onCancel,
  width,
}: {
  note: Note | null;
  isNew: boolean;
  onSave: (content: string) => void;
  onCancel: () => void;
  width: number;
}) {
  const [content, setContent] = useState(note?.content || "");
  const [cursorLine, setCursorLine] = useState(0);

  // Handle input
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Ctrl+S or Ctrl+Enter to save
    if (key.ctrl && (input === "s" || key.return)) {
      if (content.trim().length > 0) {
        onSave(content);
      }
      return;
    }

    // Enter adds newline
    if (key.return && !key.ctrl) {
      setContent((prev) => prev + "\n");
      setCursorLine((l) => l + 1);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={NOTE_COLORS.accent}
      paddingX={1}
      paddingY={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={NOTE_COLORS.accent} bold>
          {"[ "}
          {isNew ? "NEW NOTE" : "EDIT NOTE"}
          {" ]"}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <TextInput
          value={content}
          onChange={setContent}
          placeholder="Type your note... (first line is title)"
        />
      </Box>

      <Box>
        <Text color={NOTE_COLORS.muted}>
          Ctrl+S save | Esc cancel | Lines: {content.split("\n").length}
        </Text>
      </Box>
    </Box>
  );
}

// Delete confirmation component
function DeleteConfirmation({
  note,
  onConfirm,
  onCancel,
}: {
  note: Note;
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
      <Text color={NOTE_COLORS.danger} bold>
        Delete "{note.title}"?
      </Text>
      <Text color={NOTE_COLORS.muted}>
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
      <Text color={NOTE_COLORS.secondary}>/ </Text>
      <TextInput
        value={query}
        onChange={onChange}
        placeholder="Search notes..."
      />
      <Text color={NOTE_COLORS.muted}>
        {" "}
        ({resultCount} found) | Esc to close
      </Text>
    </Box>
  );
}

export function NotesCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "notes",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);

  // Save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const filePath = initialConfig?.filePath || DEFAULT_NOTES_PATH;
  const autoSave = initialConfig?.autoSave !== false;
  const autoSaveInterval = (initialConfig?.autoSaveInterval || 30) * 1000;

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      // Save before navigating
      saveNotes();
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "notes",
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

  // Load notes from file
  const loadNotes = useCallback(async () => {
    try {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const text = await file.text();
        const data = JSON.parse(text) as { notes: SerializedNote[] };
        const loadedNotes: Note[] = data.notes.map((n) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        }));
        // Sort by updated time, newest first
        loadedNotes.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        );
        setNotes(loadedNotes);
        setFilteredNotes(loadedNotes);
        setLastSaved(new Date());
      }
    } catch (err) {
      // File doesn't exist or is invalid, start with empty notes
      setNotes([]);
      setFilteredNotes([]);
    }
  }, [filePath]);

  // Save notes to file
  const saveNotes = useCallback(async () => {
    try {
      const serialized: SerializedNote[] = notes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }));
      const data = { notes: serialized };
      await Bun.write(filePath, JSON.stringify(data, null, 2));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) {
      // Failed to save - could show error
    }
  }, [notes, filePath]);

  // Initial load
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Auto-save timer
  useEffect(() => {
    if (autoSave && isDirty) {
      saveTimerRef.current = setInterval(() => {
        saveNotes();
      }, autoSaveInterval);
    }

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [autoSave, isDirty, autoSaveInterval, saveNotes]);

  // Update filtered notes when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (n) =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query),
        ),
      );
    }
    setSelectedIndex(0);
  }, [searchQuery, notes]);

  // Create new note
  const createNote = useCallback(() => {
    setIsNewNote(true);
    setEditingNote({
      id: generateId(),
      title: "",
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setViewMode("edit");
  }, []);

  // Edit existing note
  const editNote = useCallback(() => {
    const noteToEdit = filteredNotes[selectedIndex];
    if (noteToEdit) {
      setIsNewNote(false);
      setEditingNote(noteToEdit);
      setViewMode("edit");
    }
  }, [filteredNotes, selectedIndex]);

  // Save edited note
  const handleSaveNote = useCallback(
    (content: string) => {
      if (!editingNote) return;

      const title = extractTitle(content);
      const now = new Date();

      if (isNewNote) {
        const newNote: Note = {
          ...editingNote,
          title,
          content,
          createdAt: now,
          updatedAt: now,
        };
        setNotes((prev) => [newNote, ...prev]);
      } else {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingNote.id
              ? { ...n, title, content, updatedAt: now }
              : n,
          ),
        );
      }

      setIsDirty(true);
      setEditingNote(null);
      setIsNewNote(false);
      setViewMode("list");
    },
    [editingNote, isNewNote],
  );

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingNote(null);
    setIsNewNote(false);
    setViewMode("list");
  }, []);

  // Request delete confirmation
  const requestDelete = useCallback(() => {
    const noteToDelete = filteredNotes[selectedIndex];
    if (noteToDelete) {
      setDeleteTarget(noteToDelete);
    }
  }, [filteredNotes, selectedIndex]);

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setIsDirty(true);
      setDeleteTarget(null);
      // Adjust selected index if needed
      if (selectedIndex >= filteredNotes.length - 1) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
    }
  }, [deleteTarget, filteredNotes.length, selectedIndex]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

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

  // Keyboard input (only when in list mode)
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

      // Handle edit mode
      if (viewMode === "edit") {
        // Input is handled by NoteEditor component
        return;
      }

      // List mode controls
      if (key.escape || input === "q") {
        // Save before quitting
        saveNotes();
        const result: NotesResult = {
          action: "save",
          notesCount: notes.length,
          filePath,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Navigation
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(filteredNotes.length - 1, i + 1));
      }

      // Actions
      if (input === "n") {
        createNote();
      } else if (key.return) {
        editNote();
      } else if (input === "d") {
        requestDelete();
      } else if (input === "/") {
        startSearch();
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

  // Calculate visible notes
  const maxVisibleNotes = Math.max(1, contentHeight - 4);
  const visibleNotes = filteredNotes.slice(0, maxVisibleNotes);

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={NOTE_COLORS.accent}
      >
        <Text color={NOTE_COLORS.primary} bold>
          {"// NOTES //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Search bar when in search mode */}
        {viewMode === "search" && (
          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={endSearch}
            resultCount={filteredNotes.length}
          />
        )}

        {/* Delete confirmation */}
        {deleteTarget && (
          <DeleteConfirmation
            note={deleteTarget}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
        )}

        {/* Note editor */}
        {viewMode === "edit" && (
          <NoteEditor
            note={editingNote}
            isNew={isNewNote}
            onSave={handleSaveNote}
            onCancel={handleCancelEdit}
            width={listWidth}
          />
        )}

        {/* Notes list */}
        {viewMode === "list" && !deleteTarget && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={NOTE_COLORS.secondary} bold>
                {"[ NOTES ]"}
              </Text>
              <Text color={NOTE_COLORS.muted}>
                {" "}
                ({filteredNotes.length} notes)
              </Text>
            </Box>

            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor={NOTE_COLORS.muted}
              paddingX={1}
            >
              {visibleNotes.length > 0 ? (
                visibleNotes.map((note, i) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={i === selectedIndex}
                    width={listWidth - 4}
                  />
                ))
              ) : (
                <Text color={NOTE_COLORS.muted}>
                  No notes yet. Press 'n' to create one.
                </Text>
              )}
            </Box>

            {/* Note preview */}
            {filteredNotes[selectedIndex] && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={NOTE_COLORS.secondary} bold>
                  {"[ PREVIEW ]"}
                </Text>
                <Box
                  borderStyle="single"
                  borderColor={NOTE_COLORS.muted}
                  paddingX={1}
                  height={Math.min(5, contentHeight - maxVisibleNotes - 6)}
                >
                  <Text color={NOTE_COLORS.muted}>
                    {filteredNotes[selectedIndex]!.content.slice(0, 200)}
                    {filteredNotes[selectedIndex]!.content.length > 200
                      ? "..."
                      : ""}
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={NOTE_COLORS.muted}>
          Tab nav | ? help | n new | Enter edit | d delete | / search | q quit
        </Text>
        <Text color={NOTE_COLORS.muted}>
          {lastSaved
            ? `Saved ${formatTimestamp(lastSaved)}`
            : isDirty
              ? "Unsaved"
              : ""}
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
            title="NOTES"
            bindings={NOTES_BINDINGS}
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
            currentCanvas="notes"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
