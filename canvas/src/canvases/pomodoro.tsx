// Pomodoro Timer Canvas - Focus timer with work/break cycles

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type PomodoroConfig,
  type SessionState,
  type SessionType,
  type PomodoroStats,
  POMODORO_COLORS,
  ASCII_DIGITS,
} from "./pomodoro/types";
import { HelpOverlay, POMODORO_BINDINGS } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";

interface Props {
  id: string;
  config?: PomodoroConfig;
  socketPath?: string;
  scenario?: string;
}

// Default durations in minutes
const DEFAULT_WORK_DURATION = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;
const DEFAULT_POMODOROS_UNTIL_LONG_BREAK = 4;

// Get ASCII digit safely
function getAsciiDigit(char: string, line: number): string {
  return ASCII_DIGITS[char]?.[line] ?? "    ";
}

// Render large ASCII timer
function renderAsciiTime(minutes: number, seconds: number): string[] {
  const m1 = Math.floor(minutes / 10).toString();
  const m2 = (minutes % 10).toString();
  const s1 = Math.floor(seconds / 10).toString();
  const s2 = (seconds % 10).toString();

  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    lines.push(
      `${getAsciiDigit(m1, i)} ${getAsciiDigit(m2, i)} ${getAsciiDigit(":", i)} ${getAsciiDigit(s1, i)} ${getAsciiDigit(s2, i)}`,
    );
  }
  return lines;
}

// Progress bar
function progressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// Format session type for display
function formatSessionType(type: SessionType): string {
  switch (type) {
    case "WORK":
      return "🍅 WORK";
    case "SHORT_BREAK":
      return "☕ SHORT BREAK";
    case "LONG_BREAK":
      return "🌴 LONG BREAK";
  }
}

// Get color for session type
function getSessionColor(type: SessionType): string {
  switch (type) {
    case "WORK":
      return POMODORO_COLORS.neonRed;
    case "SHORT_BREAK":
      return POMODORO_COLORS.neonGreen;
    case "LONG_BREAK":
      return POMODORO_COLORS.neonCyan;
  }
}

// Timer display component
function TimerDisplay({
  session,
  width,
}: {
  session: SessionState;
  width: number;
}) {
  const minutes = Math.floor(session.remaining / 60);
  const seconds = session.remaining % 60;
  const asciiLines = renderAsciiTime(minutes, seconds);
  const percent =
    ((session.duration - session.remaining) / session.duration) * 100;
  const barWidth = Math.min(40, width - 10);
  const sessionColor = getSessionColor(session.type);

  return (
    <Box flexDirection="column" alignItems="center" width={width}>
      {/* Session type header */}
      <Box marginBottom={1}>
        <Text color={sessionColor} bold>
          {"[ "}
          {formatSessionType(session.type)}
          {" ]"}
        </Text>
      </Box>

      {/* ASCII time display */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={session.isRunning ? sessionColor : POMODORO_COLORS.dim}
        paddingX={2}
        paddingY={1}
      >
        {asciiLines.map((line, i) => (
          <Text key={i} color={sessionColor}>
            {line}
          </Text>
        ))}
      </Box>

      {/* Progress bar */}
      <Box marginTop={1}>
        <Text color={POMODORO_COLORS.dim}>[</Text>
        <Text color={sessionColor}>{progressBar(percent, barWidth)}</Text>
        <Text color={POMODORO_COLORS.dim}>]</Text>
        <Text color={POMODORO_COLORS.dim}> {Math.round(percent)}%</Text>
      </Box>

      {/* Status */}
      <Box marginTop={1}>
        {session.isRunning ? (
          <Text color={POMODORO_COLORS.neonGreen}>● RUNNING</Text>
        ) : (
          <Text color={POMODORO_COLORS.neonYellow}>⏸ PAUSED</Text>
        )}
      </Box>
    </Box>
  );
}

// Stats panel component
function StatsPanel({
  stats,
  session,
  width,
}: {
  stats: PomodoroStats;
  session: SessionState;
  width: number;
}) {
  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={POMODORO_COLORS.neonMagenta} bold>
          {"[ STATISTICS ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={POMODORO_COLORS.dim}
        paddingX={1}
      >
        {/* Pomodoro counter */}
        <Box>
          <Text color={POMODORO_COLORS.dim}>Pomodoro: </Text>
          <Text color={POMODORO_COLORS.neonCyan} bold>
            #{session.totalPomodoros + 1}
          </Text>
          <Text color={POMODORO_COLORS.dim}>
            {" "}
            (Cycle: {session.pomodoroCount}/4)
          </Text>
        </Box>

        {/* Today's stats */}
        <Box marginTop={1}>
          <Text color={POMODORO_COLORS.dim}>Today: </Text>
          <Text color={POMODORO_COLORS.neonGreen}>
            {stats.completedPomodoros} pomodoros
          </Text>
        </Box>

        <Box>
          <Text color={POMODORO_COLORS.dim}>Work time: </Text>
          <Text color={POMODORO_COLORS.neonCyan}>
            {Math.floor(stats.totalWorkMinutes / 60)}h{" "}
            {stats.totalWorkMinutes % 60}m
          </Text>
        </Box>

        <Box>
          <Text color={POMODORO_COLORS.dim}>Break time: </Text>
          <Text color={POMODORO_COLORS.neonGreen}>
            {stats.totalBreakMinutes}m
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// Settings panel component
function SettingsPanel({
  workDuration,
  shortBreak,
  longBreak,
  soundEnabled,
  width,
}: {
  workDuration: number;
  shortBreak: number;
  longBreak: number;
  soundEnabled: boolean;
  width: number;
}) {
  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={POMODORO_COLORS.neonMagenta} bold>
          {"[ SETTINGS ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={POMODORO_COLORS.dim}
        paddingX={1}
      >
        <Box>
          <Text color={POMODORO_COLORS.dim}>Work: </Text>
          <Text color={POMODORO_COLORS.neonYellow}>{workDuration} min</Text>
          <Text color={POMODORO_COLORS.dim}> (+/- to adjust)</Text>
        </Box>
        <Box>
          <Text color={POMODORO_COLORS.dim}>Short break: </Text>
          <Text color={POMODORO_COLORS.neonGreen}>{shortBreak} min</Text>
        </Box>
        <Box>
          <Text color={POMODORO_COLORS.dim}>Long break: </Text>
          <Text color={POMODORO_COLORS.neonCyan}>{longBreak} min</Text>
        </Box>
        <Box>
          <Text color={POMODORO_COLORS.dim}>Sound: </Text>
          <Text
            color={
              soundEnabled ? POMODORO_COLORS.neonGreen : POMODORO_COLORS.dim
            }
          >
            {soundEnabled ? "ON" : "OFF"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function PomodoroCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "pomodoro",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Settings
  const [workDuration, setWorkDuration] = useState(
    initialConfig?.workDuration || DEFAULT_WORK_DURATION,
  );
  const [shortBreakDuration] = useState(
    initialConfig?.shortBreakDuration || DEFAULT_SHORT_BREAK,
  );
  const [longBreakDuration] = useState(
    initialConfig?.longBreakDuration || DEFAULT_LONG_BREAK,
  );
  const pomodorosUntilLongBreak =
    initialConfig?.pomodorosUntilLongBreak ||
    DEFAULT_POMODOROS_UNTIL_LONG_BREAK;
  const [soundEnabled, setSoundEnabled] = useState(
    initialConfig?.soundEnabled !== false,
  );

  // Session state
  const [session, setSession] = useState<SessionState>({
    type: "WORK",
    duration: workDuration * 60,
    remaining: workDuration * 60,
    isRunning: false,
    pomodoroCount: 0,
    totalPomodoros: 0,
  });

  // Statistics
  const [stats, setStats] = useState<PomodoroStats>({
    completedPomodoros: 0,
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
    sessionsToday: 0,
  });

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    "pomodoro",
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

  // Get next session type and duration
  const getNextSession = useCallback(
    (
      currentType: SessionType,
      pomodoroCount: number,
    ): { type: SessionType; duration: number; newPomodoroCount: number } => {
      if (currentType === "WORK") {
        const newCount = pomodoroCount + 1;
        if (newCount >= pomodorosUntilLongBreak) {
          return {
            type: "LONG_BREAK",
            duration: longBreakDuration * 60,
            newPomodoroCount: 0,
          };
        } else {
          return {
            type: "SHORT_BREAK",
            duration: shortBreakDuration * 60,
            newPomodoroCount: newCount,
          };
        }
      } else {
        return {
          type: "WORK",
          duration: workDuration * 60,
          newPomodoroCount: pomodoroCount,
        };
      }
    },
    [
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      pomodorosUntilLongBreak,
    ],
  );

  // Complete current session
  const completeSession = useCallback(() => {
    playSound();

    setSession((prev) => {
      const next = getNextSession(prev.type, prev.pomodoroCount);
      const newTotalPomodoros =
        prev.type === "WORK" ? prev.totalPomodoros + 1 : prev.totalPomodoros;

      return {
        type: next.type,
        duration: next.duration,
        remaining: next.duration,
        isRunning: false,
        pomodoroCount: next.newPomodoroCount,
        totalPomodoros: newTotalPomodoros,
      };
    });

    setStats((prev) => {
      if (session.type === "WORK") {
        return {
          ...prev,
          completedPomodoros: prev.completedPomodoros + 1,
          totalWorkMinutes: prev.totalWorkMinutes + workDuration,
          sessionsToday: prev.sessionsToday + 1,
        };
      } else {
        const breakDuration =
          session.type === "SHORT_BREAK"
            ? shortBreakDuration
            : longBreakDuration;
        return {
          ...prev,
          totalBreakMinutes: prev.totalBreakMinutes + breakDuration,
          sessionsToday: prev.sessionsToday + 1,
        };
      }
    });

    // Send alert via IPC
    ipc.sendAlert({
      type: "session-complete",
      message: `${session.type} session completed!`,
      data: { sessionType: session.type },
    });
  }, [
    playSound,
    getNextSession,
    session.type,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    ipc,
  ]);

  // Timer tick
  useEffect(() => {
    if (session.isRunning) {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          if (prev.remaining <= 1) {
            // Session complete - will be handled by completeSession
            return { ...prev, remaining: 0, isRunning: false };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session.isRunning]);

  // Check for session completion
  useEffect(() => {
    if (session.remaining === 0 && !session.isRunning) {
      completeSession();
    }
  }, [session.remaining, session.isRunning, completeSession]);

  // Toggle timer
  const toggleTimer = useCallback(() => {
    setSession((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  // Reset current timer
  const resetTimer = useCallback(() => {
    const duration =
      session.type === "WORK"
        ? workDuration * 60
        : session.type === "SHORT_BREAK"
          ? shortBreakDuration * 60
          : longBreakDuration * 60;

    setSession((prev) => ({
      ...prev,
      duration,
      remaining: duration,
      isRunning: false,
    }));
  }, [session.type, workDuration, shortBreakDuration, longBreakDuration]);

  // Skip to next session
  const skipSession = useCallback(() => {
    const next = getNextSession(session.type, session.pomodoroCount);
    setSession((prev) => ({
      type: next.type,
      duration: next.duration,
      remaining: next.duration,
      isRunning: false,
      pomodoroCount: next.newPomodoroCount,
      totalPomodoros: prev.totalPomodoros,
    }));
  }, [session.type, session.pomodoroCount, getNextSession]);

  // Adjust work duration
  const adjustWorkDuration = useCallback((delta: number) => {
    setWorkDuration((prev) => {
      const newDuration = Math.max(5, Math.min(60, prev + delta));
      // Update current session if it's a work session
      setSession((s) => {
        if (s.type === "WORK" && !s.isRunning) {
          return {
            ...s,
            duration: newDuration * 60,
            remaining: newDuration * 60,
          };
        }
        return s;
      });
      return newDuration;
    });
  }, []);

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
      ipc.sendSelected({
        action: "close",
        stats,
      });
      exit();
      return;
    }

    // Timer controls
    if (input === " ") {
      toggleTimer();
    } else if (input === "r") {
      resetTimer();
    } else if (input === "s") {
      skipSession();
    } else if (input === "+") {
      adjustWorkDuration(5);
    } else if (input === "-") {
      adjustWorkDuration(-5);
    } else if (input === "m") {
      setSoundEnabled((s) => !s);
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={POMODORO_COLORS.neonMagenta}
      >
        <Text color={POMODORO_COLORS.neonCyan} bold>
          {"// POMODORO TIMER //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} paddingY={1}>
        {/* Left side - Timer */}
        <Box flexDirection="column" width="60%" alignItems="center">
          <TimerDisplay
            session={session}
            width={Math.floor(termWidth * 0.55)}
          />
        </Box>

        {/* Right side - Stats and Settings */}
        <Box flexDirection="column" width="40%">
          <StatsPanel
            stats={stats}
            session={session}
            width={Math.floor(termWidth * 0.35)}
          />
          <Box marginTop={1}>
            <SettingsPanel
              workDuration={workDuration}
              shortBreak={shortBreakDuration}
              longBreak={longBreakDuration}
              soundEnabled={soundEnabled}
              width={Math.floor(termWidth * 0.35)}
            />
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={POMODORO_COLORS.dim}>
          Tab switch | ? help | Space start/pause | r reset | s skip | +/- work
          duration | m sound | q quit
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
            title="POMODORO TIMER"
            bindings={POMODORO_BINDINGS}
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
            currentCanvas="pomodoro"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
