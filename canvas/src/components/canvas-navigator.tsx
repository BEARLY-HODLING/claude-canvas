// Canvas Navigator Component - Switch between canvas types

import React from "react";
import { Box, Text } from "ink";

export interface CanvasOption {
  key: string; // Shortcut key (1-9)
  name: string;
  kind: string; // Canvas kind for spawning
  icon: string;
  description: string;
}

interface Props {
  visible: boolean;
  currentCanvas: string;
  onSelect: (canvas: CanvasOption) => void;
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

// Available canvases
export const CANVAS_OPTIONS: CanvasOption[] = [
  {
    key: "1",
    name: "Dashboard",
    kind: "dashboard",
    icon: "📊",
    description: "Unified view with all widgets",
  },
  {
    key: "2",
    name: "Calendar",
    kind: "calendar",
    icon: "📅",
    description: "Date and time picker",
  },
  {
    key: "3",
    name: "Flight Tracker",
    kind: "tracker",
    icon: "✈️",
    description: "Real-time flight tracking",
  },
  {
    key: "4",
    name: "Weather",
    kind: "weather",
    icon: "🌤",
    description: "Weather conditions & forecast",
  },
  {
    key: "5",
    name: "System",
    kind: "system",
    icon: "💻",
    description: "CPU, memory, processes",
  },
  {
    key: "6",
    name: "Document",
    kind: "document",
    icon: "📄",
    description: "Document viewer/editor",
  },
  {
    key: "7",
    name: "Pomodoro",
    kind: "pomodoro",
    icon: "🍅",
    description: "Focus timer with work/break cycles",
  },
  {
    key: "8",
    name: "Notes",
    kind: "notes",
    icon: "📝",
    description: "Quick notes scratchpad",
  },
  {
    key: "9",
    name: "Crypto",
    kind: "crypto",
    icon: "\u20bf",
    description: "Real-time crypto prices",
  },
  {
    key: "0",
    name: "GitHub",
    kind: "github",
    icon: "\u2b24",
    description: "PRs, issues & repo stats",
  },
  {
    key: "n",
    name: "Network",
    kind: "network",
    icon: "\uD83C\uDF10",
    description: "Ping monitor & connectivity",
  },
  {
    key: "l",
    name: "Logs",
    kind: "logs",
    icon: "\uD83D\uDCDC",
    description: "Real-time log file viewer",
  },
  {
    key: "x",
    name: "Process",
    kind: "process",
    icon: "\u2699",
    description: "htop-like process manager",
  },
  {
    key: "d",
    name: "Database",
    kind: "database",
    icon: "\uD83D\uDDC3",
    description: "SQLite database viewer",
  },
  {
    key: "r",
    name: "RSS",
    kind: "rss",
    icon: "\uD83D\uDCF0",
    description: "News feed reader",
  },
  {
    key: "a",
    name: "AI Chat",
    kind: "chat",
    icon: "\uD83D\uDCAC",
    description: "Chat with AI assistant",
  },
  {
    key: "b",
    name: "Clipboard",
    kind: "clipboard",
    icon: "\uD83D\uDCCB",
    description: "Clipboard history manager",
  },
  {
    key: "m",
    name: "Music",
    kind: "music",
    icon: "\uD83C\uDFB5",
    description: "Music player control",
  },
  {
    key: "f",
    name: "Files",
    kind: "files",
    icon: "\uD83D\uDCC2",
    description: "File browser with preview",
  },
  {
    key: "t",
    name: "Timer",
    kind: "timer",
    icon: "⏱",
    description: "Stopwatch & countdown timer",
  },
  {
    key: "k",
    name: "Bookmarks",
    kind: "bookmarks",
    icon: "\uD83D\uDD16",
    description: "URL bookmark manager",
  },
  {
    key: "c",
    name: "Colors",
    kind: "colors",
    icon: "\uD83C\uDFA8",
    description: "Color picker with conversion",
  },
  {
    key: "=",
    name: "Calculator",
    kind: "calculator",
    icon: "\uD83E\uDDEE",
    description: "Calculator with history",
  },
  {
    key: "h",
    name: "Habits",
    kind: "habits",
    icon: "\u2705",
    description: "Habit tracking with streaks",
  },
];

export function CanvasNavigator({
  visible,
  currentCanvas,
  onSelect,
  width = 50,
}: Props) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={COLORS.neonCyan}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color={COLORS.neonCyan} bold>
          {"[ CANVAS NAVIGATOR ]"}
        </Text>
      </Box>

      {/* Canvas options */}
      {CANVAS_OPTIONS.map((canvas) => {
        const isCurrent = canvas.kind === currentCanvas;

        return (
          <Box key={canvas.key} marginBottom={1}>
            <Text color={COLORS.neonMagenta} bold>
              {canvas.key}
            </Text>
            <Text color={COLORS.dim}>{" │ "}</Text>
            <Text>{canvas.icon} </Text>
            <Text
              color={isCurrent ? COLORS.neonGreen : "white"}
              bold={isCurrent}
            >
              {canvas.name}
            </Text>
            {isCurrent && <Text color={COLORS.neonGreen}> ●</Text>}
            <Text color={COLORS.dim}> - {canvas.description}</Text>
          </Box>
        );
      })}

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={COLORS.dim}>
          Press 1-{CANVAS_OPTIONS.length} to switch • Tab or Esc to close
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Hook for canvas navigation keybindings
 * Returns: { showNav, setShowNav, handleNavInput }
 */
export function useCanvasNavigation(
  currentCanvas: string,
  onNavigate: (canvas: CanvasOption) => void,
) {
  const [showNav, setShowNav] = React.useState(false);

  const handleNavInput = React.useCallback(
    (input: string, key: { tab?: boolean; escape?: boolean }) => {
      // Tab toggles navigator
      if (key.tab) {
        setShowNav((s) => !s);
        return true;
      }

      // When nav is visible, handle selection
      if (showNav) {
        if (key.escape) {
          setShowNav(false);
          return true;
        }

        // Number keys select canvas
        const canvas = CANVAS_OPTIONS.find((c) => c.key === input);
        if (canvas) {
          onNavigate(canvas);
          setShowNav(false);
          return true;
        }
      }

      return false;
    },
    [showNav, onNavigate],
  );

  return { showNav, setShowNav, handleNavInput };
}
