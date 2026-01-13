// Bookmarks Service - CRUD operations for URL bookmarks with JSON file storage

import os from "os";
import path from "path";

/**
 * Bookmark structure
 */
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folder?: string;
  created: Date;
  lastVisited?: Date;
  visitCount: number;
}

/**
 * Serialized bookmark for file storage
 */
export interface SerializedBookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folder?: string;
  created: string;
  lastVisited?: string;
  visitCount: number;
}

/**
 * Storage format
 */
interface BookmarksStore {
  version: number;
  bookmarks: SerializedBookmark[];
}

// Default storage path
export const DEFAULT_BOOKMARKS_PATH = path.join(
  os.homedir(),
  ".canvas-bookmarks.json",
);

/**
 * Generate unique ID for bookmarks
 */
export function generateId(): string {
  return `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Serialize bookmark for storage
 */
function serializeBookmark(bookmark: Bookmark): SerializedBookmark {
  return {
    ...bookmark,
    created: bookmark.created.toISOString(),
    lastVisited: bookmark.lastVisited?.toISOString(),
  };
}

/**
 * Deserialize bookmark from storage
 */
function deserializeBookmark(serialized: SerializedBookmark): Bookmark {
  return {
    ...serialized,
    created: new Date(serialized.created),
    lastVisited: serialized.lastVisited
      ? new Date(serialized.lastVisited)
      : undefined,
  };
}

/**
 * Bookmarks Service class
 */
export class BookmarksService {
  private storePath: string;
  private bookmarks: Bookmark[] = [];
  private loaded = false;

  constructor(storePath?: string) {
    this.storePath = storePath || DEFAULT_BOOKMARKS_PATH;
  }

  /**
   * Load bookmarks from file
   */
  async load(): Promise<Bookmark[]> {
    try {
      const file = Bun.file(this.storePath);
      if (await file.exists()) {
        const text = await file.text();
        const data = JSON.parse(text) as BookmarksStore;
        this.bookmarks = data.bookmarks.map(deserializeBookmark);
      } else {
        this.bookmarks = [];
      }
      this.loaded = true;
      return this.bookmarks;
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
      this.bookmarks = [];
      this.loaded = true;
      return [];
    }
  }

  /**
   * Save bookmarks to file
   */
  async save(): Promise<void> {
    try {
      const data: BookmarksStore = {
        version: 1,
        bookmarks: this.bookmarks.map(serializeBookmark),
      };
      await Bun.write(this.storePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Failed to save bookmarks:", err);
      throw err;
    }
  }

  /**
   * Get all bookmarks
   */
  async getAll(): Promise<Bookmark[]> {
    if (!this.loaded) {
      await this.load();
    }
    return [...this.bookmarks];
  }

  /**
   * Get bookmark by ID
   */
  async getById(id: string): Promise<Bookmark | undefined> {
    if (!this.loaded) {
      await this.load();
    }
    return this.bookmarks.find((b) => b.id === id);
  }

  /**
   * Create a new bookmark
   */
  async create(
    title: string,
    url: string,
    tags: string[] = [],
    folder?: string,
  ): Promise<Bookmark> {
    if (!this.loaded) {
      await this.load();
    }

    const bookmark: Bookmark = {
      id: generateId(),
      title: title.trim() || extractTitleFromUrl(url),
      url: normalizeUrl(url),
      tags: tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0),
      folder: folder?.trim(),
      created: new Date(),
      visitCount: 0,
    };

    this.bookmarks.unshift(bookmark); // Add to beginning
    await this.save();
    return bookmark;
  }

  /**
   * Update an existing bookmark
   */
  async update(
    id: string,
    updates: Partial<Omit<Bookmark, "id" | "created">>,
  ): Promise<Bookmark | undefined> {
    if (!this.loaded) {
      await this.load();
    }

    const index = this.bookmarks.findIndex((b) => b.id === id);
    if (index === -1) return undefined;

    const bookmark = this.bookmarks[index]!;
    const updated: Bookmark = {
      ...bookmark,
      ...updates,
      title: updates.title?.trim() || bookmark.title,
      url: updates.url ? normalizeUrl(updates.url) : bookmark.url,
      tags: updates.tags
        ? updates.tags
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        : bookmark.tags,
      folder: updates.folder?.trim() || bookmark.folder,
    };

    this.bookmarks[index] = updated;
    await this.save();
    return updated;
  }

  /**
   * Delete a bookmark
   */
  async delete(id: string): Promise<boolean> {
    if (!this.loaded) {
      await this.load();
    }

    const index = this.bookmarks.findIndex((b) => b.id === id);
    if (index === -1) return false;

    this.bookmarks.splice(index, 1);
    await this.save();
    return true;
  }

  /**
   * Record a visit to a bookmark
   */
  async recordVisit(id: string): Promise<Bookmark | undefined> {
    if (!this.loaded) {
      await this.load();
    }

    const bookmark = this.bookmarks.find((b) => b.id === id);
    if (!bookmark) return undefined;

    bookmark.lastVisited = new Date();
    bookmark.visitCount++;
    await this.save();
    return bookmark;
  }

  /**
   * Search bookmarks by title, URL, or tag
   */
  async search(query: string): Promise<Bookmark[]> {
    if (!this.loaded) {
      await this.load();
    }

    const q = query.toLowerCase().trim();
    if (!q) return [...this.bookmarks];

    return this.bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.tags.some((t) => t.includes(q)) ||
        (b.folder && b.folder.toLowerCase().includes(q)),
    );
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    if (!this.loaded) {
      await this.load();
    }

    const tags = new Set<string>();
    for (const bookmark of this.bookmarks) {
      for (const tag of bookmark.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  /**
   * Get all unique folders
   */
  async getAllFolders(): Promise<string[]> {
    if (!this.loaded) {
      await this.load();
    }

    const folders = new Set<string>();
    for (const bookmark of this.bookmarks) {
      if (bookmark.folder) {
        folders.add(bookmark.folder);
      }
    }
    return Array.from(folders).sort();
  }

  /**
   * Get bookmarks by folder (null for unfiled)
   */
  async getByFolder(folder: string | null): Promise<Bookmark[]> {
    if (!this.loaded) {
      await this.load();
    }

    if (folder === null) {
      return this.bookmarks.filter((b) => !b.folder);
    }
    return this.bookmarks.filter((b) => b.folder === folder);
  }

  /**
   * Get bookmarks by tag
   */
  async getByTag(tag: string): Promise<Bookmark[]> {
    if (!this.loaded) {
      await this.load();
    }

    const t = tag.toLowerCase();
    return this.bookmarks.filter((b) => b.tags.includes(t));
  }

  /**
   * Add tag to bookmark
   */
  async addTag(id: string, tag: string): Promise<Bookmark | undefined> {
    const bookmark = await this.getById(id);
    if (!bookmark) return undefined;

    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag || bookmark.tags.includes(normalizedTag)) {
      return bookmark;
    }

    return this.update(id, { tags: [...bookmark.tags, normalizedTag] });
  }

  /**
   * Remove tag from bookmark
   */
  async removeTag(id: string, tag: string): Promise<Bookmark | undefined> {
    const bookmark = await this.getById(id);
    if (!bookmark) return undefined;

    const t = tag.toLowerCase();
    return this.update(id, { tags: bookmark.tags.filter((bt) => bt !== t) });
  }
}

/**
 * Normalize URL (add https:// if missing)
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Extract title from URL (domain name)
 */
function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    // Remove www. prefix and get domain
    const hostname = parsed.hostname.replace(/^www\./, "");
    // Capitalize first letter
    return hostname.charAt(0).toUpperCase() + hostname.slice(1);
  } catch {
    return url;
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

/**
 * Get domain from URL for display
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Default service instance
export const bookmarksService = new BookmarksService();
