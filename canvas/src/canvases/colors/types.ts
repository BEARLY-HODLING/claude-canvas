// Color Picker Canvas - Type Definitions

import type { Color } from "../../services/colors";

export type ColorFormat = "hex" | "rgb" | "hsl";

/**
 * Color Picker Canvas Configuration
 */
export interface ColorsConfig {
  mode?: "colors";
  title?: string;
  format?: ColorFormat; // Default format for display/copy
  initialColor?: string; // Starting color (hex)
  recentColors?: string[]; // Recent colors history (hex)
  maxRecent?: number; // Max recent colors to store (default: 12)
  showPalette?: boolean; // Show preset color palette
}

/**
 * Color Picker Canvas Result
 */
export interface ColorsResult {
  action: "select" | "copy" | "close" | "navigate";
  color?: Color;
  format?: ColorFormat;
  canvas?: string;
}

// Shared cyberpunk color palette for theming
export const COLORS_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
  accent: "cyan",
  primary: "white",
  secondary: "yellow",
  muted: "gray",
} as const;

// Re-export Color type for convenience
export type { Color };
