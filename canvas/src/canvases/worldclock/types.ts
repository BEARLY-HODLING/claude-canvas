// World Clock Canvas - Type Definitions

import type { CityTimezone } from "../../services/worldclock";

/**
 * World Clock canvas configuration
 */
export interface WorldClockConfig {
  /** Initial cities to display (IDs from preset list) */
  cities?: string[];
  /** Display time in 24-hour format (default: true) */
  use24Hour?: boolean;
  /** Show seconds in time display (default: true) */
  showSeconds?: boolean;
  /** Show date for each timezone (default: true) */
  showDate?: boolean;
  /** Show DST indicator (default: true) */
  showDST?: boolean;
  /** Show offset from local time (default: true) */
  showOffset?: boolean;
  /** Show simple analog clock (default: false) */
  showAnalog?: boolean;
  /** Theme name (default: 'cyberpunk') */
  theme?: string;
  /** Refresh interval in milliseconds (default: 1000) */
  refreshInterval?: number;
}

/**
 * Result returned when canvas closes
 */
export interface WorldClockResult {
  action: "close" | "select";
  selectedCity?: CityTimezone;
  cities?: string[];
}

/**
 * Clock display mode
 */
export type ClockDisplayMode = "compact" | "detailed" | "analog";

/**
 * UI state for the world clock
 */
export interface WorldClockState {
  cities: CityTimezone[];
  selectedIndex: number;
  searchMode: boolean;
  searchQuery: string;
  searchResults: CityTimezone[];
  use24Hour: boolean;
  showSeconds: boolean;
  showDate: boolean;
  showDST: boolean;
  showOffset: boolean;
  showAnalog: boolean;
  displayMode: ClockDisplayMode;
}

/**
 * Color palette for world clock
 */
export const WORLDCLOCK_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  neonBlue: "blue",
  dim: "gray",
  bg: "black",
} as const;

/**
 * ASCII art digits for large clock display (3 lines tall)
 */
export const CLOCK_DIGITS: Record<string, string[]> = {
  "0": ["###", "# #", "###"],
  "1": [" # ", " # ", " # "],
  "2": ["###", " ##", "## "],
  "3": ["###", " ##", "###"],
  "4": ["# #", "###", "  #"],
  "5": ["###", "## ", "###"],
  "6": ["###", "## ", "###"],
  "7": ["###", "  #", "  #"],
  "8": ["###", "###", "###"],
  "9": ["###", "###", "  #"],
  ":": [" ", "#", " "],
  " ": [" ", " ", " "],
};

/**
 * Default cities to show when no config provided
 */
export const DEFAULT_CITIES = ["nyc", "lon", "tok", "syd"];

/**
 * Maximum number of clocks that can be displayed
 */
export const MAX_DISPLAYED_CLOCKS = 8;

/**
 * Period of day info
 */
export interface DayPeriod {
  name: "morning" | "day" | "evening" | "night";
  icon: string;
  color: string;
}

/**
 * Get day period from hour
 */
export function getDayPeriod(hour: number): DayPeriod {
  if (hour >= 6 && hour < 12) {
    return { name: "morning", icon: "[sun-rise]", color: "yellow" };
  }
  if (hour >= 12 && hour < 18) {
    return { name: "day", icon: "[sun]", color: "yellow" };
  }
  if (hour >= 18 && hour < 21) {
    return { name: "evening", icon: "[sun-set]", color: "red" };
  }
  return { name: "night", icon: "[moon]", color: "blue" };
}
