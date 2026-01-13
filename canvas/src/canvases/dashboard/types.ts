// Dashboard Canvas - Type Definitions

import type { GeoLocation } from "../../services/weather";

export interface DashboardConfig {
  mode?: "dashboard";
  title?: string;
  location?: GeoLocation; // Weather location
  tempUnit?: "C" | "F"; // Temperature unit
  refreshInterval?: number; // Seconds (default: 30)
  showWeather?: boolean; // Show weather widget (default: true)
  showSystem?: boolean; // Show system widget (default: true)
  showCalendar?: boolean; // Show calendar widget (default: true)
  showClock?: boolean; // Show clock widget (default: true)
  theme?: string; // Theme name (default: 'cyberpunk')
  calendarEvents?: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    color?: string;
  }>;
}

export interface DashboardResult {
  action: "close" | "navigate";
  canvas?: string;
}

// Shared cyberpunk color palette
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;
