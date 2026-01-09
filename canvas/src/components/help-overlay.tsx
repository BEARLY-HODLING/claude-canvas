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
