// Timer/Stopwatch Canvas - Stopwatch and countdown timer with lap functionality

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type TimerConfig,
  type TimerResult,
  TIMER_COLORS,
  ASCII_DIGITS,
} from "./timer/types";
import { HelpOverlay, TIMER_BINDINGS } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import { type Lap, formatTime, formatLapTime } from "../services/timer";

interface Props {
  id: string;
  config?: TimerConfig;
  socketPath?: string;
  scenario?: string;
}

type TimerMode = "stopwatch" | "countdown";

// Get ASCII digit safely
function getAsciiDigit(char: string, line: number): string {
  return ASCII_DIGITS[char]?.[line] ?? "    ";
}

// Render large ASCII timer (MM:SS.cc format)
function renderAsciiTime(
  ms: number,
  mode: TimerMode,
  duration: number,
): string[] {
  // For countdown, show remaining time
  const displayMs = mode === "countdown" ? Math.max(0, duration - ms) : ms;

  const totalSeconds = Math.floor(displayMs / 1000);
  const minutes = Math.floor(totalSeconds / 60) % 100; // Cap at 99 minutes for display
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((displayMs % 1000) / 10);

  const m1 = Math.floor(minutes / 10).toString();
  const m2 = (minutes % 10).toString();
  const s1 = Math.floor(seconds / 10).toString();
  const s2 = (seconds % 10).toString();
  const c1 = Math.floor(centiseconds / 10).toString();
  const c2 = (centiseconds % 10).toString();

  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    lines.push(
      `${getAsciiDigit(m1, i)} ${getAsciiDigit(m2, i)} ${getAsciiDigit(":", i)} ${getAsciiDigit(s1, i)} ${getAsciiDigit(s2, i)} ${getAsciiDigit(".", i)} ${getAsciiDigit(c1, i)} ${getAsciiDigit(c2, i)}`,
    );
  }
  return lines;
}

// Progress bar for countdown mode
function progressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// Timer display component
function TimerDisplay({
  elapsed,
  running,
  mode,
  duration,
  width,
}: {
  elapsed: number;
  running: boolean;
  mode: TimerMode;
  duration: number;
  width: number;
}) {
  const asciiLines = renderAsciiTime(elapsed, mode, duration);
  const isComplete = mode === "countdown" && elapsed >= duration;

  // Calculate progress for countdown
  const percent =
    mode === "countdown" ? Math.min(100, (elapsed / duration) * 100) : 0;
  const barWidth = Math.min(50, width - 10);

  // Get color based on state
  const getColor = () => {
    if (isComplete) return TIMER_COLORS.neonRed;
    if (mode === "countdown" && percent > 80) return TIMER_COLORS.neonYellow;
    if (running) return TIMER_COLORS.neonGreen;
    return TIMER_COLORS.neonCyan;
  };

  const timerColor = getColor();

  return (
    <Box flexDirection="column" alignItems="center" width={width}>
      {/* Mode header */}
      <Box marginBottom={1}>
        <Text color={TIMER_COLORS.neonMagenta} bold>
          {"[ "}
          {mode === "stopwatch" ? "⏱ STOPWATCH" : "⏳ COUNTDOWN"}
          {" ]"}
        </Text>
      </Box>

      {/* ASCII time display */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={running ? timerColor : TIMER_COLORS.dim}
        paddingX={2}
        paddingY={1}
      >
        {asciiLines.map((line, i) => (
          <Text key={i} color={timerColor}>
            {line}
          </Text>
        ))}
      </Box>

      {/* Progress bar for countdown */}
      {mode === "countdown" && (
        <Box marginTop={1}>
          <Text color={TIMER_COLORS.dim}>[</Text>
          <Text color={timerColor}>{progressBar(percent, barWidth)}</Text>
          <Text color={TIMER_COLORS.dim}>]</Text>
          <Text color={TIMER_COLORS.dim}> {Math.round(percent)}%</Text>
        </Box>
      )}

      {/* Status */}
      <Box marginTop={1}>
        {isComplete ? (
          <Text color={TIMER_COLORS.neonRed} bold>
            🔔 TIME'S UP!
          </Text>
        ) : running ? (
          <Text color={TIMER_COLORS.neonGreen}>● RUNNING</Text>
        ) : (
          <Text color={TIMER_COLORS.neonYellow}>⏸ PAUSED</Text>
        )}
      </Box>
    </Box>
  );
}

// Lap list component
function LapList({
  laps,
  width,
  maxVisible,
}: {
  laps: Lap[];
  width: number;
  maxVisible: number;
}) {
  // Show most recent laps first
  const visibleLaps = [...laps].reverse().slice(0, maxVisible);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={TIMER_COLORS.neonMagenta} bold>
          {"[ LAPS ]"}
        </Text>
        <Text color={TIMER_COLORS.dim}> ({laps.length} total)</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={TIMER_COLORS.dim}
        paddingX={1}
        height={Math.min(maxVisible + 2, 12)}
      >
        {visibleLaps.length > 0 ? (
          <>
            {/* Header */}
            <Box marginBottom={1}>
              <Text color={TIMER_COLORS.dim}>
                {"#".padEnd(4)}
                {"Split".padEnd(14)}
                {"Total"}
              </Text>
            </Box>

            {visibleLaps.map((lap) => {
              const { total, split } = formatLapTime(lap);
              // Find best and worst laps
              const isBest =
                laps.length > 1 &&
                lap.split === Math.min(...laps.map((l) => l.split));
              const isWorst =
                laps.length > 1 &&
                lap.split === Math.max(...laps.map((l) => l.split));

              return (
                <Box key={lap.index}>
                  <Text
                    color={
                      isBest
                        ? TIMER_COLORS.neonGreen
                        : isWorst
                          ? TIMER_COLORS.neonRed
                          : "white"
                    }
                  >
                    {lap.index.toString().padEnd(4)}
                  </Text>
                  <Text
                    color={
                      isBest
                        ? TIMER_COLORS.neonGreen
                        : isWorst
                          ? TIMER_COLORS.neonRed
                          : TIMER_COLORS.neonCyan
                    }
                  >
                    {split.padEnd(14)}
                  </Text>
                  <Text color={TIMER_COLORS.dim}>{total}</Text>
                </Box>
              );
            })}
          </>
        ) : (
          <Text color={TIMER_COLORS.dim}>Press 'l' to record laps</Text>
        )}
      </Box>
    </Box>
  );
}

// Settings panel component
function SettingsPanel({
  mode,
  duration,
  soundEnabled,
  width,
}: {
  mode: TimerMode;
  duration: number;
  soundEnabled: boolean;
  width: number;
}) {
  const durationMinutes = Math.round(duration / 60000);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={TIMER_COLORS.neonMagenta} bold>
          {"[ SETTINGS ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={TIMER_COLORS.dim}
        paddingX={1}
      >
        <Box>
          <Text color={TIMER_COLORS.dim}>Mode: </Text>
          <Text color={TIMER_COLORS.neonCyan}>
            {mode === "stopwatch" ? "Stopwatch ⏱" : "Countdown ⏳"}
          </Text>
        </Box>
        {mode === "countdown" && (
          <Box>
            <Text color={TIMER_COLORS.dim}>Duration: </Text>
            <Text color={TIMER_COLORS.neonYellow}>{durationMinutes} min</Text>
            <Text color={TIMER_COLORS.dim}> (+/- to adjust)</Text>
          </Box>
        )}
        <Box>
          <Text color={TIMER_COLORS.dim}>Sound: </Text>
          <Text
            color={soundEnabled ? TIMER_COLORS.neonGreen : TIMER_COLORS.dim}
          >
            {soundEnabled ? "ON" : "OFF"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function TimerCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "timer",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Timer state
  const [mode, setMode] = useState<TimerMode>(
    initialConfig?.mode || "stopwatch",
  );
  const [duration, setDuration] = useState(
    (initialConfig?.duration || 5) * 60 * 1000,
  ); // ms
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(
    initialConfig?.soundEnabled !== false,
  );

  // Refs for accurate timing
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  // UI state
  const [showHelp, setShowHelp] = useState(false);

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "timer",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 80,
        height: stdout?.rows || 24,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (soundEnabled) {
      process.stdout.write("\x07"); // Terminal bell
    }
  }, [soundEnabled]);

  // Timer tick effect
  useEffect(() => {
    if (running) {
      startTimeRef.current = performance.now();

      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const now = performance.now();
          const delta = now - startTimeRef.current;
          const newElapsed = pausedAtRef.current + delta;
          setElapsed(newElapsed);

          // Check for countdown completion
          if (
            mode === "countdown" &&
            newElapsed >= duration &&
            !completedRef.current
          ) {
            completedRef.current = true;
            playSound();
            setRunning(false);
            pausedAtRef.current = duration;

            // Send completion event
            ipc.sendAlert({
              type: "timer-complete",
              message: "Countdown complete!",
              data: { elapsed: duration },
            });
          }
        }
      }, 10);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, mode, duration, playSound, ipc]);

  // Start timer
  const startTimer = useCallback(() => {
    if (running) return;

    // Reset completion flag if restarting after completion
    if (mode === "countdown" && elapsed >= duration) {
      pausedAtRef.current = 0;
      setElapsed(0);
      completedRef.current = false;
    }

    setRunning(true);
  }, [running, mode, elapsed, duration]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (!running) return;

    setRunning(false);
    pausedAtRef.current = elapsed;
    startTimeRef.current = null;
  }, [running, elapsed]);

  // Toggle timer
  const toggleTimer = useCallback(() => {
    if (running) {
      stopTimer();
    } else {
      startTimer();
    }
  }, [running, startTimer, stopTimer]);

  // Reset timer
  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsed(0);
    pausedAtRef.current = 0;
    setLaps([]);
    completedRef.current = false;
  }, [stopTimer]);

  // Record lap
  const recordLap = useCallback(() => {
    if (mode !== "stopwatch" || !running) return;

    const lastLap = laps[laps.length - 1];
    const previousElapsed = lastLap?.elapsed || 0;
    const split = elapsed - previousElapsed;

    const newLap: Lap = {
      index: laps.length + 1,
      elapsed,
      split,
      timestamp: new Date(),
    };

    setLaps((prev) => [...prev, newLap]);
  }, [mode, running, elapsed, laps]);

  // Switch mode
  const switchMode = useCallback(() => {
    resetTimer();
    setMode((prev) => (prev === "stopwatch" ? "countdown" : "stopwatch"));
  }, [resetTimer]);

  // Adjust countdown duration
  const adjustDuration = useCallback(
    (delta: number) => {
      if (mode !== "countdown" || running) return;

      setDuration((prev) => {
        const newDuration = Math.max(60000, prev + delta * 60000); // Min 1 minute
        return Math.min(newDuration, 99 * 60 * 1000); // Max 99 minutes
      });
    },
    [mode, running],
  );

  // Keyboard input
  useInput((input, key) => {
    // Canvas navigation takes highest priority
    if (handleNavInput(input, key)) {
      return;
    }

    // Help overlay
    if (input === "?") {
      setShowHelp((h) => !h);
      return;
    }
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Quit
    if (key.escape || input === "q") {
      const result: TimerResult = {
        action: "close",
        elapsed,
        laps: laps.length,
      };
      ipc.sendSelected(result);
      exit();
      return;
    }

    // Timer controls
    if (input === " ") {
      toggleTimer();
    } else if (input === "r") {
      resetTimer();
    } else if (input === "l") {
      recordLap();
    } else if (input === "m") {
      switchMode();
    } else if (input === "+") {
      adjustDuration(1);
    } else if (input === "-") {
      adjustDuration(-1);
    } else if (input === "s") {
      setSoundEnabled((s) => !s);
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const maxLapsVisible = Math.max(3, Math.floor((termHeight - 15) / 2));

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={TIMER_COLORS.neonMagenta}
      >
        <Text color={TIMER_COLORS.neonCyan} bold>
          {"// TIMER //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} paddingY={1}>
        {/* Left side - Timer display */}
        <Box flexDirection="column" width="60%" alignItems="center">
          <TimerDisplay
            elapsed={elapsed}
            running={running}
            mode={mode}
            duration={duration}
            width={Math.floor(termWidth * 0.55)}
          />
        </Box>

        {/* Right side - Laps (stopwatch) or Settings */}
        <Box flexDirection="column" width="40%">
          {mode === "stopwatch" ? (
            <LapList
              laps={laps}
              width={Math.floor(termWidth * 0.35)}
              maxVisible={maxLapsVisible}
            />
          ) : null}

          <Box marginTop={mode === "stopwatch" ? 1 : 0}>
            <SettingsPanel
              mode={mode}
              duration={duration}
              soundEnabled={soundEnabled}
              width={Math.floor(termWidth * 0.35)}
            />
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={TIMER_COLORS.dim}>
          Tab switch | ? help | Space start/stop | r reset |{" "}
          {mode === "stopwatch" ? "l lap | " : "+/- duration | "}m mode | s
          sound | q quit
        </Text>
      </Box>

      {/* Help overlay */}
      {showHelp && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <HelpOverlay
            title="TIMER"
            bindings={TIMER_BINDINGS}
            visible={showHelp}
            width={Math.min(50, termWidth - 10)}
          />
        </Box>
      )}

      {/* Canvas navigator overlay */}
      {showNav && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <CanvasNavigator
            visible={showNav}
            currentCanvas="timer"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
