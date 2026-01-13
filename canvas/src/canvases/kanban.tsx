// Kanban Canvas - Board-based task management with columns

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type KanbanConfig,
  type KanbanResult,
  type Card,
  type Board,
  type ViewMode,
  type ColumnType,
  type Priority,
  COLUMNS,
  PRIORITY_CONFIG,
  KANBAN_COLORS,
} from "./kanban/types";
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
import { KanbanService, formatRelativeTime } from "../services/kanban";
import os from "os";
import path from "path";

// Kanban-specific keybindings
const KANBAN_BINDINGS: KeyBinding[] = [
  { key: "n", description: "New card", category: "action" },
  { key: "Enter", description: "Edit selected card", category: "action" },
  { key: "d", description: "Delete card", category: "action" },
  {
    key: "Left/Right",
    description: "Move card between columns",
    category: "action",
  },
  {
    key: "Up/Down",
    description: "Navigate cards in column",
    category: "navigation",
  },
  {
    key: "1/2/3",
    description: "Jump to column (Todo/Progress/Done)",
    category: "navigation",
  },
  { key: "p", description: "Cycle priority", category: "action" },
  { key: "b", description: "Switch board", category: "action" },
  { key: "B", description: "New board", category: "action" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: KanbanConfig;
  socketPath?: string;
  scenario?: string;
}

// Default file path for kanban data
const DEFAULT_KANBAN_PATH = path.join(
  os.homedir(),
  ".claude-canvas",
  "kanban.json",
);

// Priority order for cycling
const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "urgent"];

// Card component
function CardItem({
  card,
  isSelected,
  width,
}: {
  card: Card;
  isSelected: boolean;
  width: number;
}) {
  const priorityConfig = PRIORITY_CONFIG[card.priority];
  const maxTitleWidth = Math.max(8, width - 8);
  const displayTitle = card.title.slice(0, maxTitleWidth);

  return (
    <Box
      flexDirection="column"
      borderStyle={isSelected ? "round" : "single"}
      borderColor={isSelected ? KANBAN_COLORS.accent : KANBAN_COLORS.muted}
      paddingX={1}
      width={width}
      marginBottom={0}
    >
      <Box flexDirection="row">
        <Text color={priorityConfig.color} bold>
          {priorityConfig.symbol}{" "}
        </Text>
        <Text
          color={isSelected ? KANBAN_COLORS.primary : "white"}
          bold={isSelected}
        >
          {displayTitle}
        </Text>
      </Box>
      {card.description && (
        <Text color={KANBAN_COLORS.muted} wrap="truncate">
          {card.description.slice(0, maxTitleWidth - 2)}
        </Text>
      )}
      <Text color={KANBAN_COLORS.muted} dimColor>
        {formatRelativeTime(card.updatedAt)}
      </Text>
    </Box>
  );
}

// Column component
function Column({
  columnType,
  label,
  emoji,
  cards,
  selectedCardId,
  isActiveColumn,
  width,
  height,
}: {
  columnType: ColumnType;
  label: string;
  emoji: string;
  cards: Card[];
  selectedCardId: string | null;
  isActiveColumn: boolean;
  width: number;
  height: number;
}) {
  const columnColor = {
    todo: KANBAN_COLORS.todoColumn,
    in_progress: KANBAN_COLORS.progressColumn,
    done: KANBAN_COLORS.doneColumn,
  }[columnType];

  const cardWidth = Math.max(15, width - 2);
  const maxCards = Math.max(1, Math.floor((height - 4) / 5));

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle={isActiveColumn ? "double" : "single"}
      borderColor={isActiveColumn ? columnColor : KANBAN_COLORS.muted}
    >
      {/* Column header */}
      <Box justifyContent="center" paddingX={1}>
        <Text color={columnColor} bold>
          {emoji} {label} ({cards.length})
        </Text>
      </Box>

      {/* Cards */}
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {cards.length === 0 ? (
          <Text color={KANBAN_COLORS.muted}>No cards</Text>
        ) : (
          cards
            .slice(0, maxCards)
            .map((card) => (
              <CardItem
                key={card.id}
                card={card}
                isSelected={card.id === selectedCardId}
                width={cardWidth}
              />
            ))
        )}
        {cards.length > maxCards && (
          <Text color={KANBAN_COLORS.muted}>
            +{cards.length - maxCards} more
          </Text>
        )}
      </Box>
    </Box>
  );
}

// Card editor component
function CardEditor({
  card,
  isNew,
  onSave,
  onCancel,
  width,
}: {
  card: Card | null;
  isNew: boolean;
  onSave: (title: string, description: string, priority: Priority) => void;
  onCancel: () => void;
  width: number;
}) {
  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");
  const [priority, setPriority] = useState<Priority>(
    card?.priority || "medium",
  );
  const [focusField, setFocusField] = useState<"title" | "description">(
    "title",
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Ctrl+S to save
    if (key.ctrl && input === "s") {
      if (title.trim().length > 0) {
        onSave(title, description, priority);
      }
      return;
    }

    // Tab to switch fields
    if (key.tab) {
      setFocusField((f) => (f === "title" ? "description" : "title"));
      return;
    }

    // Number keys to set priority
    if (input === "1") setPriority("low");
    else if (input === "2") setPriority("medium");
    else if (input === "3") setPriority("high");
    else if (input === "4") setPriority("urgent");
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={KANBAN_COLORS.accent}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 4)}
    >
      <Box marginBottom={1}>
        <Text color={KANBAN_COLORS.accent} bold>
          {"[ "}
          {isNew ? "NEW CARD" : "EDIT CARD"}
          {" ]"}
        </Text>
      </Box>

      {/* Title input */}
      <Box flexDirection="column" marginBottom={1}>
        <Text
          color={
            focusField === "title" ? KANBAN_COLORS.accent : KANBAN_COLORS.muted
          }
        >
          Title:
        </Text>
        {focusField === "title" ? (
          <TextInput
            value={title}
            onChange={setTitle}
            placeholder="Card title..."
          />
        ) : (
          <Text>{title || "(empty)"}</Text>
        )}
      </Box>

      {/* Description input */}
      <Box flexDirection="column" marginBottom={1}>
        <Text
          color={
            focusField === "description"
              ? KANBAN_COLORS.accent
              : KANBAN_COLORS.muted
          }
        >
          Description:
        </Text>
        {focusField === "description" ? (
          <TextInput
            value={description}
            onChange={setDescription}
            placeholder="Optional description..."
          />
        ) : (
          <Text color={KANBAN_COLORS.muted}>{description || "(none)"}</Text>
        )}
      </Box>

      {/* Priority selector */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={KANBAN_COLORS.secondary}>Priority: </Text>
        {PRIORITY_ORDER.map((p, i) => (
          <Text
            key={p}
            color={
              p === priority ? PRIORITY_CONFIG[p].color : KANBAN_COLORS.muted
            }
            bold={p === priority}
          >
            {i + 1}:{PRIORITY_CONFIG[p].label}
            {i < PRIORITY_ORDER.length - 1 ? " " : ""}
          </Text>
        ))}
      </Box>

      <Box>
        <Text color={KANBAN_COLORS.muted}>
          Tab switch field | 1-4 priority | Ctrl+S save | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}

// Delete confirmation component
function DeleteConfirmation({
  card,
  onConfirm,
  onCancel,
}: {
  card: Card;
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
      <Text color={KANBAN_COLORS.danger} bold>
        Delete "{card.title}"?
      </Text>
      <Text color={KANBAN_COLORS.muted}>
        Press Y to confirm, N or Esc to cancel
      </Text>
    </Box>
  );
}

// Board selector component
function BoardSelector({
  boards,
  activeBoardId,
  onSelect,
  onCancel,
}: {
  boards: Board[];
  activeBoardId: string | undefined;
  onSelect: (boardId: string) => void;
  onCancel: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(
    boards.findIndex((b) => b.id === activeBoardId) || 0,
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(boards.length - 1, i + 1));
    } else if (key.return) {
      const board = boards[selectedIndex];
      if (board) {
        onSelect(board.id);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={KANBAN_COLORS.secondary}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text color={KANBAN_COLORS.secondary} bold>
          {"[ SELECT BOARD ]"}
        </Text>
      </Box>

      {boards.map((board, i) => (
        <Box key={board.id}>
          <Text
            color={
              i === selectedIndex ? KANBAN_COLORS.accent : KANBAN_COLORS.muted
            }
          >
            {i === selectedIndex ? "> " : "  "}
          </Text>
          <Text
            color={i === selectedIndex ? KANBAN_COLORS.primary : "white"}
            bold={i === selectedIndex}
          >
            {board.name}
          </Text>
          <Text color={KANBAN_COLORS.muted}> ({board.cards.length} cards)</Text>
          {board.id === activeBoardId && (
            <Text color={KANBAN_COLORS.success}> *</Text>
          )}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color={KANBAN_COLORS.muted}>
          Up/Down navigate | Enter select | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}

// New board input component
function NewBoardInput({
  onSave,
  onCancel,
}: {
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return && name.trim()) {
      onSave(name.trim());
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={KANBAN_COLORS.accent}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text color={KANBAN_COLORS.accent} bold>
          {"[ NEW BOARD ]"}
        </Text>
      </Box>

      <Box>
        <Text color={KANBAN_COLORS.secondary}>Name: </Text>
        <TextInput
          value={name}
          onChange={setName}
          placeholder="Board name..."
        />
      </Box>

      <Box marginTop={1}>
        <Text color={KANBAN_COLORS.muted}>Enter to create | Esc cancel</Text>
      </Box>
    </Box>
  );
}

export function KanbanCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "kanban",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Kanban service
  const serviceRef = useRef<KanbanService | null>(null);
  const filePath = initialConfig?.filePath || DEFAULT_KANBAN_PATH;

  // Board state
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);

  // Card organization by column
  const [todoCards, setTodoCards] = useState<Card[]>([]);
  const [progressCards, setProgressCards] = useState<Card[]>([]);
  const [doneCards, setDoneCards] = useState<Card[]>([]);

  // Selection state
  const [activeColumn, setActiveColumn] = useState<ColumnType>("todo");
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);

  // Save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // UI state
  const [showHelp, setShowHelp] = useState(false);

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
    "kanban",
    handleNavigate,
  );

  // Get cards for current column
  const getCurrentColumnCards = useCallback((): Card[] => {
    switch (activeColumn) {
      case "todo":
        return todoCards;
      case "in_progress":
        return progressCards;
      case "done":
        return doneCards;
    }
  }, [activeColumn, todoCards, progressCards, doneCards]);

  // Get selected card
  const getSelectedCard = useCallback((): Card | null => {
    const cards = getCurrentColumnCards();
    return cards[selectedCardIndex] || null;
  }, [getCurrentColumnCards, selectedCardIndex]);

  // Initialize service
  useEffect(() => {
    serviceRef.current = new KanbanService(filePath);
  }, [filePath]);

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

  // Load data
  const loadData = useCallback(async () => {
    if (!serviceRef.current) return;

    const allBoards = await serviceRef.current.getAllBoards();
    setBoards(allBoards);

    const board = await serviceRef.current.getActiveBoard();
    if (board) {
      setActiveBoard(board);
      setTodoCards(board.cards.filter((c) => c.column === "todo"));
      setProgressCards(board.cards.filter((c) => c.column === "in_progress"));
      setDoneCards(board.cards.filter((c) => c.column === "done"));
    }

    setLastSaved(new Date());
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh cards from active board
  const refreshCards = useCallback(() => {
    if (!activeBoard) return;
    setTodoCards(activeBoard.cards.filter((c) => c.column === "todo"));
    setProgressCards(
      activeBoard.cards.filter((c) => c.column === "in_progress"),
    );
    setDoneCards(activeBoard.cards.filter((c) => c.column === "done"));
  }, [activeBoard]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  // Create new card
  const createCard = useCallback(() => {
    setIsNewCard(true);
    setEditingCard(null);
    setViewMode("add");
  }, []);

  // Edit existing card
  const editCard = useCallback(() => {
    const card = getSelectedCard();
    if (card) {
      setIsNewCard(false);
      setEditingCard(card);
      setViewMode("edit");
    }
  }, [getSelectedCard]);

  // Save card
  const handleSaveCard = useCallback(
    async (title: string, description: string, priority: Priority) => {
      if (!serviceRef.current) return;

      if (isNewCard) {
        await serviceRef.current.addCard(
          title,
          description,
          priority,
          activeColumn,
        );
      } else if (editingCard) {
        await serviceRef.current.updateCard(editingCard.id, {
          title,
          description,
          priority,
        });
      }

      await loadData();
      setEditingCard(null);
      setIsNewCard(false);
      setViewMode("board");
      setIsDirty(true);
    },
    [isNewCard, editingCard, activeColumn, loadData],
  );

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingCard(null);
    setIsNewCard(false);
    setViewMode("board");
  }, []);

  // Move card to different column
  const moveCardToColumn = useCallback(
    async (direction: "left" | "right") => {
      const card = getSelectedCard();
      if (!card || !serviceRef.current) return;

      const columnOrder: ColumnType[] = ["todo", "in_progress", "done"];
      const currentIndex = columnOrder.indexOf(card.column);
      let newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
      newIndex = Math.max(0, Math.min(columnOrder.length - 1, newIndex));

      if (newIndex !== currentIndex) {
        const newColumn = columnOrder[newIndex]!;
        await serviceRef.current.moveCard(card.id, newColumn);
        setActiveColumn(newColumn);
        await loadData();
        setSelectedCardIndex(0);
        setIsDirty(true);
      }
    },
    [getSelectedCard, loadData],
  );

  // Cycle card priority
  const cyclePriority = useCallback(async () => {
    const card = getSelectedCard();
    if (!card || !serviceRef.current) return;

    const currentIndex = PRIORITY_ORDER.indexOf(card.priority);
    const nextIndex = (currentIndex + 1) % PRIORITY_ORDER.length;
    const newPriority = PRIORITY_ORDER[nextIndex]!;

    await serviceRef.current.updateCard(card.id, { priority: newPriority });
    await loadData();
    setIsDirty(true);
  }, [getSelectedCard, loadData]);

  // Delete card
  const requestDelete = useCallback(() => {
    const card = getSelectedCard();
    if (card) {
      setDeleteTarget(card);
      setViewMode("delete");
    }
  }, [getSelectedCard]);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget && serviceRef.current) {
      await serviceRef.current.deleteCard(deleteTarget.id);
      await loadData();
      setSelectedCardIndex((i) => Math.max(0, i - 1));
      setIsDirty(true);
    }
    setDeleteTarget(null);
    setViewMode("board");
  }, [deleteTarget, loadData]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
    setViewMode("board");
  }, []);

  // Board management
  const switchBoard = useCallback(
    async (boardId: string) => {
      if (!serviceRef.current) return;
      await serviceRef.current.setActiveBoard(boardId);
      await loadData();
      setSelectedCardIndex(0);
      setViewMode("board");
    },
    [loadData],
  );

  const createBoard = useCallback(
    async (name: string) => {
      if (!serviceRef.current) return;
      await serviceRef.current.createBoard(name);
      await loadData();
      setSelectedCardIndex(0);
      setViewMode("board");
      setIsDirty(true);
    },
    [loadData],
  );

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

      // Handle different view modes
      if (viewMode === "delete" || viewMode === "add" || viewMode === "edit") {
        return; // Handled by sub-components
      }

      if (viewMode === "board-select" || viewMode === "board-add") {
        return; // Handled by sub-components
      }

      // Board mode controls
      if (key.escape || input === "q") {
        const result: KanbanResult = {
          action: "save",
          boardId: activeBoard?.id,
          cardCount: activeBoard?.cards.length,
          filePath,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Column navigation
      const cards = getCurrentColumnCards();

      if (key.upArrow) {
        setSelectedCardIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedCardIndex((i) => Math.min(cards.length - 1, i + 1));
      }

      // Move card between columns
      if (key.leftArrow) {
        moveCardToColumn("left");
      } else if (key.rightArrow) {
        moveCardToColumn("right");
      }

      // Jump to column
      if (input === "1") {
        setActiveColumn("todo");
        setSelectedCardIndex(0);
      } else if (input === "2") {
        setActiveColumn("in_progress");
        setSelectedCardIndex(0);
      } else if (input === "3") {
        setActiveColumn("done");
        setSelectedCardIndex(0);
      }

      // Card actions
      if (input === "n") {
        createCard();
      } else if (key.return) {
        editCard();
      } else if (input === "d") {
        requestDelete();
      } else if (input === "p") {
        cyclePriority();
      }

      // Board actions
      if (input === "b") {
        setViewMode("board-select");
      } else if (input === "B") {
        setViewMode("board-add");
      }
    },
    { isActive: viewMode === "board" && !showNav },
  );

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;
  const columnWidth = Math.floor((termWidth - 6) / 3);

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={KANBAN_COLORS.accent}
      >
        <Text color={KANBAN_COLORS.accent} bold>
          {"// KANBAN //"}
        </Text>
        <Text color={KANBAN_COLORS.secondary}>
          {activeBoard?.name || "No Board"}
        </Text>
        <Text color={KANBAN_COLORS.muted}>
          {activeBoard?.cards.length || 0} cards
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Board view */}
        {viewMode === "board" && (
          <Box
            flexDirection="row"
            justifyContent="space-between"
            height={contentHeight - 2}
          >
            {COLUMNS.map((col) => (
              <Column
                key={col.type}
                columnType={col.type}
                label={col.label}
                emoji={col.emoji}
                cards={
                  col.type === "todo"
                    ? todoCards
                    : col.type === "in_progress"
                      ? progressCards
                      : doneCards
                }
                selectedCardId={
                  activeColumn === col.type
                    ? getSelectedCard()?.id || null
                    : null
                }
                isActiveColumn={activeColumn === col.type}
                width={columnWidth}
                height={contentHeight - 2}
              />
            ))}
          </Box>
        )}

        {/* Card editor */}
        {(viewMode === "add" || viewMode === "edit") && (
          <Box
            justifyContent="center"
            alignItems="center"
            height={contentHeight - 2}
          >
            <CardEditor
              card={editingCard}
              isNew={isNewCard}
              onSave={handleSaveCard}
              onCancel={handleCancelEdit}
              width={termWidth}
            />
          </Box>
        )}

        {/* Delete confirmation */}
        {viewMode === "delete" && deleteTarget && (
          <Box
            justifyContent="center"
            alignItems="center"
            height={contentHeight - 2}
          >
            <DeleteConfirmation
              card={deleteTarget}
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
            />
          </Box>
        )}

        {/* Board selector */}
        {viewMode === "board-select" && (
          <Box
            justifyContent="center"
            alignItems="center"
            height={contentHeight - 2}
          >
            <BoardSelector
              boards={boards}
              activeBoardId={activeBoard?.id}
              onSelect={switchBoard}
              onCancel={() => setViewMode("board")}
            />
          </Box>
        )}

        {/* New board input */}
        {viewMode === "board-add" && (
          <Box
            justifyContent="center"
            alignItems="center"
            height={contentHeight - 2}
          >
            <NewBoardInput
              onSave={createBoard}
              onCancel={() => setViewMode("board")}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={KANBAN_COLORS.muted}>
          Tab nav | ? help | n new | Enter edit | d del | Arrows move | p
          priority | b boards | q quit
        </Text>
        <Text color={KANBAN_COLORS.muted}>
          {lastSaved ? `Saved` : isDirty ? "Unsaved" : ""}
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
            title="KANBAN"
            bindings={KANBAN_BINDINGS}
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
            currentCanvas="kanban"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
