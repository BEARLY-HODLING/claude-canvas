// Unit Converter Canvas - Type Definitions

import type { UnitCategory } from "../../services/units";

export interface UnitsConfig {
  mode?: "units";
  title?: string;
  defaultCategory?: UnitCategory;
  defaultFromUnit?: string;
  defaultToUnit?: string;
  defaultValue?: number;
  precision?: number; // Decimal precision (default: 6)
}

export interface UnitsResult {
  action: "close" | "convert";
  lastFromValue?: number;
  lastFromUnit?: string;
  lastToValue?: number;
  lastToUnit?: string;
  historyCount?: number;
}

// Unit converter state
export interface UnitsState {
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
  inputValue: string;
  result: string;
  error: string | null;
}

// View modes
export type ViewMode = "converter" | "history" | "presets";

// Unit converter color palette
export const UNITS_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "green",
  secondary: "magenta",
  category: "yellow",
  unit: "white",
  result: "greenBright",
  error: "red",
  swap: "magenta",
  muted: "gray",
  bg: "black",
} as const;

// Category shortcut keys (1-6)
export const CATEGORY_KEYS: Record<string, UnitCategory> = {
  "1": "length",
  "2": "weight",
  "3": "temperature",
  "4": "volume",
  "5": "time",
  "6": "data",
};
