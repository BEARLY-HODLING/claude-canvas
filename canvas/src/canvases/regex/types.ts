// Regex Canvas - Type Definitions

import type { RegexFlags, RegexMatch } from "../../services/regex";

export interface RegexConfig {
  mode?: "regex";
  title?: string;
  initialPattern?: string;
  initialText?: string;
  initialFlags?: string;
}

export interface RegexResult {
  action: "close" | "copy" | "apply";
  pattern?: string;
  flags?: string;
  matchCount?: number;
  data?: unknown;
}

// View modes
export type ViewMode = "test" | "presets" | "history" | "replace";

// Focus areas for input
export type FocusArea = "pattern" | "testText" | "replacement";

// Match display item
export interface MatchDisplay {
  match: RegexMatch;
  lineNumber: number;
  lineContent: string;
  highlightStart: number;
  highlightEnd: number;
}

// History entry
export interface HistoryEntry {
  id: string;
  pattern: string;
  flags: string;
  timestamp: Date;
}

// Regex canvas color palette
export const REGEX_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "green",
  secondary: "magenta",
  match: "greenBright",
  matchBg: "bgGreen",
  group: "yellow",
  groupBg: "bgYellow",
  error: "red",
  warning: "yellow",
  success: "green",
  muted: "gray",
  flag: "cyan",
  flagActive: "cyanBright",
  index: "blue",
  bg: "black",
} as const;

// Flag display info
export interface FlagInfo {
  key: string;
  flag: keyof RegexFlags;
  label: string;
  shortLabel: string;
  description: string;
}

export const FLAG_INFO: FlagInfo[] = [
  {
    key: "g",
    flag: "global",
    label: "Global",
    shortLabel: "g",
    description: "Find all matches",
  },
  {
    key: "i",
    flag: "ignoreCase",
    label: "Ignore Case",
    shortLabel: "i",
    description: "Case insensitive matching",
  },
  {
    key: "m",
    flag: "multiline",
    label: "Multiline",
    shortLabel: "m",
    description: "^ and $ match line boundaries",
  },
  {
    key: "s",
    flag: "dotAll",
    label: "Dot All",
    shortLabel: "s",
    description: ". matches newlines",
  },
  {
    key: "u",
    flag: "unicode",
    label: "Unicode",
    shortLabel: "u",
    description: "Unicode support",
  },
  {
    key: "y",
    flag: "sticky",
    label: "Sticky",
    shortLabel: "y",
    description: "Sticky search from lastIndex",
  },
];

// Preset categories for grouping
export const PRESET_CATEGORIES = [
  "Web",
  "Numbers",
  "Text",
  "DateTime",
  "Code",
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];
