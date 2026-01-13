// Timer Service - Stopwatch and countdown timer functionality

export interface Lap {
  index: number;
  elapsed: number; // Total elapsed time at lap
  split: number; // Time since last lap
  timestamp: Date;
}

export type TimerMode = "stopwatch" | "countdown";

export interface TimerState {
  mode: TimerMode;
  running: boolean;
  elapsed: number; // Milliseconds elapsed
  duration: number; // For countdown mode - target duration in ms
  laps: Lap[];
  startTime: number | null; // Performance timestamp when started
  pausedAt: number; // Elapsed time when paused
}

/**
 * Format time as HH:MM:SS.ms
 */
export function formatTime(ms: number, showMs = true): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10); // Show centiseconds

  if (hours > 0) {
    if (showMs) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
    }
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  if (showMs) {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format lap time for display
 */
export function formatLapTime(lap: Lap): { total: string; split: string } {
  return {
    total: formatTime(lap.elapsed),
    split: formatTime(lap.split),
  };
}

/**
 * Create initial timer state
 */
export function createTimerState(
  mode: TimerMode = "stopwatch",
  durationMinutes = 5,
): TimerState {
  return {
    mode,
    running: false,
    elapsed: 0,
    duration: durationMinutes * 60 * 1000, // Convert to ms
    laps: [],
    startTime: null,
    pausedAt: 0,
  };
}

/**
 * Timer class for managing stopwatch/countdown functionality
 */
export class Timer {
  private state: TimerState;
  private onUpdate: (state: TimerState) => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    mode: TimerMode = "stopwatch",
    durationMinutes = 5,
    onUpdate?: (state: TimerState) => void,
  ) {
    this.state = createTimerState(mode, durationMinutes);
    this.onUpdate = onUpdate || (() => {});
  }

  getState(): TimerState {
    return { ...this.state };
  }

  start(): void {
    if (this.state.running) return;

    this.state.running = true;
    this.state.startTime = performance.now();

    // Update every 10ms for smooth centisecond display
    this.intervalId = setInterval(() => {
      if (this.state.running && this.state.startTime !== null) {
        const now = performance.now();
        const delta = now - this.state.startTime;
        this.state.elapsed = this.state.pausedAt + delta;

        // Check for countdown completion
        if (
          this.state.mode === "countdown" &&
          this.state.elapsed >= this.state.duration
        ) {
          this.state.elapsed = this.state.duration;
          this.stop();
        }

        this.onUpdate(this.getState());
      }
    }, 10);

    this.onUpdate(this.getState());
  }

  stop(): void {
    if (!this.state.running) return;

    this.state.running = false;
    this.state.pausedAt = this.state.elapsed;
    this.state.startTime = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.onUpdate(this.getState());
  }

  toggle(): void {
    if (this.state.running) {
      this.stop();
    } else {
      this.start();
    }
  }

  reset(): void {
    this.stop();
    this.state.elapsed = 0;
    this.state.pausedAt = 0;
    this.state.laps = [];
    this.onUpdate(this.getState());
  }

  lap(): Lap | null {
    if (this.state.mode !== "stopwatch") return null;

    const lastLap = this.state.laps[this.state.laps.length - 1];
    const previousElapsed = lastLap?.elapsed || 0;
    const split = this.state.elapsed - previousElapsed;

    const newLap: Lap = {
      index: this.state.laps.length + 1,
      elapsed: this.state.elapsed,
      split,
      timestamp: new Date(),
    };

    this.state.laps.push(newLap);
    this.onUpdate(this.getState());
    return newLap;
  }

  setMode(mode: TimerMode): void {
    this.reset();
    this.state.mode = mode;
    this.onUpdate(this.getState());
  }

  setDuration(minutes: number): void {
    this.state.duration = minutes * 60 * 1000;
    if (!this.state.running) {
      this.onUpdate(this.getState());
    }
  }

  /**
   * Get remaining time for countdown mode
   */
  getRemaining(): number {
    if (this.state.mode === "countdown") {
      return Math.max(0, this.state.duration - this.state.elapsed);
    }
    return 0;
  }

  /**
   * Check if countdown is complete
   */
  isComplete(): boolean {
    return (
      this.state.mode === "countdown" &&
      this.state.elapsed >= this.state.duration
    );
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
