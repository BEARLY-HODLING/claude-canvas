// Dashboard Canvas - Unified view with multiple widgets

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import { type DashboardConfig } from "./dashboard/types";
import { useStandaloneTheme, type Theme } from "../themes/context";
import { getNextTheme } from "../themes/index";
import {
  HelpOverlay,
  type KeyBinding,
  COMMON_BINDINGS,
} from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  weatherService,
  formatTemp,
  type WeatherData,
  type GeoLocation,
} from "../services/weather";
import {
  systemService,
  formatBytes,
  progressBar,
  type CpuUsage,
  type MemoryInfo,
} from "../services/system";

interface Props {
  id: string;
  config?: DashboardConfig;
  socketPath?: string;
  scenario?: string;
}

// Calendar event interface
interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color?: string;
}

// Dashboard-specific keybindings
const DASHBOARD_BINDINGS: KeyBinding[] = [
  { key: "1", description: "Toggle weather widget", category: "view" },
  { key: "2", description: "Toggle system widget", category: "view" },
  { key: "3", description: "Toggle calendar widget", category: "view" },
  { key: "r", description: "Refresh all data", category: "action" },
  { key: "u", description: "Toggle temperature unit", category: "action" },
  { key: "t", description: "Cycle theme", category: "view" },
  { key: "Tab", description: "Open canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Compact Clock Widget
function ClockWidget({ width, theme }: { width: number; theme: Theme }) {
  const [time, setTime] = useState(new Date());
  const colors = theme.colors;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  const timeStr = `${hour12}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${ampm}`;
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.primary}
      paddingX={1}
      width={width}
    >
      <Box justifyContent="center">
        <Text color={colors.secondary} bold>
          {"[ CLOCK ]"}
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text color={colors.primary} bold>
          {timeStr}
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text color={colors.dim}>{dateStr}</Text>
      </Box>
    </Box>
  );
}

// Compact Weather Widget
function WeatherWidget({
  weather,
  tempUnit,
  isLoading,
  width,
  theme,
}: {
  weather: WeatherData | null;
  tempUnit: "C" | "F";
  isLoading: boolean;
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.accent}
      paddingX={1}
      width={width}
    >
      <Box>
        <Text color={colors.secondary} bold>
          {"[ 1-WEATHER ]"}
        </Text>
        {isLoading && (
          <Text color={colors.accent}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>

      {weather ? (
        <Box flexDirection="column">
          <Box>
            <Text color={colors.primary} bold>
              {weather.location.name}
            </Text>
            <Text color={colors.dim}>
              , {weather.location.admin1 || weather.location.country}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={colors.accent} bold>
              {weather.current.weatherIcon}{" "}
            </Text>
            <Text color={colors.primary} bold>
              {formatTemp(weather.current.temperature, tempUnit)}
            </Text>
            <Text color={colors.dim}>
              {" "}
              (feels {formatTemp(weather.current.apparentTemperature, tempUnit)}
              )
            </Text>
          </Box>
          <Box>
            <Text color={colors.text}>
              {weather.current.weatherDescription}
            </Text>
          </Box>
          <Box>
            <Text color={colors.dim}>
              Humidity: {weather.current.humidity}% | Wind:{" "}
              {Math.round(weather.current.windSpeed)} km/h
            </Text>
          </Box>
        </Box>
      ) : (
        <Text color={colors.dim}>No weather data</Text>
      )}
    </Box>
  );
}

// Compact System Widget
function SystemWidget({
  cpu,
  memory,
  isLoading,
  width,
  theme,
}: {
  cpu: CpuUsage | null;
  memory: MemoryInfo | null;
  isLoading: boolean;
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;
  const barWidth = Math.min(15, width - 20);

  const cpuColor = cpu
    ? cpu.total > 80
      ? colors.error
      : cpu.total > 50
        ? colors.warning
        : colors.success
    : colors.dim;

  const memColor = memory
    ? memory.usedPercent > 90
      ? colors.error
      : memory.usedPercent > 70
        ? colors.warning
        : colors.success
    : colors.dim;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.warning}
      paddingX={1}
      width={width}
    >
      <Box>
        <Text color={colors.secondary} bold>
          {"[ 2-SYSTEM ]"}
        </Text>
        {isLoading && (
          <Text color={colors.accent}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>

      {cpu && memory ? (
        <Box flexDirection="column">
          {/* CPU */}
          <Box>
            <Text color={colors.dim}>CPU: </Text>
            <Text color={cpuColor}>{progressBar(cpu.total, barWidth)}</Text>
            <Text color={cpuColor} bold>
              {" "}
              {cpu.total.toFixed(1)}%
            </Text>
          </Box>
          <Box>
            <Text color={colors.dim}>
              {cpu.cores} cores @ {cpu.speed}MHz
            </Text>
          </Box>

          {/* Memory */}
          <Box marginTop={1}>
            <Text color={colors.dim}>MEM: </Text>
            <Text color={memColor}>
              {progressBar(memory.usedPercent, barWidth)}
            </Text>
            <Text color={memColor} bold>
              {" "}
              {memory.usedPercent.toFixed(1)}%
            </Text>
          </Box>
          <Box>
            <Text color={colors.dim}>
              {formatBytes(memory.used)} / {formatBytes(memory.total)}
            </Text>
          </Box>
        </Box>
      ) : (
        <Text color={colors.dim}>Loading system info...</Text>
      )}
    </Box>
  );
}

// Compact Calendar Widget
function CalendarWidget({
  events,
  width,
  theme,
}: {
  events: CalendarEvent[];
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;
  const now = new Date();

  // Filter to upcoming events and sort by start time
  const upcomingEvents = events
    .filter((e) => e.endTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 3);

  const formatEventTime = (date: Date): string => {
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const INK_COLORS = ["yellow", "green", "blue", "magenta", "red", "cyan"];

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.secondary}
      paddingX={1}
      width={width}
    >
      <Box>
        <Text color={colors.secondary} bold>
          {"[ 3-CALENDAR ]"}
        </Text>
      </Box>

      {upcomingEvents.length > 0 ? (
        <Box flexDirection="column">
          {upcomingEvents.map((event, i) => {
            const color = event.color || INK_COLORS[i % INK_COLORS.length];
            const titleWidth = Math.max(10, width - 4);
            const displayTitle = event.title.slice(0, titleWidth);

            return (
              <Box
                key={event.id}
                flexDirection="column"
                marginTop={i > 0 ? 1 : 0}
              >
                <Box>
                  <Text color={color as string} bold>
                    {displayTitle}
                  </Text>
                </Box>
                <Box>
                  <Text color={colors.dim}>
                    {formatEventTime(event.startTime)}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Text color={colors.dim}>No upcoming events</Text>
      )}
    </Box>
  );
}

// Get demo calendar events
function getDemoEvents(): CalendarEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      id: "1",
      title: "Team Standup",
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM today
      endTime: new Date(today.getTime() + 9.5 * 60 * 60 * 1000),
      color: "yellow",
    },
    {
      id: "2",
      title: "Design Review",
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM today
      endTime: new Date(today.getTime() + 15.5 * 60 * 60 * 1000),
      color: "green",
    },
    {
      id: "3",
      title: "1:1 with Manager",
      startTime: new Date(
        today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000,
      ), // 10 AM tomorrow
      endTime: new Date(
        today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000,
      ),
      color: "cyan",
    },
    {
      id: "4",
      title: "Sprint Planning",
      startTime: new Date(
        today.getTime() + 48 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000,
      ), // 2 PM in 2 days
      endTime: new Date(
        today.getTime() + 48 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000,
      ),
      color: "magenta",
    },
  ];
}

export function DashboardCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "dashboard",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Theme
  const { theme, themeName, cycleTheme } = useStandaloneTheme(
    initialConfig?.theme || "cyberpunk",
  );
  const colors = theme.colors;

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Widget visibility
  const [showWeather, setShowWeather] = useState(
    initialConfig?.showWeather !== false,
  );
  const [showSystem, setShowSystem] = useState(
    initialConfig?.showSystem !== false,
  );
  const [showCalendar, setShowCalendar] = useState(
    initialConfig?.showCalendar !== false,
  );

  // Weather data
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(
    initialConfig?.location || null,
  );
  const [tempUnit, setTempUnit] = useState<"C" | "F">(
    initialConfig?.tempUnit || "C",
  );

  // System data
  const [cpu, setCpu] = useState<CpuUsage | null>(null);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);

  // Calendar events
  const [events] = useState<CalendarEvent[]>(() => {
    if (initialConfig?.calendarEvents) {
      return initialConfig.calendarEvents.map((e) => ({
        ...e,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
      }));
    }
    return getDemoEvents();
  });

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh interval
  const refreshInterval = (initialConfig?.refreshInterval || 30) * 1000;

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
    "dashboard",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 120,
        height: stdout?.rows || 40,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Fetch weather data
  const fetchWeather = useCallback(async () => {
    if (!showWeather) return;

    setWeatherLoading(true);
    try {
      let loc = location;
      if (!loc) {
        // Default to New York if no location set
        const results = await weatherService.searchLocations("New York", 1);
        if (results.length > 0) {
          loc = results[0]!;
          setLocation(loc);
        }
      }

      if (loc) {
        const data = await weatherService.getWeather(loc);
        setWeather(data);
      }
    } catch (err) {
      setError(`Weather: ${(err as Error).message}`);
    } finally {
      setWeatherLoading(false);
    }
  }, [location, showWeather]);

  // Fetch system data
  const fetchSystem = useCallback(async () => {
    if (!showSystem) return;

    setSystemLoading(true);
    try {
      const cpuData = systemService.getCpuUsage();
      const memData = systemService.getMemoryInfo();
      setCpu(cpuData);
      setMemory(memData);
    } catch (err) {
      setError(`System: ${(err as Error).message}`);
    } finally {
      setSystemLoading(false);
    }
  }, [showSystem]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchWeather(), fetchSystem()]);
  }, [fetchWeather, fetchSystem]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAll, refreshInterval]);

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
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Widget toggles
    if (input === "1") {
      setShowWeather((s) => !s);
    } else if (input === "2") {
      setShowSystem((s) => !s);
    } else if (input === "3") {
      setShowCalendar((s) => !s);
    } else if (input === "r") {
      fetchAll();
    } else if (input === "u") {
      setTempUnit((u) => (u === "C" ? "F" : "C"));
    } else if (input === "t") {
      cycleTheme();
    }
  });

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Widget widths
  const widgetWidth = Math.max(35, Math.floor((termWidth - 4) / 2));
  const clockWidth = Math.min(40, termWidth - 2);

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        borderStyle="single"
        borderColor={colors.secondary}
        marginBottom={1}
      >
        <Text color={colors.primary} bold>
          {"// DASHBOARD //"}
        </Text>
        <Text color={colors.dim}> [{themeName}]</Text>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1}>
          <Text color={colors.error}>Error: {error}</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Clock at top */}
        <Box justifyContent="center" marginBottom={1}>
          <ClockWidget width={clockWidth} theme={theme} />
        </Box>

        {/* Widgets row */}
        <Box flexDirection="row" justifyContent="space-between">
          {/* Left column */}
          <Box flexDirection="column" width={widgetWidth}>
            {showWeather && (
              <WeatherWidget
                weather={weather}
                tempUnit={tempUnit}
                isLoading={weatherLoading}
                width={widgetWidth}
                theme={theme}
              />
            )}
            {showCalendar && (
              <Box marginTop={showWeather ? 1 : 0}>
                <CalendarWidget
                  events={events}
                  width={widgetWidth}
                  theme={theme}
                />
              </Box>
            )}
          </Box>

          {/* Right column */}
          <Box flexDirection="column" width={widgetWidth}>
            {showSystem && (
              <SystemWidget
                cpu={cpu}
                memory={memory}
                isLoading={systemLoading}
                width={widgetWidth}
                theme={theme}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={colors.dim}>
          Tab nav | ? help | 1-3 widgets | r refresh | u unit | t theme | q quit
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
            title="DASHBOARD"
            bindings={DASHBOARD_BINDINGS}
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
            currentCanvas="dashboard"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
