// Weather Canvas - Type Definitions

import type { GeoLocation, WeatherData } from "../../services/weather";

export interface WeatherConfig {
  mode?: "weather";
  title?: string;
  location?: GeoLocation; // Pre-set location
  searchQuery?: string; // Initial city search
  tempUnit?: "C" | "F"; // Temperature unit
  refreshInterval?: number; // Seconds (default: 300 = 5 min)
  watchlist?: GeoLocation[]; // Saved locations
}

export interface WeatherResult {
  selectedLocation: GeoLocation;
  action: "view" | "add" | "remove" | "close";
}

// Cyberpunk color palette (shared with flight tracker)
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;
