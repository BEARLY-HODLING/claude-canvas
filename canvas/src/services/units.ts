// Unit Conversion Service - Conversion formulas and utilities

export type UnitCategory =
  | "length"
  | "weight"
  | "temperature"
  | "volume"
  | "time"
  | "data";

export interface UnitDefinition {
  symbol: string;
  name: string;
  category: UnitCategory;
  // Conversion factor to base unit (or special handling for temperature)
  toBase: number | ((value: number) => number);
  fromBase: number | ((value: number) => number);
}

// Base units by category:
// - length: meter (m)
// - weight: kilogram (kg)
// - temperature: Celsius (C) - special handling
// - volume: liter (L)
// - time: second (s)
// - data: byte (B)

export const UNITS: Record<string, UnitDefinition> = {
  // Length (base: meter)
  m: { symbol: "m", name: "Meter", category: "length", toBase: 1, fromBase: 1 },
  km: {
    symbol: "km",
    name: "Kilometer",
    category: "length",
    toBase: 1000,
    fromBase: 0.001,
  },
  cm: {
    symbol: "cm",
    name: "Centimeter",
    category: "length",
    toBase: 0.01,
    fromBase: 100,
  },
  mm: {
    symbol: "mm",
    name: "Millimeter",
    category: "length",
    toBase: 0.001,
    fromBase: 1000,
  },
  in: {
    symbol: "in",
    name: "Inch",
    category: "length",
    toBase: 0.0254,
    fromBase: 39.3701,
  },
  ft: {
    symbol: "ft",
    name: "Foot",
    category: "length",
    toBase: 0.3048,
    fromBase: 3.28084,
  },
  yd: {
    symbol: "yd",
    name: "Yard",
    category: "length",
    toBase: 0.9144,
    fromBase: 1.09361,
  },
  mi: {
    symbol: "mi",
    name: "Mile",
    category: "length",
    toBase: 1609.344,
    fromBase: 0.000621371,
  },

  // Weight (base: kilogram)
  kg: {
    symbol: "kg",
    name: "Kilogram",
    category: "weight",
    toBase: 1,
    fromBase: 1,
  },
  g: {
    symbol: "g",
    name: "Gram",
    category: "weight",
    toBase: 0.001,
    fromBase: 1000,
  },
  mg: {
    symbol: "mg",
    name: "Milligram",
    category: "weight",
    toBase: 0.000001,
    fromBase: 1000000,
  },
  lb: {
    symbol: "lb",
    name: "Pound",
    category: "weight",
    toBase: 0.453592,
    fromBase: 2.20462,
  },
  oz: {
    symbol: "oz",
    name: "Ounce",
    category: "weight",
    toBase: 0.0283495,
    fromBase: 35.274,
  },

  // Temperature (base: Celsius, special handling)
  C: {
    symbol: "C",
    name: "Celsius",
    category: "temperature",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  F: {
    symbol: "F",
    name: "Fahrenheit",
    category: "temperature",
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  K: {
    symbol: "K",
    name: "Kelvin",
    category: "temperature",
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },

  // Volume (base: liter)
  L: {
    symbol: "L",
    name: "Liter",
    category: "volume",
    toBase: 1,
    fromBase: 1,
  },
  mL: {
    symbol: "mL",
    name: "Milliliter",
    category: "volume",
    toBase: 0.001,
    fromBase: 1000,
  },
  gal: {
    symbol: "gal",
    name: "Gallon",
    category: "volume",
    toBase: 3.78541,
    fromBase: 0.264172,
  },
  qt: {
    symbol: "qt",
    name: "Quart",
    category: "volume",
    toBase: 0.946353,
    fromBase: 1.05669,
  },
  pt: {
    symbol: "pt",
    name: "Pint",
    category: "volume",
    toBase: 0.473176,
    fromBase: 2.11338,
  },
  cup: {
    symbol: "cup",
    name: "Cup",
    category: "volume",
    toBase: 0.236588,
    fromBase: 4.22675,
  },

  // Time (base: second)
  s: {
    symbol: "s",
    name: "Second",
    category: "time",
    toBase: 1,
    fromBase: 1,
  },
  min: {
    symbol: "min",
    name: "Minute",
    category: "time",
    toBase: 60,
    fromBase: 1 / 60,
  },
  hr: {
    symbol: "hr",
    name: "Hour",
    category: "time",
    toBase: 3600,
    fromBase: 1 / 3600,
  },
  day: {
    symbol: "day",
    name: "Day",
    category: "time",
    toBase: 86400,
    fromBase: 1 / 86400,
  },

  // Data (base: byte)
  B: { symbol: "B", name: "Byte", category: "data", toBase: 1, fromBase: 1 },
  KB: {
    symbol: "KB",
    name: "Kilobyte",
    category: "data",
    toBase: 1024,
    fromBase: 1 / 1024,
  },
  MB: {
    symbol: "MB",
    name: "Megabyte",
    category: "data",
    toBase: 1024 * 1024,
    fromBase: 1 / (1024 * 1024),
  },
  GB: {
    symbol: "GB",
    name: "Gigabyte",
    category: "data",
    toBase: 1024 * 1024 * 1024,
    fromBase: 1 / (1024 * 1024 * 1024),
  },
  TB: {
    symbol: "TB",
    name: "Terabyte",
    category: "data",
    toBase: 1024 * 1024 * 1024 * 1024,
    fromBase: 1 / (1024 * 1024 * 1024 * 1024),
  },
};

// Units grouped by category
export const UNITS_BY_CATEGORY: Record<UnitCategory, string[]> = {
  length: ["m", "km", "cm", "mm", "in", "ft", "yd", "mi"],
  weight: ["kg", "g", "mg", "lb", "oz"],
  temperature: ["C", "F", "K"],
  volume: ["L", "mL", "gal", "qt", "pt", "cup"],
  time: ["s", "min", "hr", "day"],
  data: ["B", "KB", "MB", "GB", "TB"],
};

// Category display names
export const CATEGORY_NAMES: Record<UnitCategory, string> = {
  length: "Length",
  weight: "Weight",
  temperature: "Temperature",
  volume: "Volume",
  time: "Time",
  data: "Data",
};

// Category icons
export const CATEGORY_ICONS: Record<UnitCategory, string> = {
  length: "->",
  weight: "kg",
  temperature: "C",
  volume: "mL",
  time: "hr",
  data: "MB",
};

/**
 * Convert a value from one unit to another
 */
export function convert(
  value: number,
  fromUnit: string,
  toUnit: string,
): number {
  const from = UNITS[fromUnit];
  const to = UNITS[toUnit];

  if (!from || !to) {
    throw new Error(`Unknown unit: ${!from ? fromUnit : toUnit}`);
  }

  if (from.category !== to.category) {
    throw new Error(
      `Cannot convert between different categories: ${from.category} and ${to.category}`,
    );
  }

  // Convert to base unit
  let baseValue: number;
  if (typeof from.toBase === "function") {
    baseValue = from.toBase(value);
  } else {
    baseValue = value * from.toBase;
  }

  // Convert from base unit to target
  let result: number;
  if (typeof to.fromBase === "function") {
    result = to.fromBase(baseValue);
  } else {
    result = baseValue * to.fromBase;
  }

  return result;
}

/**
 * Format a number with appropriate precision
 */
export function formatValue(value: number, precision: number = 6): string {
  if (!isFinite(value)) {
    return "Error";
  }

  // For very large or very small numbers, use scientific notation
  if (Math.abs(value) >= 1e9 || (Math.abs(value) < 1e-6 && value !== 0)) {
    return value.toExponential(precision);
  }

  // Round to avoid floating point errors
  const rounded =
    Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);

  // Format with appropriate decimal places
  if (Number.isInteger(rounded)) {
    return rounded.toLocaleString("en-US");
  }

  // Count significant decimal places
  const str = rounded.toString();
  const decimalIndex = str.indexOf(".");
  if (decimalIndex === -1) {
    return rounded.toLocaleString("en-US");
  }

  const decimals = Math.min(str.length - decimalIndex - 1, precision);
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Common conversion presets
 */
export interface ConversionPreset {
  name: string;
  fromUnit: string;
  toUnit: string;
  defaultValue: number;
}

export const COMMON_PRESETS: ConversionPreset[] = [
  {
    name: "Miles to Kilometers",
    fromUnit: "mi",
    toUnit: "km",
    defaultValue: 1,
  },
  {
    name: "Pounds to Kilograms",
    fromUnit: "lb",
    toUnit: "kg",
    defaultValue: 1,
  },
  {
    name: "Fahrenheit to Celsius",
    fromUnit: "F",
    toUnit: "C",
    defaultValue: 72,
  },
  { name: "Gallons to Liters", fromUnit: "gal", toUnit: "L", defaultValue: 1 },
  { name: "Hours to Minutes", fromUnit: "hr", toUnit: "min", defaultValue: 1 },
  {
    name: "Gigabytes to Megabytes",
    fromUnit: "GB",
    toUnit: "MB",
    defaultValue: 1,
  },
  {
    name: "Inches to Centimeters",
    fromUnit: "in",
    toUnit: "cm",
    defaultValue: 1,
  },
  { name: "Feet to Meters", fromUnit: "ft", toUnit: "m", defaultValue: 1 },
];

/**
 * Conversion history entry
 */
export interface ConversionEntry {
  id: string;
  fromValue: number;
  fromUnit: string;
  toValue: number;
  toUnit: string;
  timestamp: Date;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Conversion history manager
 */
export class ConversionHistory {
  private entries: ConversionEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  add(
    fromValue: number,
    fromUnit: string,
    toValue: number,
    toUnit: string,
  ): ConversionEntry {
    const entry: ConversionEntry = {
      id: generateId(),
      fromValue,
      fromUnit,
      toValue,
      toUnit,
      timestamp: new Date(),
    };

    this.entries.unshift(entry);

    // Trim to max size
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(0, this.maxSize);
    }

    return entry;
  }

  getAll(): ConversionEntry[] {
    return [...this.entries];
  }

  getRecent(count: number = 10): ConversionEntry[] {
    return this.entries.slice(0, count);
  }

  clear(): void {
    this.entries = [];
  }

  getLast(): ConversionEntry | null {
    return this.entries[0] || null;
  }
}

/**
 * Get all categories
 */
export function getCategories(): UnitCategory[] {
  return Object.keys(UNITS_BY_CATEGORY) as UnitCategory[];
}

/**
 * Get units for a category
 */
export function getUnitsForCategory(category: UnitCategory): UnitDefinition[] {
  const symbols = UNITS_BY_CATEGORY[category] || [];
  return symbols.map((s) => UNITS[s]!).filter(Boolean);
}

/**
 * Get the category for a unit
 */
export function getCategoryForUnit(unitSymbol: string): UnitCategory | null {
  const unit = UNITS[unitSymbol];
  return unit ? unit.category : null;
}

/**
 * Parse a numeric string, handling various formats
 */
export function parseValue(input: string): number | null {
  if (!input || input.trim() === "") {
    return null;
  }

  // Remove commas and whitespace
  const cleaned = input.replace(/,/g, "").trim();

  // Try parsing
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
