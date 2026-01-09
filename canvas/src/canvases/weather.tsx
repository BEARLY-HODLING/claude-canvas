// Weather Canvas - Real-time weather with Open-Meteo API

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import { type WeatherConfig, CYBER_COLORS } from "./weather/types";
import {
  weatherService,
  formatTemp,
  windDirectionToCardinal,
  getDayName,
  type GeoLocation,
  type WeatherData,
} from "../services/weather";

interface Props {
  id: string;
  config?: WeatherConfig;
  socketPath?: string;
  scenario?: string;
}

// Current weather panel
function CurrentWeatherPanel({
  weather,
  tempUnit,
  width,
}: {
  weather: WeatherData | null;
  tempUnit: "C" | "F";
  width: number;
}) {
  if (!weather) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color={CYBER_COLORS.dim}>No weather data</Text>
      </Box>
    );
  }

  const { current, location } = weather;

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ CURRENT CONDITIONS ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {/* Location */}
        <Text color={CYBER_COLORS.neonCyan} bold>
          {location.name}
          {location.admin1 && (
            <Text color={CYBER_COLORS.dim}>, {location.admin1}</Text>
          )}
        </Text>
        <Text color={CYBER_COLORS.dim}>{location.country}</Text>

        {/* Weather icon and condition */}
        <Box marginY={1}>
          <Text>
            <Text color={CYBER_COLORS.neonGreen} bold>
              {current.weatherIcon}
            </Text>{" "}
            <Text color="white">{current.weatherDescription}</Text>
          </Text>
        </Box>

        {/* Temperature */}
        <Box>
          <Text color={CYBER_COLORS.neonCyan} bold>
            {formatTemp(current.temperature, tempUnit)}
          </Text>
          <Text color={CYBER_COLORS.dim}>
            {" "}
            (feels like {formatTemp(current.apparentTemperature, tempUnit)})
          </Text>
        </Box>

        {/* Details */}
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text color={CYBER_COLORS.dim}>Humidity: </Text>
            <Text color="white">{current.humidity}%</Text>
          </Text>
          <Text>
            <Text color={CYBER_COLORS.dim}>Wind: </Text>
            <Text color="white">
              {Math.round(current.windSpeed)} km/h{" "}
              {windDirectionToCardinal(current.windDirection)}
            </Text>
          </Text>
          {current.precipitation > 0 && (
            <Text>
              <Text color={CYBER_COLORS.dim}>Precipitation: </Text>
              <Text color="white">{current.precipitation} mm</Text>
            </Text>
          )}
        </Box>

        {/* Last updated */}
        <Box marginTop={1}>
          <Text color={CYBER_COLORS.dim}>
            Updated: {weather.lastUpdated.toLocaleTimeString()}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// 7-day forecast panel
function ForecastPanel({
  weather,
  tempUnit,
  width,
}: {
  weather: WeatherData | null;
  tempUnit: "C" | "F";
  width: number;
}) {
  if (!weather) {
    return null;
  }

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ 7-DAY FORECAST ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {weather.daily.map((day, i) => {
          const isToday = i === 0;
          const dayName = isToday ? "Today" : getDayName(day.date);

          return (
            <Box key={day.date.toISOString()}>
              <Text
                color={isToday ? CYBER_COLORS.neonCyan : "white"}
                bold={isToday}
              >
                {dayName.padEnd(5)}
              </Text>
              <Text color={CYBER_COLORS.neonGreen}> {day.weatherIcon} </Text>
              <Text color={CYBER_COLORS.neonYellow}>
                {formatTemp(day.tempMax, tempUnit).padStart(5)}
              </Text>
              <Text color={CYBER_COLORS.dim}>/</Text>
              <Text color={CYBER_COLORS.dim}>
                {formatTemp(day.tempMin, tempUnit).padStart(4)}
              </Text>
              <Text color={CYBER_COLORS.dim}> 💧</Text>
              <Text
                color={
                  day.precipitationProbability > 50
                    ? CYBER_COLORS.neonCyan
                    : CYBER_COLORS.dim
                }
              >
                {`${day.precipitationProbability}%`.padStart(4)}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Location list for watchlist
function LocationList({
  locations,
  selectedIndex,
  currentLocation,
  maxHeight,
}: {
  locations: GeoLocation[];
  selectedIndex: number;
  currentLocation: GeoLocation | null;
  maxHeight: number;
}) {
  if (locations.length === 0) {
    return <Text color={CYBER_COLORS.dim}>No saved locations</Text>;
  }

  const visibleCount = Math.min(locations.length, maxHeight - 2);
  const halfVisible = Math.floor(visibleCount / 2);
  let startIndex = Math.max(0, selectedIndex - halfVisible);
  const endIndex = Math.min(locations.length, startIndex + visibleCount);
  if (endIndex === locations.length) {
    startIndex = Math.max(0, locations.length - visibleCount);
  }

  const visibleLocations = locations.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column">
      {visibleLocations.map((loc, i) => {
        const actualIndex = startIndex + i;
        const isSelected = actualIndex === selectedIndex;
        const isCurrent = currentLocation?.id === loc.id;

        return (
          <Box key={loc.id}>
            <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
              {isSelected ? "▶ " : "  "}
            </Text>
            <Text color={isCurrent ? CYBER_COLORS.neonGreen : CYBER_COLORS.dim}>
              {isCurrent ? "●" : " "}
            </Text>
            <Text
              color={isSelected ? CYBER_COLORS.neonCyan : "white"}
              bold={isSelected}
            >
              {" "}
              {loc.name}
            </Text>
            <Text color={CYBER_COLORS.dim}>, {loc.admin1 || loc.country}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

export function WeatherCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "weather",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState(
    initialConfig?.searchQuery || "",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(!initialConfig?.location);
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);

  // Weather data
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(
    initialConfig?.location || null,
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Watchlist
  const [watchlist, setWatchlist] = useState<GeoLocation[]>(
    initialConfig?.watchlist || [],
  );
  const [selectedWatchlistIndex, setSelectedWatchlistIndex] = useState(0);

  // Settings
  const [tempUnit, setTempUnit] = useState<"C" | "F">(
    initialConfig?.tempUnit || "C",
  );

  // Auto-refresh
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInterval = (initialConfig?.refreshInterval || 300) * 1000;

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

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

  // Search for locations
  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const results = await weatherService.searchLocations(query.trim(), 5);
      setSearchResults(results);

      // If only one result, select it automatically
      if (results.length === 1 && results[0]) {
        setCurrentLocation(results[0]);
        setSearchMode(false);
      }
    } catch (err) {
      setError(`Search failed: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch weather for current location
  const fetchWeather = useCallback(async () => {
    if (!currentLocation) return;

    setIsRefreshing(true);
    try {
      const data = await weatherService.getWeather(currentLocation);
      setWeather(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(`Weather fetch failed: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentLocation]);

  // Initial fetch
  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    } else if (initialConfig?.searchQuery) {
      doSearch(initialConfig.searchQuery);
    }
  }, []);

  // Fetch weather when location changes
  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    }
  }, [currentLocation, fetchWeather]);

  // Auto-refresh
  useEffect(() => {
    if (!currentLocation || searchMode) return;

    const interval = setInterval(() => {
      fetchWeather();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [currentLocation, searchMode, refreshInterval, fetchWeather]);

  // Keyboard input
  useInput((input, key) => {
    if (searchMode) {
      if (key.escape) {
        if (weather) {
          setSearchMode(false);
          setSearchResults([]);
        } else {
          exit();
        }
      } else if (key.downArrow && searchResults.length > 0) {
        setSelectedWatchlistIndex((i) =>
          Math.min(searchResults.length - 1, i + 1),
        );
      } else if (key.upArrow && searchResults.length > 0) {
        setSelectedWatchlistIndex((i) => Math.max(0, i - 1));
      } else if (key.return && searchResults.length > 0) {
        const selected = searchResults[selectedWatchlistIndex];
        if (selected) {
          setCurrentLocation(selected);
          setSearchMode(false);
          setSearchResults([]);
        }
      }
      return;
    }

    // Navigation mode
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    if (input === "/") {
      setSearchMode(true);
      setSelectedWatchlistIndex(0);
    } else if (input === "r") {
      fetchWeather();
    } else if (input === "u") {
      setTempUnit((u) => (u === "C" ? "F" : "C"));
    } else if (input === "a" && currentLocation) {
      // Add to watchlist
      if (!watchlist.find((l) => l.id === currentLocation.id)) {
        setWatchlist((prev) => [...prev, currentLocation]);
      }
    } else if (input === "d" && watchlist.length > 0) {
      // Remove from watchlist
      const toRemove = watchlist[selectedWatchlistIndex];
      if (toRemove) {
        setWatchlist((prev) => prev.filter((l) => l.id !== toRemove.id));
        setSelectedWatchlistIndex((i) => Math.max(0, i - 1));
      }
    } else if (key.upArrow) {
      setSelectedWatchlistIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedWatchlistIndex((i) => Math.min(watchlist.length - 1, i + 1));
    } else if (key.return && watchlist.length > 0) {
      const selected = watchlist[selectedWatchlistIndex];
      if (selected) {
        setCurrentLocation(selected);
      }
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  const leftPanelWidth = Math.max(35, Math.floor(termWidth * 0.4));
  const rightPanelWidth = termWidth - leftPanelWidth - 4;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        marginBottom={1}
        borderStyle="single"
        borderColor={CYBER_COLORS.neonMagenta}
      >
        <Text color={CYBER_COLORS.neonCyan} bold>
          {"// WEATHER //"}
        </Text>
        {isRefreshing && (
          <Text color={CYBER_COLORS.neonGreen}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>

      {/* Search bar */}
      {searchMode ? (
        <Box flexDirection="column" marginBottom={1} paddingX={1}>
          <Box>
            <Text color={CYBER_COLORS.neonCyan}>Search city: </Text>
            <TextInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => doSearch(searchQuery)}
              placeholder="Enter city name..."
            />
            {isSearching && (
              <Text color={CYBER_COLORS.neonGreen}>
                {" "}
                <Spinner type="dots" />
              </Text>
            )}
          </Box>

          {/* Search results */}
          {searchResults.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color={CYBER_COLORS.dim}>Select a location:</Text>
              {searchResults.map((loc, i) => (
                <Box key={loc.id}>
                  <Text
                    color={
                      i === selectedWatchlistIndex
                        ? CYBER_COLORS.neonCyan
                        : CYBER_COLORS.dim
                    }
                  >
                    {i === selectedWatchlistIndex ? "▶ " : "  "}
                  </Text>
                  <Text
                    color={
                      i === selectedWatchlistIndex
                        ? CYBER_COLORS.neonCyan
                        : "white"
                    }
                    bold={i === selectedWatchlistIndex}
                  >
                    {loc.name}
                  </Text>
                  <Text color={CYBER_COLORS.dim}>
                    , {loc.admin1 || ""} {loc.country}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Box marginBottom={1} paddingX={1}>
          <Text color={CYBER_COLORS.dim}>
            {currentLocation
              ? `${currentLocation.name}, ${currentLocation.admin1 || currentLocation.country}`
              : "No location selected"}
            {lastRefresh && (
              <Text> • Updated {lastRefresh.toLocaleTimeString()}</Text>
            )}
            <Text> • Unit: {tempUnit}</Text>
          </Text>
        </Box>
      )}

      {/* Error display */}
      {error && (
        <Box paddingX={1} marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left panel - Current weather & Forecast */}
        <Box flexDirection="column" width={leftPanelWidth}>
          <CurrentWeatherPanel
            weather={weather}
            tempUnit={tempUnit}
            width={leftPanelWidth - 2}
          />
          <Box marginTop={1}>
            <ForecastPanel
              weather={weather}
              tempUnit={tempUnit}
              width={leftPanelWidth - 2}
            />
          </Box>
        </Box>

        {/* Right panel - Watchlist */}
        <Box
          flexDirection="column"
          width={rightPanelWidth}
          borderStyle="single"
          borderColor={CYBER_COLORS.dim}
          paddingX={1}
          marginLeft={1}
        >
          <Box marginBottom={1}>
            <Text color={CYBER_COLORS.neonMagenta} bold>
              {"[ LOCATIONS ]"}
            </Text>
            <Text color={CYBER_COLORS.dim}> ({watchlist.length})</Text>
          </Box>
          <LocationList
            locations={watchlist}
            selectedIndex={selectedWatchlistIndex}
            currentLocation={currentLocation}
            maxHeight={contentHeight - 4}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          {searchMode
            ? "↑↓ select • Enter confirm • Esc cancel"
            : "/ search • ↑↓ locations • Enter select • a add • d remove • u °C/°F • r refresh • q quit"}
        </Text>
      </Box>
    </Box>
  );
}
