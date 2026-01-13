// Kanban Service - CRUD operations for Kanban boards with JSON file storage

import os from "os";
import path from "path";
import type {
  Board,
  Card,
  SerializedBoard,
  SerializedCard,
  KanbanStore,
  ColumnType,
  Priority,
} from "../canvases/kanban/types";

// Default storage path
export const DEFAULT_KANBAN_PATH = path.join(
  os.homedir(),
  ".claude-canvas",
  "kanban.json",
);

/**
 * Generate unique ID for cards and boards
 */
export function generateId(prefix: string = "card"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Serialize card for storage
 */
function serializeCard(card: Card): SerializedCard {
  return {
    ...card,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    dueDate: card.dueDate?.toISOString(),
  };
}

/**
 * Deserialize card from storage
 */
function deserializeCard(serialized: SerializedCard): Card {
  return {
    ...serialized,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
    dueDate: serialized.dueDate ? new Date(serialized.dueDate) : undefined,
  };
}

/**
 * Serialize board for storage
 */
function serializeBoard(board: Board): SerializedBoard {
  return {
    ...board,
    cards: board.cards.map(serializeCard),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

/**
 * Deserialize board from storage
 */
function deserializeBoard(serialized: SerializedBoard): Board {
  return {
    ...serialized,
    cards: serialized.cards.map(deserializeCard),
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}

/**
 * Kanban Service class
 */
export class KanbanService {
  private storePath: string;
  private boards: Board[] = [];
  private activeBoardId: string | undefined;
  private loaded = false;

  constructor(storePath?: string) {
    this.storePath = storePath || DEFAULT_KANBAN_PATH;
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.storePath);
    const { mkdir } = await import("fs/promises");
    await mkdir(dir, { recursive: true });
  }

  /**
   * Load boards from file
   */
  async load(): Promise<Board[]> {
    try {
      const file = Bun.file(this.storePath);
      if (await file.exists()) {
        const text = await file.text();
        const data = JSON.parse(text) as KanbanStore;
        this.boards = data.boards.map(deserializeBoard);
        this.activeBoardId = data.activeBoard;
      } else {
        // Create default board
        const defaultBoard = this.createDefaultBoard();
        this.boards = [defaultBoard];
        this.activeBoardId = defaultBoard.id;
        await this.save();
      }
      this.loaded = true;
      return this.boards;
    } catch (err) {
      console.error("Failed to load kanban data:", err);
      const defaultBoard = this.createDefaultBoard();
      this.boards = [defaultBoard];
      this.activeBoardId = defaultBoard.id;
      this.loaded = true;
      return this.boards;
    }
  }

  /**
   * Create a default board
   */
  private createDefaultBoard(): Board {
    return {
      id: generateId("board"),
      name: "My Board",
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Save boards to file
   */
  async save(): Promise<void> {
    try {
      await this.ensureDir();
      const data: KanbanStore = {
        version: 1,
        boards: this.boards.map(serializeBoard),
        activeBoard: this.activeBoardId,
      };
      await Bun.write(this.storePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Failed to save kanban data:", err);
      throw err;
    }
  }

  /**
   * Get all boards
   */
  async getAllBoards(): Promise<Board[]> {
    if (!this.loaded) {
      await this.load();
    }
    return [...this.boards];
  }

  /**
   * Get active board
   */
  async getActiveBoard(): Promise<Board | undefined> {
    if (!this.loaded) {
      await this.load();
    }
    return this.boards.find((b) => b.id === this.activeBoardId);
  }

  /**
   * Set active board
   */
  async setActiveBoard(boardId: string): Promise<Board | undefined> {
    if (!this.loaded) {
      await this.load();
    }
    const board = this.boards.find((b) => b.id === boardId);
    if (board) {
      this.activeBoardId = boardId;
      await this.save();
    }
    return board;
  }

  /**
   * Create a new board
   */
  async createBoard(name: string): Promise<Board> {
    if (!this.loaded) {
      await this.load();
    }

    const board: Board = {
      id: generateId("board"),
      name: name.trim() || "New Board",
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.boards.push(board);
    this.activeBoardId = board.id;
    await this.save();
    return board;
  }

  /**
   * Delete a board
   */
  async deleteBoard(boardId: string): Promise<boolean> {
    if (!this.loaded) {
      await this.load();
    }

    const index = this.boards.findIndex((b) => b.id === boardId);
    if (index === -1) return false;

    this.boards.splice(index, 1);

    // If we deleted the active board, switch to another
    if (this.activeBoardId === boardId) {
      this.activeBoardId = this.boards[0]?.id;
    }

    // Ensure at least one board exists
    if (this.boards.length === 0) {
      const defaultBoard = this.createDefaultBoard();
      this.boards = [defaultBoard];
      this.activeBoardId = defaultBoard.id;
    }

    await this.save();
    return true;
  }

  /**
   * Rename a board
   */
  async renameBoard(
    boardId: string,
    newName: string,
  ): Promise<Board | undefined> {
    if (!this.loaded) {
      await this.load();
    }

    const board = this.boards.find((b) => b.id === boardId);
    if (!board) return undefined;

    board.name = newName.trim() || board.name;
    board.updatedAt = new Date();
    await this.save();
    return board;
  }

  /**
   * Add a card to the active board
   */
  async addCard(
    title: string,
    description?: string,
    priority: Priority = "medium",
    column: ColumnType = "todo",
  ): Promise<Card | undefined> {
    if (!this.loaded) {
      await this.load();
    }

    const board = this.boards.find((b) => b.id === this.activeBoardId);
    if (!board) return undefined;

    const card: Card = {
      id: generateId("card"),
      title: title.trim(),
      description: description?.trim(),
      priority,
      column,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    board.cards.push(card);
    board.updatedAt = new Date();
    await this.save();
    return card;
  }

  /**
   * Update a card
   */
  async updateCard(
    cardId: string,
    updates: Partial<Omit<Card, "id" | "createdAt">>,
  ): Promise<Card | undefined> {
    if (!this.loaded) {
      await this.load();
    }

    const board = this.boards.find((b) => b.id === this.activeBoardId);
    if (!board) return undefined;

    const cardIndex = board.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return undefined;

    const card = board.cards[cardIndex]!;
    const updated: Card = {
      ...card,
      ...updates,
      title: updates.title?.trim() || card.title,
      description: updates.description?.trim() ?? card.description,
      updatedAt: new Date(),
    };

    board.cards[cardIndex] = updated;
    board.updatedAt = new Date();
    await this.save();
    return updated;
  }

  /**
   * Move a card to a different column
   */
  async moveCard(
    cardId: string,
    newColumn: ColumnType,
  ): Promise<Card | undefined> {
    return this.updateCard(cardId, { column: newColumn });
  }

  /**
   * Delete a card
   */
  async deleteCard(cardId: string): Promise<boolean> {
    if (!this.loaded) {
      await this.load();
    }

    const board = this.boards.find((b) => b.id === this.activeBoardId);
    if (!board) return false;

    const index = board.cards.findIndex((c) => c.id === cardId);
    if (index === -1) return false;

    board.cards.splice(index, 1);
    board.updatedAt = new Date();
    await this.save();
    return true;
  }

  /**
   * Get cards for a specific column
   */
  async getCardsByColumn(column: ColumnType): Promise<Card[]> {
    const board = await this.getActiveBoard();
    if (!board) return [];
    return board.cards.filter((c) => c.column === column);
  }

  /**
   * Get card counts per column
   */
  async getColumnCounts(): Promise<Record<ColumnType, number>> {
    const board = await this.getActiveBoard();
    const counts: Record<ColumnType, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
    };

    if (board) {
      for (const card of board.cards) {
        counts[card.column]++;
      }
    }

    return counts;
  }

  /**
   * Search cards by title or description
   */
  async searchCards(query: string): Promise<Card[]> {
    const board = await this.getActiveBoard();
    if (!board) return [];

    const q = query.toLowerCase().trim();
    if (!q) return board.cards;

    return board.cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Default service instance
export const kanbanService = new KanbanService();
