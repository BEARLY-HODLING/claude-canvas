// RSS Canvas - Type Definitions

import type { Feed, FeedItem, FeedResult } from "../../services/rss";

/**
 * RSS feed source configuration
 */
export interface FeedSource {
  url: string;
  name?: string; // Custom name override
  enabled?: boolean;
}

/**
 * RSS canvas configuration
 */
export interface RSSConfig {
  mode?: "rss";
  title?: string;
  feeds?: string[]; // Feed URLs
  refreshInterval?: number; // Seconds (default: 300 = 5 min)
  maxItemsPerFeed?: number; // Max items to show per feed (default: 20)
  showReadItems?: boolean; // Show already read items
  defaultExpanded?: boolean; // Start with feeds expanded
}

/**
 * RSS canvas result
 */
export interface RSSResult {
  selectedFeed?: FeedResult;
  selectedItem?: FeedItem;
  action: "view" | "open" | "add" | "remove" | "close" | "mark_read";
}

/**
 * Tracked feed with state
 */
export interface TrackedFeed {
  url: string;
  customName?: string;
  result: FeedResult | null;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  readItems: Set<string>; // Set of read item IDs
}

/**
 * View mode for the canvas
 */
export type ViewMode = "feeds" | "items" | "article";

/**
 * RSS canvas state
 */
export interface RSSState {
  feeds: TrackedFeed[];
  selectedFeedIndex: number;
  selectedItemIndex: number;
  viewMode: ViewMode;
  lastUpdated: Date | null;
  isRefreshing: boolean;
}

// Cyberpunk color palette (shared)
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  neonOrange: "#ff8800",
  dim: "gray",
  bg: "black",
} as const;

// Re-export types from service
export type { Feed, FeedItem, FeedResult };
