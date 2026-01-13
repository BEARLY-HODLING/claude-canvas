// Pomodoro Timer Canvas - Type Definitions

export interface PomodoroConfig {
  mode?: "pomodoro";
  title?: string;
  workDuration?: number; // Minutes (default: 25)
  shortBreakDuration?: number; // Minutes (default: 5)
  longBreakDuration?: number; // Minutes (default: 15)
  pomodorosUntilLongBreak?: number; // Default: 4
  soundEnabled?: boolean; // Play bell on timer completion
  autoStart?: boolean; // Auto-start next session
}

export interface PomodoroResult {
  action: "close" | "complete";
  stats?: PomodoroStats;
}

export interface PomodoroStats {
  completedPomodoros: number;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionsToday: number;
}

export type SessionType = "WORK" | "SHORT_BREAK" | "LONG_BREAK";

export interface SessionState {
  type: SessionType;
  duration: number; // Total seconds for this session
  remaining: number; // Seconds remaining
  isRunning: boolean;
  pomodoroCount: number; // Completed pomodoros in current cycle
  totalPomodoros: number; // Total pomodoros completed today
}

// Shared cyberpunk color palette
export const POMODORO_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
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
};
