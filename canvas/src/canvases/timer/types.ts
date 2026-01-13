// Timer Canvas - Type Definitions

export interface TimerConfig {
  mode?: "stopwatch" | "countdown";
  duration?: number; // Duration in minutes for countdown mode (default: 5)
  soundEnabled?: boolean; // Play bell on countdown completion
}

export interface TimerResult {
  action: "close" | "complete";
  elapsed?: number;
  laps?: number;
}

export interface TimerState {
  running: boolean;
  elapsed: number; // Milliseconds
  laps: LapTime[];
}

export interface LapTime {
  index: number;
  elapsed: number;
  split: number;
  timestamp: Date;
}

// Shared cyberpunk color palette
export const TIMER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  neonBlue: "blue",
  dim: "gray",
  bg: "black",
} as const;

// ASCII art digits for large timer display (5 lines tall, 4 chars wide each)
export const ASCII_DIGITS: Record<string, string[]> = {
  "0": [" ██ ", "█  █", "█  █", "█  █", " ██ "],
  "1": ["  █ ", " ██ ", "  █ ", "  █ ", " ███"],
  "2": ["███ ", "   █", " ██ ", "█   ", "████"],
  "3": ["███ ", "   █", " ██ ", "   █", "███ "],
  "4": ["█  █", "█  █", "████", "   █", "   █"],
  "5": ["████", "█   ", "███ ", "   █", "███ "],
  "6": [" ██ ", "█   ", "███ ", "█  █", " ██ "],
  "7": ["████", "   █", "  █ ", " █  ", " █  "],
  "8": [" ██ ", "█  █", " ██ ", "█  █", " ██ "],
  "9": [" ██ ", "█  █", " ███", "   █", " ██ "],
  ":": ["    ", " ██ ", "    ", " ██ ", "    "],
  ".": ["    ", "    ", "    ", "    ", " ██ "],
};
