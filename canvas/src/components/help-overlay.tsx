// Help Overlay Component - Unified keybindings display

import React from "react";
import { Box, Text } from "ink";

export interface KeyBinding {
  key: string;
  description: string;
  category?: "navigation" | "action" | "view" | "other";
}

interface Props {
  title: string;
  bindings: KeyBinding[];
  visible: boolean;
  width?: number;
}

// Shared color palette
const COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  dim: "gray",
} as const;

// Common keybindings shared across all canvases
export const COMMON_BINDINGS: KeyBinding[] = [
  { key: "q/Esc", description: "Quit", category: "other" },
  { key: "r", description: "Refresh", category: "action" },
  { key: "?", description: "Toggle help", category: "other" },
];

export function HelpOverlay({ title, bindings, visible, width = 50 }: Props) {
  if (!visible) return null;

  // Group bindings by category
  const navigation = bindings.filter((b) => b.category === "navigation");
  const actions = bindings.filter((b) => b.category === "action");
  const view = bindings.filter((b) => b.category === "view");
  const other = bindings.filter((b) => !b.category || b.category === "other");

  const renderBindings = (items: KeyBinding[], label: string) => {
    if (items.length === 0) return null;

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color={COLORS.neonMagenta} bold>
          {label}
        </Text>
        {items.map((binding) => (
          <Box key={binding.key}>
            <Text color={COLORS.neonCyan}>{binding.key.padEnd(12)}</Text>
            <Text color={COLORS.dim}>{binding.description}</Text>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={COLORS.neonMagenta}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color={COLORS.neonCyan} bold>
          {"[ "}
          {title}
          {" - KEYBINDINGS ]"}
        </Text>
      </Box>

      {/* Grouped bindings */}
      {renderBindings(navigation, "Navigation")}
      {renderBindings(actions, "Actions")}
      {renderBindings(view, "View")}
      {renderBindings(other, "Other")}

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={COLORS.dim}>Press ? to close</Text>
      </Box>
    </Box>
  );
}

// Keybinding presets for each canvas type
export const FLIGHT_TRACKER_BINDINGS: KeyBinding[] = [
  { key: "↑/↓", description: "Navigate flight list", category: "navigation" },
  { key: "Enter", description: "Select flight", category: "action" },
  { key: "/", description: "Search flights", category: "action" },
  { key: "w", description: "Toggle watch", category: "action" },
  { key: "W", description: "Show watchlist only", category: "view" },
  { key: "+/-", description: "Adjust refresh interval", category: "view" },
  ...COMMON_BINDINGS,
];

export const WEATHER_BINDINGS: KeyBinding[] = [
  { key: "↑/↓", description: "Navigate locations", category: "navigation" },
  { key: "Enter", description: "Select location", category: "action" },
  { key: "/", description: "Search city", category: "action" },
  { key: "a", description: "Add to watchlist", category: "action" },
  { key: "d", description: "Remove from watchlist", category: "action" },
  { key: "u", description: "Toggle °C/°F", category: "view" },
  ...COMMON_BINDINGS,
];

export const SYSTEM_BINDINGS: KeyBinding[] = [
  { key: "space", description: "Pause/resume", category: "action" },
  { key: "t", description: "Toggle process list", category: "view" },
  { key: "+/-", description: "Adjust refresh interval", category: "view" },
  ...COMMON_BINDINGS,
];

export const CALENDAR_BINDINGS: KeyBinding[] = [
  { key: "↑/↓/←/→", description: "Navigate dates", category: "navigation" },
  { key: "Enter", description: "Select date/time", category: "action" },
  { key: "t", description: "Go to today", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const POMODORO_BINDINGS: KeyBinding[] = [
  { key: "Space", description: "Start/pause timer", category: "action" },
  { key: "r", description: "Reset current timer", category: "action" },
  { key: "s", description: "Skip to next session", category: "action" },
  { key: "+/-", description: "Adjust work duration (5 min)", category: "view" },
  { key: "m", description: "Toggle sound", category: "view" },
  ...COMMON_BINDINGS,
];

export const NOTES_BINDINGS: KeyBinding[] = [
  { key: "n", description: "New note", category: "action" },
  { key: "Enter", description: "Edit selected note", category: "action" },
  { key: "d", description: "Delete note (confirm)", category: "action" },
  { key: "↑/↓", description: "Navigate notes", category: "navigation" },
  { key: "/", description: "Search notes", category: "action" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const CRYPTO_BINDINGS: KeyBinding[] = [
  { key: "↑/↓", description: "Navigate coin list", category: "navigation" },
  { key: "a", description: "Add coin to watchlist", category: "action" },
  { key: "d", description: "Remove selected coin", category: "action" },
  { key: "/", description: "Search coins", category: "action" },
  { key: "Enter", description: "View coin details", category: "action" },
  { key: "+/-", description: "Adjust refresh interval", category: "view" },
  { key: "s", description: "Toggle sparkline", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const LOGS_BINDINGS: KeyBinding[] = [
  { key: "o", description: "Open file (path input)", category: "action" },
  { key: "/", description: "Filter by pattern", category: "action" },
  {
    key: "f",
    description: "Toggle follow mode (auto-scroll)",
    category: "view",
  },
  { key: "c", description: "Clear screen", category: "action" },
  {
    key: "Up/Down",
    description: "Scroll line by line",
    category: "navigation",
  },
  {
    key: "PgUp/PgDn",
    description: "Scroll page by page",
    category: "navigation",
  },
  { key: "g", description: "Go to top", category: "navigation" },
  { key: "G", description: "Go to bottom", category: "navigation" },
  { key: "l", description: "Toggle line numbers", category: "view" },
  { key: "t", description: "Toggle timestamps", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const RSS_BINDINGS: KeyBinding[] = [
  {
    key: "Up/Down",
    description: "Navigate feeds/items",
    category: "navigation",
  },
  { key: "Enter", description: "Expand/collapse or open", category: "action" },
  { key: "a", description: "Add feed URL", category: "action" },
  { key: "d", description: "Remove feed", category: "action" },
  { key: "o", description: "Open article in browser", category: "action" },
  { key: "m", description: "Mark as read/unread", category: "action" },
  { key: "M", description: "Mark all as read", category: "action" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const CLIPBOARD_BINDINGS: KeyBinding[] = [
  {
    key: "Up/Down",
    description: "Navigate clipboard history",
    category: "navigation",
  },
  {
    key: "Enter",
    description: "Copy selected to clipboard",
    category: "action",
  },
  { key: "d", description: "Delete selected entry", category: "action" },
  { key: "c", description: "Clear all history", category: "action" },
  { key: "/", description: "Search/filter entries", category: "action" },
  { key: "p", description: "Toggle preview panel", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const MUSIC_BINDINGS: KeyBinding[] = [
  { key: "Space", description: "Play/Pause", category: "action" },
  { key: "n/Right", description: "Next track", category: "action" },
  { key: "p/Left", description: "Previous track", category: "action" },
  { key: "+/Up", description: "Volume up", category: "action" },
  { key: "-/Down", description: "Volume down", category: "action" },
  { key: "s", description: "Toggle shuffle", category: "action" },
  { key: "r", description: "Toggle repeat", category: "action" },
  { key: "t", description: "Switch player", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  { key: "q/Esc", description: "Quit", category: "other" },
  { key: "?", description: "Toggle help", category: "other" },
];

export const TIMER_BINDINGS: KeyBinding[] = [
  { key: "Space", description: "Start/stop timer", category: "action" },
  { key: "r", description: "Reset timer", category: "action" },
  { key: "l", description: "Record lap (stopwatch)", category: "action" },
  { key: "m", description: "Switch mode", category: "view" },
  { key: "+/-", description: "Adjust countdown duration", category: "view" },
  { key: "s", description: "Toggle sound", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const BOOKMARKS_BINDINGS: KeyBinding[] = [
  { key: "a", description: "Add new bookmark", category: "action" },
  { key: "e", description: "Edit selected bookmark", category: "action" },
  { key: "d", description: "Delete bookmark", category: "action" },
  { key: "t", description: "Add tag to bookmark", category: "action" },
  { key: "Enter", description: "Open in browser", category: "action" },
  { key: "/", description: "Search bookmarks", category: "action" },
  { key: "Up/Down", description: "Navigate bookmarks", category: "navigation" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const COLORS_BINDINGS: KeyBinding[] = [
  {
    key: "Enter/c",
    description: "Copy color to clipboard",
    category: "action",
  },
  { key: "f", description: "Cycle format (hex/rgb/hsl)", category: "view" },
  { key: "#/i", description: "Enter hex value", category: "action" },
  { key: "Up/Down", description: "Adjust brightness", category: "navigation" },
  { key: "Left/Right", description: "Adjust hue", category: "navigation" },
  { key: "s/S", description: "Adjust saturation -/+", category: "action" },
  { key: "p", description: "Toggle preset palette", category: "view" },
  { key: "1-9", description: "Select from palette", category: "action" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

export const KANBAN_BINDINGS: KeyBinding[] = [
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

export const HABITS_BINDINGS: KeyBinding[] = [
  { key: "n", description: "New habit", category: "action" },
  {
    key: "Space/Enter",
    description: "Toggle today's completion",
    category: "action",
  },
  { key: "e", description: "Edit habit", category: "action" },
  { key: "d", description: "Delete habit", category: "action" },
  { key: "Up/Down", description: "Navigate habits", category: "navigation" },
  { key: "Left/Right", description: "Navigate weeks", category: "navigation" },
  { key: "t", description: "Go to current week", category: "navigation" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];
