// World Clock Canvas - Display multiple timezone clocks simultaneously

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type WorldClockConfig,
  type WorldClockResult,
  WORLDCLOCK_COLORS,
  DEFAULT_CITIES,
  MAX_DISPLAYED_CLOCKS,
  getDayPeriod,
} from "./worldclock/types";
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
  worldClockService,
  type CityTimezone,
  type TimezoneTime,
  formatTimeDigit,
  PRESET_CITIES,
} from "../services/worldclock";

interface Props {
  id: string;
  config?: WorldClockConfig;
  socketPath?: string;
  scenario?: string;
}

// World Clock specific keybindings
const WORLDCLOCK_BINDINGS: KeyBinding[] = [
  { key: "Up/Down", description: "Navigate clocks", category: "navigation" },
  { key: "a", description: "Add city", category: "action" },
  { key: "d", description: "Remove selected city", category: "action" },
  { key: "/", description: "Search cities", category: "action" },
  {
    key: "Enter",
    description: "Add from search / confirm",
    category: "action",
  },
  { key: "Esc", description: "Cancel search / quit", category: "navigation" },
  { key: "f", description: "Toggle 12/24 hour format", category: "view" },
  { key: "s", description: "Toggle seconds display", category: "view" },
  { key: "o", description: "Toggle offset display", category: "view" },
  { key: "t", description: "Cycle theme", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Single clock display component
function ClockCard({
  timeInfo,
  selected,
  use24Hour,
  showSeconds,
  showDate,
  showDST,
  showOffset,
  width,
  theme,
}: {
  timeInfo: TimezoneTime;
  selected: boolean;
  use24Hour: boolean;
  showSeconds: boolean;
  showDate: boolean;
  showDST: boolean;
  showOffset: boolean;
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;
  const {
    city,
    hour,
    minute,
    second,
    hour12,
    ampm,
    dateString,
    isDST,
    offsetString,
    isNextDay,
    isPrevDay,
  } = timeInfo;
  const period = getDayPeriod(hour);

  // Format time string
  const timeStr = use24Hour
    ? showSeconds
      ? `${formatTimeDigit(hour)}:${formatTimeDigit(minute)}:${formatTimeDigit(second)}`
      : `${formatTimeDigit(hour)}:${formatTimeDigit(minute)}`
    : showSeconds
      ? `${formatTimeDigit(hour12)}:${formatTimeDigit(minute)}:${formatTimeDigit(second)} ${ampm}`
      : `${formatTimeDigit(hour12)}:${formatTimeDigit(minute)} ${ampm}`;

  // Day indicator
  const dayIndicator = isNextDay ? " +1d" : isPrevDay ? " -1d" : "";

  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? "double" : "single"}
      borderColor={selected ? colors.primary : colors.dim}
      paddingX={1}
      width={width}
    >
      {/* City name and country */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={colors.primary} bold>
            {city.name}
          </Text>
          <Text color={colors.dim}>, {city.countryCode}</Text>
        </Box>
        <Text color={period.color as string}>{period.icon}</Text>
      </Box>

      {/* Time display */}
      <Box justifyContent="center" marginY={1}>
        <Text color={selected ? colors.accent : colors.text} bold>
          {timeStr}
        </Text>
        {dayIndicator && <Text color={colors.warning}>{dayIndicator}</Text>}
      </Box>

      {/* Additional info row */}
      <Box justifyContent="space-between">
        {/* Date */}
        {showDate && <Text color={colors.dim}>{dateString}</Text>}

        {/* Offset and DST */}
        <Box>
          {showOffset && <Text color={colors.secondary}>{offsetString}</Text>}
          {showDST && isDST && <Text color={colors.warning}> DST</Text>}
        </Box>
      </Box>

      {/* Timezone abbreviation */}
      <Box justifyContent="flex-end">
        <Text color={colors.dim}>{city.abbreviation}</Text>
      </Box>
    </Box>
  );
}

// Large clock display for selected city
function LargeClockDisplay({
  timeInfo,
  use24Hour,
  width,
  theme,
}: {
  timeInfo: TimezoneTime;
  use24Hour: boolean;
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;
  const {
    city,
    hour,
    minute,
    second,
    hour12,
    ampm,
    dateString,
    isDST,
    offsetString,
  } = timeInfo;
  const period = getDayPeriod(hour);

  const displayHour = use24Hour ? hour : hour12;

  // ASCII digit rendering (simplified 3-line digits)
  const renderDigit = (n: number): string[] => {
    const d = n.toString().padStart(2, "0");
    const d1 = d[0] || "0";
    const d2 = d[1] || "0";

    const digits: Record<string, string[]> = {
      "0": [" _ ", "| |", "|_|"],
      "1": ["   ", "  |", "  |"],
      "2": [" _ ", " _|", "|_ "],
      "3": [" _ ", " _|", " _|"],
      "4": ["   ", "|_|", "  |"],
      "5": [" _ ", "|_ ", " _|"],
      "6": [" _ ", "|_ ", "|_|"],
      "7": [" _ ", "  |", "  |"],
      "8": [" _ ", "|_|", "|_|"],
      "9": [" _ ", "|_|", " _|"],
    };

    return [
      `${digits[d1]?.[0] || "   "} ${digits[d2]?.[0] || "   "}`,
      `${digits[d1]?.[1] || "   "} ${digits[d2]?.[1] || "   "}`,
      `${digits[d1]?.[2] || "   "} ${digits[d2]?.[2] || "   "}`,
    ];
  };

  const colon = ["   ", " o ", " o "];
  const hourDigits = renderDigit(displayHour);
  const minuteDigits = renderDigit(minute);
  const secondDigits = renderDigit(second);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      borderStyle="single"
      borderColor={colors.secondary}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      {/* City header */}
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>
          {"[ "}
          {city.name.toUpperCase()}
          {" ]"}
        </Text>
        <Text color={colors.dim}> {city.country}</Text>
      </Box>

      {/* Large time display */}
      <Box flexDirection="column">
        {[0, 1, 2].map((line) => (
          <Box key={line} justifyContent="center">
            <Text color={colors.accent}>
              {hourDigits[line]}
              {colon[line]}
              {minuteDigits[line]}
              {colon[line]}
              {secondDigits[line]}
            </Text>
            {!use24Hour && line === 1 && (
              <Text color={colors.secondary}> {ampm}</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Info row */}
      <Box marginTop={1} justifyContent="space-between" width="100%">
        <Box>
          <Text color={period.color as string}>{period.icon} </Text>
          <Text color={colors.dim}>{dateString}</Text>
        </Box>
        <Box>
          <Text color={colors.secondary}>{offsetString}</Text>
          {isDST && <Text color={colors.warning}> [DST]</Text>}
        </Box>
      </Box>
    </Box>
  );
}

// Search panel component
function SearchPanel({
  query,
  results,
  selectedIndex,
  width,
  theme,
}: {
  query: string;
  results: CityTimezone[];
  selectedIndex: number;
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={colors.accent}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={colors.accent} bold>
          {"[ SEARCH CITIES ]"}
        </Text>
      </Box>

      {/* Search input */}
      <Box marginBottom={1}>
        <Text color={colors.dim}>Search: </Text>
        <Text color={colors.text}>{query}</Text>
        <Text color={colors.accent}>_</Text>
      </Box>

      {/* Results */}
      <Box flexDirection="column" height={Math.min(10, results.length + 1)}>
        {results.length > 0 ? (
          results.slice(0, 8).map((city, i) => (
            <Box key={city.id}>
              <Text
                color={i === selectedIndex ? colors.accent : colors.text}
                inverse={i === selectedIndex}
              >
                {i === selectedIndex ? "> " : "  "}
                {city.name}, {city.country} ({city.abbreviation})
              </Text>
            </Box>
          ))
        ) : (
          <Text color={colors.dim}>
            {query ? "No cities found" : "Type to search..."}
          </Text>
        )}
      </Box>

      {/* Instructions */}
      <Box marginTop={1}>
        <Text color={colors.dim}>
          Enter: add | Esc: cancel | Up/Down: navigate
        </Text>
      </Box>
    </Box>
  );
}

// Add city quick list
function AddCityList({
  availableCities,
  selectedIndex,
  width,
  theme,
}: {
  availableCities: CityTimezone[];
  selectedIndex: number;
  width: number;
  theme: Theme;
}) {
  const colors = theme.colors;
  const visibleCount = 10;
  const startIdx = Math.max(0, selectedIndex - Math.floor(visibleCount / 2));
  const visible = availableCities.slice(startIdx, startIdx + visibleCount);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={colors.accent}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={colors.accent} bold>
          {"[ ADD CITY ]"}
        </Text>
        <Text color={colors.dim}> ({availableCities.length} available)</Text>
      </Box>

      {visible.map((city, i) => {
        const actualIdx = startIdx + i;
        return (
          <Box key={city.id}>
            <Text
              color={actualIdx === selectedIndex ? colors.accent : colors.text}
              inverse={actualIdx === selectedIndex}
            >
              {actualIdx === selectedIndex ? "> " : "  "}
              {city.name}, {city.country}
            </Text>
            <Text color={colors.dim}> ({city.abbreviation})</Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={colors.dim}>Enter: add | Esc: cancel | /: search</Text>
      </Box>
    </Box>
  );
}

export function WorldClockCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "worldclock",
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
    width: stdout?.columns || 100,
    height: stdout?.rows || 30,
  });

  // Clock settings
  const [use24Hour, setUse24Hour] = useState(
    initialConfig?.use24Hour !== false,
  );
  const [showSeconds, setShowSeconds] = useState(
    initialConfig?.showSeconds !== false,
  );
  const [showDate, setShowDate] = useState(initialConfig?.showDate !== false);
  const [showDST, setShowDST] = useState(initialConfig?.showDST !== false);
  const [showOffset, setShowOffset] = useState(
    initialConfig?.showOffset !== false,
  );

  // Cities state
  const [cities, setCities] = useState<CityTimezone[]>(() => {
    const cityIds = initialConfig?.cities || DEFAULT_CITIES;
    return cityIds
      .map((id) => worldClockService.getCityById(id))
      .filter((c): c is CityTimezone => c !== undefined)
      .slice(0, MAX_DISPLAYED_CLOCKS);
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Search/add mode state
  const [mode, setMode] = useState<"normal" | "search" | "add">("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CityTimezone[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);

  // UI state
  const [showHelp, setShowHelp] = useState(false);

  // Refresh interval
  const refreshInterval = initialConfig?.refreshInterval || 1000;

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
    "worldclock",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 100,
        height: stdout?.rows || 30,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Time update interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  // Get time info for all cities
  const timezoneInfos = useMemo(() => {
    return cities.map((city) =>
      worldClockService.getTimeForTimezone(city, currentTime),
    );
  }, [cities, currentTime]);

  // Get available cities (not already added)
  const availableCities = useMemo(() => {
    const addedIds = new Set(cities.map((c) => c.id));
    return PRESET_CITIES.filter((c) => !addedIds.has(c.id));
  }, [cities]);

  // Update search results when query changes
  useEffect(() => {
    if (mode === "search" && searchQuery) {
      const results = worldClockService
        .searchCities(searchQuery)
        .filter((c) => !cities.find((existing) => existing.id === c.id));
      setSearchResults(results);
      setSearchSelectedIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, mode, cities]);

  // Add a city
  const addCity = useCallback(
    (city: CityTimezone) => {
      if (cities.length >= MAX_DISPLAYED_CLOCKS) return;
      if (cities.find((c) => c.id === city.id)) return;

      setCities((prev) => [...prev, city]);
      setMode("normal");
      setSearchQuery("");
      setSearchResults([]);
    },
    [cities],
  );

  // Remove selected city
  const removeCity = useCallback(() => {
    if (cities.length <= 1) return; // Keep at least one clock

    setCities((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex((prev) => Math.min(prev, cities.length - 2));
  }, [cities, selectedIndex]);

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

    // Handle search/add mode input
    if (mode === "search") {
      if (key.escape) {
        setMode("normal");
        setSearchQuery("");
        setSearchResults([]);
        return;
      }
      if (key.return) {
        if (searchResults[searchSelectedIndex]) {
          addCity(searchResults[searchSelectedIndex]);
        }
        return;
      }
      if (key.upArrow) {
        setSearchSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSearchSelectedIndex((prev) =>
          Math.min(searchResults.length - 1, prev + 1),
        );
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((prev) => prev + input);
        return;
      }
      return;
    }

    if (mode === "add") {
      if (key.escape) {
        setMode("normal");
        return;
      }
      if (input === "/") {
        setMode("search");
        return;
      }
      if (key.return) {
        if (availableCities[searchSelectedIndex]) {
          addCity(availableCities[searchSelectedIndex]);
        }
        return;
      }
      if (key.upArrow) {
        setSearchSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSearchSelectedIndex((prev) =>
          Math.min(availableCities.length - 1, prev + 1),
        );
        return;
      }
      return;
    }

    // Normal mode
    if (key.escape || input === "q") {
      const result: WorldClockResult = {
        action: "close",
        cities: cities.map((c) => c.id),
      };
      ipc.sendSelected(result);
      exit();
      return;
    }

    // Navigation
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(cities.length - 1, prev + 1));
    }

    // Actions
    else if (input === "a") {
      if (cities.length < MAX_DISPLAYED_CLOCKS) {
        setMode("add");
        setSearchSelectedIndex(0);
      }
    } else if (input === "d") {
      removeCity();
    } else if (input === "/") {
      setMode("search");
      setSearchQuery("");
    }

    // View toggles
    else if (input === "f") {
      setUse24Hour((prev) => !prev);
    } else if (input === "s") {
      setShowSeconds((prev) => !prev);
    } else if (input === "o") {
      setShowOffset((prev) => !prev);
    } else if (input === "t") {
      cycleTheme();
    } else if (input === "r") {
      setCurrentTime(new Date());
    }
  });

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Clock card width calculation
  const cardWidth = Math.max(28, Math.min(40, Math.floor((termWidth - 4) / 2)));
  const cardsPerRow = Math.floor((termWidth - 2) / cardWidth);

  // Selected city info for large display
  const selectedTimeInfo = timezoneInfos[selectedIndex];

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        borderStyle="single"
        borderColor={colors.secondary}
        paddingX={1}
      >
        <Text color={colors.primary} bold>
          {"// WORLD CLOCK //"}
        </Text>
        <Box>
          <Text color={colors.dim}>
            {use24Hour ? "24h" : "12h"} | {cities.length}/{MAX_DISPLAYED_CLOCKS}{" "}
            clocks
          </Text>
          <Text color={colors.dim}> [{themeName}]</Text>
        </Box>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight} paddingX={1}>
        {/* Left: Clock grid */}
        <Box flexDirection="column" flexGrow={1}>
          {/* Clock cards in grid */}
          <Box flexDirection="row" flexWrap="wrap">
            {timezoneInfos.map((info, i) => (
              <ClockCard
                key={info.city.id}
                timeInfo={info}
                selected={i === selectedIndex}
                use24Hour={use24Hour}
                showSeconds={showSeconds}
                showDate={showDate}
                showDST={showDST}
                showOffset={showOffset}
                width={cardWidth}
                theme={theme}
              />
            ))}
          </Box>
        </Box>

        {/* Right: Large display for selected clock */}
        {selectedTimeInfo && termWidth > 80 && (
          <Box flexDirection="column" width={Math.floor(termWidth * 0.35)}>
            <LargeClockDisplay
              timeInfo={selectedTimeInfo}
              use24Hour={use24Hour}
              width={Math.floor(termWidth * 0.33)}
              theme={theme}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={colors.dim}>
          Tab nav | ? help | a add | d remove | / search | f format | s seconds
          | o offset | t theme | q quit
        </Text>
      </Box>

      {/* Search overlay */}
      {mode === "search" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <SearchPanel
            query={searchQuery}
            results={searchResults}
            selectedIndex={searchSelectedIndex}
            width={Math.min(50, termWidth - 10)}
            theme={theme}
          />
        </Box>
      )}

      {/* Add city list overlay */}
      {mode === "add" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <AddCityList
            availableCities={availableCities}
            selectedIndex={searchSelectedIndex}
            width={Math.min(50, termWidth - 10)}
            theme={theme}
          />
        </Box>
      )}

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
            title="WORLD CLOCK"
            bindings={WORLDCLOCK_BINDINGS}
            visible={showHelp}
            width={Math.min(55, termWidth - 10)}
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
            currentCanvas="worldclock"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
