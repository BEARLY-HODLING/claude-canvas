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
    name: "Calendar",
    kind: "calendar",
    icon: "📅",
    description: "Date and time picker",
  },
  {
    key: "2",
    name: "Flight Tracker",
    kind: "tracker",
    icon: "✈️",
    description: "Real-time flight tracking",
  },
  {
    key: "3",
    name: "Weather",
    kind: "weather",
    icon: "🌤",
    description: "Weather conditions & forecast",
  },
  {
    key: "4",
    name: "System",
    kind: "system",
    icon: "💻",
    description: "CPU, memory, processes",
  },
  {
    key: "5",
    name: "Document",
    kind: "document",
    icon: "📄",
    description: "Document viewer/editor",
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
