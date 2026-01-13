// RSS Canvas - News feed reader with real-time updates

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type RSSConfig,
  type TrackedFeed,
  type ViewMode,
  CYBER_COLORS,
} from "./rss/types";
import { HelpOverlay, type KeyBinding } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  rssService,
  formatRelativeTime,
  getSourceName,
  DEFAULT_FEEDS,
  type FeedItem,
  type FeedResult,
} from "../services/rss";

interface Props {
  id: string;
  config?: RSSConfig;
  socketPath?: string;
  scenario?: string;
}

// RSS keybindings
const RSS_BINDINGS: KeyBinding[] = [
  {
    key: "up/down",
    description: "Navigate feeds/items",
    category: "navigation",
  },
  {
    key: "Enter",
    description: "Expand/collapse or open article",
    category: "action",
  },
  { key: "a", description: "Add feed URL", category: "action" },
  { key: "d", description: "Remove feed", category: "action" },
  { key: "o", description: "Open in browser", category: "action" },
  { key: "m", description: "Mark as read/unread", category: "action" },
  { key: "M", description: "Mark all as read", category: "action" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  { key: "r", description: "Refresh feeds", category: "action" },
  { key: "?", description: "Toggle help", category: "other" },
  { key: "q/Esc", description: "Quit", category: "other" },
];

// Feed summary row
function FeedSummaryRow({
  feed,
  isSelected,
  width,
}: {
  feed: TrackedFeed;
  isSelected: boolean;
  width: number;
}) {
  const feedName =
    feed.customName || feed.result?.feed?.title || getSourceName(feed.url);
  const unreadCount =
    feed.result?.feed?.items.filter((item) => !feed.readItems.has(item.id))
      .length || 0;
  const totalItems = feed.result?.feed?.items.length || 0;

  const nameWidth = Math.min(35, Math.floor(width * 0.5));
  const displayName = feedName.slice(0, nameWidth);

  return (
    <Box>
      <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
        {isSelected ? (feed.expanded ? "v " : "> ") : "  "}
      </Text>
      <Text
        color={isSelected ? CYBER_COLORS.neonCyan : "white"}
        bold={isSelected}
      >
        {displayName.padEnd(nameWidth)}
      </Text>
      {feed.loading ? (
        <Text color={CYBER_COLORS.neonGreen}>
          {" "}
          <Spinner type="dots" />
        </Text>
      ) : feed.error ? (
        <Text color={CYBER_COLORS.neonRed}> Error</Text>
      ) : (
        <>
          <Text color={CYBER_COLORS.dim}> | </Text>
          <Text
            color={unreadCount > 0 ? CYBER_COLORS.neonGreen : CYBER_COLORS.dim}
            bold={unreadCount > 0}
          >
            {unreadCount}
          </Text>
          <Text color={CYBER_COLORS.dim}> new</Text>
          <Text color={CYBER_COLORS.dim}> / {totalItems} total</Text>
        </>
      )}
    </Box>
  );
}

// Feed item row
function FeedItemRow({
  item,
  isSelected,
  isRead,
  width,
}: {
  item: FeedItem;
  isSelected: boolean;
  isRead: boolean;
  width: number;
}) {
  const titleWidth = Math.max(30, width - 25);
  const displayTitle = item.title.slice(0, titleWidth);
  const timeAgo = formatRelativeTime(item.pubDate);

  return (
    <Box>
      <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
        {isSelected ? "> " : "  "}
      </Text>
      <Text color={isRead ? CYBER_COLORS.dim : CYBER_COLORS.neonGreen}>
        {isRead ? "\u25CB" : "\u25CF"}
      </Text>
      <Text
        color={
          isSelected
            ? CYBER_COLORS.neonCyan
            : isRead
              ? CYBER_COLORS.dim
              : "white"
        }
        bold={isSelected && !isRead}
      >
        {" "}
        {displayTitle}
      </Text>
      <Text color={CYBER_COLORS.dim}> {timeAgo}</Text>
    </Box>
  );
}

// Expanded feed items
function FeedItemsList({
  feed,
  selectedItemIndex,
  maxItems,
  width,
}: {
  feed: TrackedFeed;
  selectedItemIndex: number;
  maxItems: number;
  width: number;
}) {
  const items = feed.result?.feed?.items || [];

  if (items.length === 0) {
    return (
      <Box marginLeft={4} marginY={1}>
        <Text color={CYBER_COLORS.dim}>No items in this feed</Text>
      </Box>
    );
  }

  // Calculate visible window
  const visibleCount = Math.min(items.length, maxItems);
  const halfVisible = Math.floor(visibleCount / 2);
  let startIndex = Math.max(0, selectedItemIndex - halfVisible);
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  if (endIndex === items.length) {
    startIndex = Math.max(0, items.length - visibleCount);
  }

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" marginLeft={2} marginY={1}>
      {visibleItems.map((item, idx) => {
        const actualIndex = startIndex + idx;
        return (
          <FeedItemRow
            key={item.id}
            item={item}
            isSelected={actualIndex === selectedItemIndex}
            isRead={feed.readItems.has(item.id)}
            width={width - 6}
          />
        );
      })}
      {items.length > maxItems && (
        <Box marginLeft={2}>
          <Text color={CYBER_COLORS.dim}>
            Showing {startIndex + 1}-{endIndex} of {items.length} items
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Article preview panel
function ArticlePreview({
  item,
  width,
  height,
}: {
  item: FeedItem | null;
  width: number;
  height: number;
}) {
  if (!item) {
    return (
      <Box
        flexDirection="column"
        width={width}
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        <Text color={CYBER_COLORS.dim}>Select an article to preview</Text>
      </Box>
    );
  }

  const descLines = Math.max(3, height - 8);
  const desc = item.description || "No description available.";
  const truncatedDesc = desc.slice(0, descLines * (width - 4));

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={CYBER_COLORS.neonMagenta}
      paddingX={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonCyan} bold wrap="truncate">
          {item.title.slice(0, width - 4)}
        </Text>
      </Box>

      {/* Metadata */}
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.dim}>
          {formatRelativeTime(item.pubDate)}
          {item.author && ` | ${item.author}`}
        </Text>
      </Box>

      {/* Categories */}
      {item.categories && item.categories.length > 0 && (
        <Box marginBottom={1}>
          {item.categories.slice(0, 4).map((cat, idx) => (
            <Text key={cat} color={CYBER_COLORS.neonYellow}>
              {idx > 0 ? " " : ""}[{cat}]
            </Text>
          ))}
        </Box>
      )}

      {/* Description */}
      <Box flexDirection="column">
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ PREVIEW ]"}
        </Text>
        <Text color="white" wrap="wrap">
          {truncatedDesc}
        </Text>
      </Box>

      {/* Link hint */}
      <Box marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          Press Enter or o to open in browser
        </Text>
      </Box>
    </Box>
  );
}

// Add feed input
function AddFeedInput({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  useInput((_, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box marginY={1} paddingX={1}>
      <Text color={CYBER_COLORS.neonCyan}>Add feed URL: </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="https://example.com/feed.xml"
      />
    </Box>
  );
}

export function RSSCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "rss",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Initialize feeds with defaults or config
  const initialFeeds = (initialConfig?.feeds || DEFAULT_FEEDS).map((url) => ({
    url,
    customName: undefined,
    result: null as FeedResult | null,
    loading: true,
    error: null as string | null,
    expanded: initialConfig?.defaultExpanded ?? false,
    readItems: new Set<string>(),
  }));

  // Feeds state
  const [feeds, setFeeds] = useState<TrackedFeed[]>(initialFeeds);

  // Selection state
  const [selectedFeedIndex, setSelectedFeedIndex] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("feeds");

  // UI state
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [addFeedValue, setAddFeedValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settings
  const refreshInterval = (initialConfig?.refreshInterval || 300) * 1000;
  const maxItemsPerFeed = initialConfig?.maxItemsPerFeed || 20;

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
    "rss",
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

  // Fetch a single feed
  const fetchSingleFeed = useCallback(
    async (url: string): Promise<FeedResult> => {
      return rssService.getFeed(url, true);
    },
    [],
  );

  // Fetch all feeds
  const fetchAllFeeds = useCallback(async () => {
    if (feeds.length === 0) return;

    setIsRefreshing(true);

    const updatedFeeds = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const result = await fetchSingleFeed(feed.url);
          return {
            ...feed,
            result,
            loading: false,
            error: result.error,
          };
        } catch (err) {
          return {
            ...feed,
            loading: false,
            error: (err as Error).message,
          };
        }
      }),
    );

    setFeeds(updatedFeeds);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [feeds, fetchSingleFeed]);

  // Initial fetch
  useEffect(() => {
    if (feeds.length > 0) {
      fetchAllFeeds();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (feeds.length === 0) return;

    const interval = setInterval(fetchAllFeeds, refreshInterval);
    return () => clearInterval(interval);
  }, [feeds.length, refreshInterval, fetchAllFeeds]);

  // Add a new feed
  const addFeed = useCallback(
    async (url: string) => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setError("Please enter a feed URL");
        return;
      }

      // Validate URL format
      try {
        new URL(trimmedUrl);
      } catch {
        setError("Invalid URL format");
        return;
      }

      // Check if already tracking
      if (feeds.some((f) => f.url === trimmedUrl)) {
        setError("Feed already added");
        return;
      }

      // Add with loading state
      const newFeed: TrackedFeed = {
        url: trimmedUrl,
        customName: undefined,
        result: null,
        loading: true,
        error: null,
        expanded: false,
        readItems: new Set(),
      };

      setFeeds((prev) => [...prev, newFeed]);

      // Fetch the feed
      try {
        const result = await fetchSingleFeed(trimmedUrl);
        setFeeds((prev) =>
          prev.map((f) =>
            f.url === trimmedUrl
              ? { ...f, result, loading: false, error: result.error }
              : f,
          ),
        );
      } catch (err) {
        setFeeds((prev) =>
          prev.map((f) =>
            f.url === trimmedUrl
              ? { ...f, loading: false, error: (err as Error).message }
              : f,
          ),
        );
      }

      setShowAddFeed(false);
      setAddFeedValue("");
      setError(null);
    },
    [feeds, fetchSingleFeed],
  );

  // Remove a feed
  const removeFeed = useCallback(
    (index: number) => {
      setFeeds((prev) => prev.filter((_, i) => i !== index));
      if (selectedFeedIndex >= feeds.length - 1) {
        setSelectedFeedIndex(Math.max(0, feeds.length - 2));
      }
      setViewMode("feeds");
      setSelectedItemIndex(0);
    },
    [feeds.length, selectedFeedIndex],
  );

  // Toggle read status for item
  const toggleReadItem = useCallback((feedIndex: number, itemId: string) => {
    setFeeds((prev) =>
      prev.map((feed, idx) => {
        if (idx !== feedIndex) return feed;
        const newReadItems = new Set(feed.readItems);
        if (newReadItems.has(itemId)) {
          newReadItems.delete(itemId);
        } else {
          newReadItems.add(itemId);
        }
        return { ...feed, readItems: newReadItems };
      }),
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback((feedIndex: number) => {
    setFeeds((prev) =>
      prev.map((feed, idx) => {
        if (idx !== feedIndex) return feed;
        const allIds = new Set(feed.result?.feed?.items.map((i) => i.id) || []);
        return { ...feed, readItems: allIds };
      }),
    );
  }, []);

  // Open article (log URL for now)
  const openArticle = useCallback(() => {
    const feed = feeds[selectedFeedIndex];
    if (!feed?.result?.feed) return;

    const item = feed.result.feed.items[selectedItemIndex];
    if (!item) return;

    // Mark as read
    if (!feed.readItems.has(item.id)) {
      toggleReadItem(selectedFeedIndex, item.id);
    }

    ipc.sendSelected({
      action: "open",
      url: item.link,
      title: item.title,
    });
  }, [feeds, selectedFeedIndex, selectedItemIndex, toggleReadItem, ipc]);

  // Get current selected item
  const getSelectedItem = useCallback((): FeedItem | null => {
    const feed = feeds[selectedFeedIndex];
    if (!feed?.result?.feed?.items) return null;
    return feed.result.feed.items[selectedItemIndex] || null;
  }, [feeds, selectedFeedIndex, selectedItemIndex]);

  // Keyboard input
  useInput((input, key) => {
    // Handle add feed mode
    if (showAddFeed) {
      if (key.escape) {
        setShowAddFeed(false);
        setAddFeedValue("");
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
      if (viewMode === "items") {
        // Go back to feeds list
        setViewMode("feeds");
        setFeeds((prev) =>
          prev.map((f, i) =>
            i === selectedFeedIndex ? { ...f, expanded: false } : f,
          ),
        );
        setSelectedItemIndex(0);
        return;
      }
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Actions
    if (input === "a") {
      setShowAddFeed(true);
      return;
    }

    if (input === "d" && feeds.length > 0 && viewMode === "feeds") {
      removeFeed(selectedFeedIndex);
      return;
    }

    if (input === "r") {
      fetchAllFeeds();
      return;
    }

    if (input === "o") {
      openArticle();
      return;
    }

    // Mark read
    if (input === "m" && viewMode === "items") {
      const item = getSelectedItem();
      if (item) {
        toggleReadItem(selectedFeedIndex, item.id);
      }
      return;
    }

    if (input === "M" && viewMode === "items") {
      markAllAsRead(selectedFeedIndex);
      return;
    }

    // Navigation
    if (viewMode === "feeds") {
      if (key.upArrow) {
        setSelectedFeedIndex((i) => Math.max(0, i - 1));
        setSelectedItemIndex(0);
      } else if (key.downArrow) {
        setSelectedFeedIndex((i) => Math.min(feeds.length - 1, i + 1));
        setSelectedItemIndex(0);
      } else if (key.return && feeds.length > 0) {
        // Expand feed and switch to items view
        setFeeds((prev) =>
          prev.map((f, i) =>
            i === selectedFeedIndex
              ? { ...f, expanded: true }
              : { ...f, expanded: false },
          ),
        );
        setViewMode("items");
        setSelectedItemIndex(0);
      }
    } else if (viewMode === "items") {
      const feed = feeds[selectedFeedIndex];
      const itemCount = feed?.result?.feed?.items.length || 0;

      if (key.upArrow) {
        setSelectedItemIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedItemIndex((i) => Math.min(itemCount - 1, i + 1));
      } else if (key.return) {
        openArticle();
      }
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Calculate layout widths
  const leftPanelWidth = Math.max(45, Math.floor(termWidth * 0.5));
  const rightPanelWidth = termWidth - leftPanelWidth - 3;

  // Get total unread count
  const totalUnread = feeds.reduce(
    (sum, feed) =>
      sum +
      (feed.result?.feed?.items.filter((item) => !feed.readItems.has(item.id))
        .length || 0),
    0,
  );

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={CYBER_COLORS.neonMagenta}
      >
        <Box>
          <Text color={CYBER_COLORS.neonCyan} bold>
            {"// RSS FEEDS //"}
          </Text>
          {isRefreshing && (
            <Text color={CYBER_COLORS.neonGreen}>
              {" "}
              <Spinner type="dots" />
            </Text>
          )}
        </Box>
        <Box>
          <Text
            color={totalUnread > 0 ? CYBER_COLORS.neonGreen : CYBER_COLORS.dim}
            bold={totalUnread > 0}
          >
            {totalUnread} unread
          </Text>
          {lastUpdated && (
            <Text color={CYBER_COLORS.dim}>
              {" "}
              | {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1} marginY={1}>
          <Text color={CYBER_COLORS.neonRed}>Error: {error}</Text>
        </Box>
      )}

      {/* Add feed input */}
      {showAddFeed && (
        <AddFeedInput
          value={addFeedValue}
          onChange={setAddFeedValue}
          onSubmit={() => addFeed(addFeedValue)}
          onCancel={() => {
            setShowAddFeed(false);
            setAddFeedValue("");
          }}
        />
      )}

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left panel - Feeds list */}
        <Box flexDirection="column" width={leftPanelWidth} paddingX={1}>
          {feeds.length === 0 ? (
            <Box flexDirection="column" marginTop={2}>
              <Text color={CYBER_COLORS.dim}>No feeds configured</Text>
              <Text color={CYBER_COLORS.neonCyan}>
                Press 'a' to add a feed URL
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {/* Feeds header */}
              <Box marginBottom={1}>
                <Text color={CYBER_COLORS.neonMagenta} bold>
                  {"[ FEEDS ]"}
                </Text>
                <Text color={CYBER_COLORS.dim}> ({feeds.length})</Text>
              </Box>

              {/* Feeds list */}
              {feeds.map((feed, idx) => (
                <Box key={feed.url} flexDirection="column">
                  <FeedSummaryRow
                    feed={feed}
                    isSelected={idx === selectedFeedIndex}
                    width={leftPanelWidth - 4}
                  />
                  {/* Show items if expanded */}
                  {feed.expanded &&
                    viewMode === "items" &&
                    idx === selectedFeedIndex && (
                      <FeedItemsList
                        feed={feed}
                        selectedItemIndex={selectedItemIndex}
                        maxItems={Math.max(5, contentHeight - feeds.length - 6)}
                        width={leftPanelWidth - 4}
                      />
                    )}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Right panel - Article preview */}
        <Box flexDirection="column" width={rightPanelWidth} marginLeft={1}>
          <Box marginBottom={1}>
            <Text color={CYBER_COLORS.neonMagenta} bold>
              {"[ ARTICLE PREVIEW ]"}
            </Text>
          </Box>
          <ArticlePreview
            item={viewMode === "items" ? getSelectedItem() : null}
            width={rightPanelWidth - 2}
            height={contentHeight - 3}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          {viewMode === "items"
            ? "up/down navigate | Enter/o open | m toggle read | M mark all read | Esc back | ? help | q quit"
            : "up/down navigate | Enter expand | a add | d remove | Tab switch | r refresh | ? help | q quit"}
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
            title="RSS FEEDS"
            bindings={RSS_BINDINGS}
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
            currentCanvas="rss"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
