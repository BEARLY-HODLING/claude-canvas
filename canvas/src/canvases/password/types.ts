// Password Canvas - Type Definitions

export interface PasswordConfig {
  mode?: "password";
  title?: string;
  defaultLength?: number;
  defaultMode?: "password" | "passphrase";
}

export interface PasswordResult {
  action: "close" | "copy" | "generate";
  lastPassword?: string;
  historyCount?: number;
}

// Character set options
export interface CharacterOptions {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

// Passphrase options
export interface PassphraseConfig {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

// View modes
export type ViewMode = "generator" | "history" | "settings";

// Generation mode
export type GenerationMode = "password" | "passphrase";

// Color palette
export const PASSWORD_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "green",
  secondary: "magenta",
  warning: "yellow",
  result: "greenBright",
  error: "red",
  weak: "red",
  fair: "yellow",
  good: "blue",
  strong: "green",
  excellent: "cyan",
  muted: "gray",
  bg: "black",
} as const;

// Option labels for UI
export const CHAR_SET_LABELS = {
  uppercase: "ABC",
  lowercase: "abc",
  numbers: "123",
  symbols: "!@#",
  excludeSimilar: "0Ol1I",
} as const;

// Length presets
export const LENGTH_PRESETS = [
  { label: "Short", length: 8, description: "Basic (8 chars)" },
  { label: "Medium", length: 12, description: "Standard (12 chars)" },
  { label: "Long", length: 16, description: "Strong (16 chars)" },
  { label: "Max", length: 24, description: "Maximum (24 chars)" },
] as const;

// Word count presets for passphrases
export const WORD_COUNT_PRESETS = [
  { label: "3 words", count: 3, description: "Simple" },
  { label: "4 words", count: 4, description: "Standard" },
  { label: "5 words", count: 5, description: "Strong" },
  { label: "6 words", count: 6, description: "Maximum" },
] as const;

// Separator options for passphrases
export const SEPARATOR_OPTIONS = [
  { label: "-", value: "-" },
  { label: "_", value: "_" },
  { label: ".", value: "." },
  { label: " ", value: " " },
  { label: "/", value: "/" },
] as const;
