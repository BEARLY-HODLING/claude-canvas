// Flight Tracker Canvas - Real-time flight tracking with OpenSky API

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type TrackedFlight,
  type FlightConfig,
  CYBER_COLORS,
} from "./flight/types";
import {
  flightService,
  formatFlightInfo,
  getStatusColor,
} from "../services/flight-service";

interface Props {
  id: string;
  config?: FlightConfig;
  socketPath?: string;
  scenario?: string;
}

type SearchType = "callsign" | "route";

import {
  generateCenteredMap,
  findNearestAirport,
  getDirectionArrow,
} from "../components/world-map";

// ASCII mini-map component with improved world map
function MiniMap({
  flight,
  width,
  height,
}: {
  flight: TrackedFlight | null;
  width: number;
  height: number;
}) {
  if (!flight?.latitude || !flight?.longitude) {
    return (
      <Box
        flexDirection="column"
        width={width}
        height={height}
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
      >
        <Text color={CYBER_COLORS.dim}>No position data</Text>
      </Box>
    );
  }

  const lat = flight.latitude;
  const lon = flight.longitude;
  const mapWidth = width - 2;
  const mapHeight = height - 4;

  // Generate map with flight position
  const grid = generateCenteredMap(
    lat,
    lon,
    mapWidth,
    mapHeight,
    [{ lat, lon, heading: flight.heading, callsign: flight.callsign }],
    true, // show airports
  );

  // Find nearest airport for context
  const nearestAirport = findNearestAirport(lat, lon);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={0}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ WORLD MAP ]"}
        </Text>
        {nearestAirport && (
          <Text color={CYBER_COLORS.dim}> near {nearestAirport.code}</Text>
        )}
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
      >
        {grid.map((row, i) => (
          <Text key={i}>
            {row.map((char, j) => {
              // Flight arrows - bright green
              if ("↑↗→↘↓↙←↖✈".includes(char)) {
                return (
                  <Text key={j} color={CYBER_COLORS.neonGreen} bold>
                    {char}
                  </Text>
                );
              }
              // Airports - yellow
              if (char === "◉") {
                return (
                  <Text key={j} color={CYBER_COLORS.neonYellow}>
                    {char}
                  </Text>
                );
              }
              // Land - dim green
              if (char === "█") {
                return (
                  <Text key={j} color="greenBright" dimColor>
                    {char}
                  </Text>
                );
              }
              // Ocean - blue
              if (char === "░") {
                return (
                  <Text key={j} color="blueBright" dimColor>
                    ·
                  </Text>
                );
              }
              return (
                <Text key={j} color={CYBER_COLORS.dim}>
                  {char}
                </Text>
              );
            })}
          </Text>
        ))}
      </Box>
      {/* Coordinates and Legend */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={CYBER_COLORS.dim}>
          {lat.toFixed(2)}°, {lon.toFixed(2)}°
        </Text>
        <Box>
          <Text color="greenBright" dimColor>
            █
          </Text>
          <Text color={CYBER_COLORS.dim}>=land </Text>
          <Text color="blueBright" dimColor>
            ·
          </Text>
          <Text color={CYBER_COLORS.dim}>=sea </Text>
          <Text color={CYBER_COLORS.neonYellow}>◉</Text>
          <Text color={CYBER_COLORS.dim}>=airport </Text>
          <Text color={CYBER_COLORS.neonGreen}>↑</Text>
          <Text color={CYBER_COLORS.dim}>=flight</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Flight info panel
function FlightInfoPanel({
  flight,
  width,
}: {
  flight: TrackedFlight | null;
  width: number;
}) {
  if (!flight) {
    return (
      <Box flexDirection="column" width={width}>
        <Text color={CYBER_COLORS.dim}>No flight selected</Text>
      </Box>
    );
  }

  const lines = formatFlightInfo(flight);
  const statusColor = getStatusColor(flight.status);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ FLIGHT INFO ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        {/* Flight number and airline */}
        <Text color={CYBER_COLORS.neonCyan} bold>
          {flight.flightNumber}
          {flight.airline && (
            <Text color={CYBER_COLORS.dim}> ({flight.airline})</Text>
          )}
        </Text>

        {/* Status */}
        <Box marginY={1}>
          <Text color={statusColor} bold>
            ● {flight.status.toUpperCase()}
          </Text>
          {flight.onGround && (
            <Text color={CYBER_COLORS.dim}> (on ground)</Text>
          )}
        </Box>

        {/* Position */}
        {flight.latitude && flight.longitude && (
          <Text>
            <Text color={CYBER_COLORS.dim}>Position: </Text>
            <Text color="white">
              {flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°
            </Text>
          </Text>
        )}

        {/* Altitude */}
        {flight.altitude !== null && (
          <Text>
            <Text color={CYBER_COLORS.dim}>Altitude: </Text>
            <Text color="white">{flight.altitude.toLocaleString()} ft</Text>
          </Text>
        )}

        {/* Speed */}
        {flight.speed !== null && (
          <Text>
            <Text color={CYBER_COLORS.dim}>Speed: </Text>
            <Text color="white">{flight.speed} kts</Text>
          </Text>
        )}

        {/* Heading */}
        {flight.heading !== null && (
          <Text>
            <Text color={CYBER_COLORS.dim}>Heading: </Text>
            <Text color="white">
              {flight.heading.toFixed(0)}° {flight.headingCardinal}
            </Text>
          </Text>
        )}

        {/* Vertical rate */}
        {flight.verticalRate !== null && flight.verticalRate !== 0 && (
          <Text>
            <Text color={CYBER_COLORS.dim}>Vertical: </Text>
            <Text color={flight.verticalRate > 0 ? "green" : "yellow"}>
              {flight.verticalRate > 0 ? "↑" : "↓"}{" "}
              {Math.abs(flight.verticalRate)} ft/min
            </Text>
          </Text>
        )}

        {/* Country and ICAO */}
        <Box marginTop={1}>
          <Text color={CYBER_COLORS.dim}>
            {flight.originCountry} • {flight.icao24}
          </Text>
        </Box>

        {/* Last update */}
        <Text color={CYBER_COLORS.dim}>
          Updated: {flight.lastContact.toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
}

// Flight list component
function FlightList({
  flights,
  selectedIndex,
  maxHeight,
  watchlist,
}: {
  flights: TrackedFlight[];
  selectedIndex: number;
  maxHeight: number;
  watchlist: Set<string>;
}) {
  if (flights.length === 0) {
    return <Text color={CYBER_COLORS.dim}>No flights found</Text>;
  }

  // Scroll window
  const visibleCount = Math.min(flights.length, maxHeight - 2);
  const halfVisible = Math.floor(visibleCount / 2);
  let startIndex = Math.max(0, selectedIndex - halfVisible);
  const endIndex = Math.min(flights.length, startIndex + visibleCount);
  if (endIndex === flights.length) {
    startIndex = Math.max(0, flights.length - visibleCount);
  }

  const visibleFlights = flights.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column">
      {visibleFlights.map((flight, i) => {
        const actualIndex = startIndex + i;
        const isSelected = actualIndex === selectedIndex;
        const isWatched = watchlist.has(flight.icao24);
        const statusColor = getStatusColor(flight.status);

        return (
          <Box key={flight.icao24}>
            <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
              {isSelected ? "▶ " : "  "}
            </Text>
            <Text
              color={isWatched ? CYBER_COLORS.neonYellow : CYBER_COLORS.dim}
            >
              {isWatched ? "★" : " "}
            </Text>
            <Text
              color={isSelected ? CYBER_COLORS.neonCyan : "white"}
              bold={isSelected}
            >
              {flight.flightNumber.padEnd(7)}
            </Text>
            <Text color={statusColor}> ● </Text>
            <Text color={CYBER_COLORS.dim}>
              {flight.altitude !== null
                ? `${Math.round(flight.altitude / 1000)}k`
                : "---"}
              ft {flight.speed !== null ? `${flight.speed}` : "---"}kts
            </Text>
          </Box>
        );
      })}
      {flights.length > visibleCount && (
        <Text color={CYBER_COLORS.dim}>
          [{startIndex + 1}-{endIndex} of {flights.length}]
        </Text>
      )}
    </Box>
  );
}

export function FlightTracker({
  id,
  config: initialConfig,
  socketPath,
  scenario = "tracker",
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
  const [searchMode, setSearchMode] = useState(
    !initialConfig?.searchQuery && !initialConfig?.route,
  );
  const [searchType, setSearchType] = useState<SearchType>(
    initialConfig?.route ? "route" : "callsign",
  );
  const [originAirport, setOriginAirport] = useState(
    initialConfig?.route?.origin || "",
  );
  const [destAirport, setDestAirport] = useState(
    initialConfig?.route?.destination || "",
  );
  const [routeInputFocus, setRouteInputFocus] = useState<"origin" | "dest">(
    "origin",
  );

  // Flight data
  const [flights, setFlights] = useState<TrackedFlight[]>(
    initialConfig?.trackedFlights || [],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Watchlist - track flights by ICAO24 address
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

  // Track previous flight statuses for change detection
  const previousStatusRef = useRef<Map<string, TrackedFlight["status"]>>(
    new Map(),
  );

  // Get displayed flights (filtered by watchlist if enabled)
  const displayedFlights = showWatchlistOnly
    ? flights.filter((f) => watchlist.has(f.icao24))
    : flights;

  // Watchlist actions
  const toggleWatchlist = useCallback((icao24: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(icao24)) {
        next.delete(icao24);
      } else {
        next.add(icao24);
      }
      return next;
    });
  }, []);

  // Auto-refresh
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    initialConfig?.refreshInterval || 10,
  );
  const refreshInterval = refreshIntervalSec * 1000;

  // Refresh interval controls (5s to 60s)
  const increaseRefreshInterval = useCallback(() => {
    setRefreshIntervalSec((prev) => Math.min(60, prev + 5));
  }, []);

  const decreaseRefreshInterval = useCallback(() => {
    setRefreshIntervalSec((prev) => Math.max(5, prev - 5));
  }, []);

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Check for status changes in watched flights and send IPC alerts
  const checkStatusChanges = useCallback(
    (newFlights: TrackedFlight[]) => {
      const alerts: Array<{
        flight: TrackedFlight;
        oldStatus: TrackedFlight["status"];
        newStatus: TrackedFlight["status"];
      }> = [];

      for (const flight of newFlights) {
        // Only check watched flights
        if (!watchlist.has(flight.icao24)) continue;

        const previousStatus = previousStatusRef.current.get(flight.icao24);
        if (previousStatus && previousStatus !== flight.status) {
          alerts.push({
            flight,
            oldStatus: previousStatus,
            newStatus: flight.status,
          });
        }
        // Update tracked status
        previousStatusRef.current.set(flight.icao24, flight.status);
      }

      // Send IPC alerts for status changes
      for (const alert of alerts) {
        const direction =
          alert.newStatus === "airborne" ? "TAKEOFF" : "LANDING";
        ipc.sendAlert({
          type: "flight_status_change",
          message: `${alert.flight.flightNumber} ${direction}: ${alert.oldStatus} → ${alert.newStatus}`,
          data: {
            icao24: alert.flight.icao24,
            flightNumber: alert.flight.flightNumber,
            oldStatus: alert.oldStatus,
            newStatus: alert.newStatus,
            position:
              alert.flight.latitude && alert.flight.longitude
                ? { lat: alert.flight.latitude, lon: alert.flight.longitude }
                : null,
          },
        });
      }

      return alerts;
    },
    [watchlist, ipc],
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

  // Search function (callsign)
  const doCallsignSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const results = await flightService.searchFlights(query.trim());
      setFlights(results);
      setSelectedIndex(0);
      setLastRefresh(new Date());
      setSearchMode(false);
    } catch (err) {
      setError(`Search failed: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Route search function
  const doRouteSearch = useCallback(async (origin: string, dest: string) => {
    if (!origin.trim() || !dest.trim()) {
      setError("Both origin and destination are required");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await flightService.searchByRoute(
        origin.trim().toUpperCase(),
        dest.trim().toUpperCase(),
      );
      setFlights(results);
      setSelectedIndex(0);
      setLastRefresh(new Date());
      setSearchMode(false);
    } catch (err) {
      setError(`Route search failed: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Initial search on mount
  useEffect(() => {
    if (initialConfig?.searchQuery) {
      doCallsignSearch(initialConfig.searchQuery);
    } else if (initialConfig?.route) {
      doRouteSearch(
        initialConfig.route.origin,
        initialConfig.route.destination,
      );
    } else if (initialConfig?.nearLocation) {
      const { latitude, longitude, radiusDegrees } = initialConfig.nearLocation;
      flightService
        .getFlightsNear(latitude, longitude, radiusDegrees || 2)
        .then((results) => {
          setFlights(results);
          setLastRefresh(new Date());
        })
        .catch((err) => setError(err.message));
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (flights.length === 0 || searchMode) return;

    const interval = setInterval(async () => {
      if (isRefreshing) return;

      setIsRefreshing(true);
      try {
        // Refresh based on search type
        let results: TrackedFlight[] = [];
        if (searchType === "route" && originAirport && destAirport) {
          results = await flightService.searchByRoute(
            originAirport,
            destAirport,
          );
        } else if (searchQuery) {
          results = await flightService.searchFlights(searchQuery);
        }

        if (results.length > 0) {
          // Check for status changes in watched flights
          checkStatusChanges(results);
          setFlights(results);
          setLastRefresh(new Date());
        }
      } catch (err) {
        // Silently fail on refresh errors
      } finally {
        setIsRefreshing(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    flights.length,
    searchQuery,
    searchMode,
    refreshInterval,
    isRefreshing,
    searchType,
    originAirport,
    destAirport,
    checkStatusChanges,
  ]);

  // Keyboard input
  useInput((input, key) => {
    if (searchMode) {
      // In search mode, TextInput handles most input
      if (key.escape) {
        if (flights.length > 0) {
          setSearchMode(false);
        } else {
          exit();
        }
      } else if (key.tab && searchType === "route") {
        // Tab switches between origin and dest in route mode
        setRouteInputFocus((f) => (f === "origin" ? "dest" : "origin"));
      } else if (input === "1" && key.ctrl) {
        // Ctrl+1 switches to callsign search
        setSearchType("callsign");
      } else if (input === "2" && key.ctrl) {
        // Ctrl+2 switches to route search
        setSearchType("route");
      }
      return;
    }

    // Navigation mode
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(displayedFlights.length - 1, i + 1));
    } else if (input === "/") {
      setSearchType("callsign");
      setSearchMode(true);
    } else if (input === "t") {
      // Route search shortcut
      setSearchType("route");
      setRouteInputFocus("origin");
      setSearchMode(true);
    } else if (input === "r") {
      // Manual refresh
      if (searchType === "route" && originAirport && destAirport) {
        doRouteSearch(originAirport, destAirport);
      } else if (searchQuery) {
        doCallsignSearch(searchQuery);
      }
    } else if (input === "w") {
      // Toggle watchlist for selected flight
      const flight = displayedFlights[selectedIndex];
      if (flight) {
        toggleWatchlist(flight.icao24);
      }
    } else if (input === "W") {
      // Toggle watchlist-only view
      setShowWatchlistOnly((prev) => !prev);
      setSelectedIndex(0);
    } else if (input === "+" || input === "=") {
      // Increase refresh interval
      increaseRefreshInterval();
    } else if (input === "-" || input === "_") {
      // Decrease refresh interval
      decreaseRefreshInterval();
    } else if (key.return && displayedFlights.length > 0) {
      const selectedFlight = displayedFlights[selectedIndex];
      ipc.sendSelected({ selectedFlight, action: "view" });
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  const leftPanelWidth = Math.max(28, Math.floor(termWidth * 0.35));
  const rightPanelWidth = termWidth - leftPanelWidth - 4;

  const selectedFlight = displayedFlights[selectedIndex] || null;

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
          {"// FLIGHT_TRACKER //"}
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
          {/* Search type tabs */}
          <Box marginBottom={1}>
            <Text
              color={
                searchType === "callsign"
                  ? CYBER_COLORS.neonCyan
                  : CYBER_COLORS.dim
              }
              bold={searchType === "callsign"}
            >
              [1] Callsign
            </Text>
            <Text color={CYBER_COLORS.dim}> | </Text>
            <Text
              color={
                searchType === "route"
                  ? CYBER_COLORS.neonCyan
                  : CYBER_COLORS.dim
              }
              bold={searchType === "route"}
            >
              [2] Route
            </Text>
          </Box>

          {/* Callsign search input */}
          {searchType === "callsign" ? (
            <Box>
              <Text color={CYBER_COLORS.neonCyan}>Search: </Text>
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={() => doCallsignSearch(searchQuery)}
                placeholder="Enter callsign (e.g., UAL, DAL123, SWA)"
              />
            </Box>
          ) : (
            /* Route search inputs */
            <Box>
              <Text color={CYBER_COLORS.neonCyan}>Route: </Text>
              <Text
                color={
                  routeInputFocus === "origin" ? "white" : CYBER_COLORS.dim
                }
              >
                From:{" "}
              </Text>
              {routeInputFocus === "origin" ? (
                <TextInput
                  value={originAirport}
                  onChange={setOriginAirport}
                  onSubmit={() => {
                    if (destAirport) {
                      doRouteSearch(originAirport, destAirport);
                    } else {
                      setRouteInputFocus("dest");
                    }
                  }}
                  placeholder="SFO"
                />
              ) : (
                <Text color={CYBER_COLORS.dim}>{originAirport || "___"}</Text>
              )}
              <Text color={CYBER_COLORS.dim}> → </Text>
              <Text
                color={routeInputFocus === "dest" ? "white" : CYBER_COLORS.dim}
              >
                To:{" "}
              </Text>
              {routeInputFocus === "dest" ? (
                <TextInput
                  value={destAirport}
                  onChange={setDestAirport}
                  onSubmit={() => doRouteSearch(originAirport, destAirport)}
                  placeholder="LAX"
                />
              ) : (
                <Text color={CYBER_COLORS.dim}>{destAirport || "___"}</Text>
              )}
            </Box>
          )}

          {isSearching && (
            <Box marginTop={1}>
              <Text color={CYBER_COLORS.neonGreen}>
                <Spinner type="dots" /> Searching...
              </Text>
            </Box>
          )}
        </Box>
      ) : (
        <Box marginBottom={1} paddingX={1}>
          <Text color={CYBER_COLORS.dim}>
            {searchType === "route" && originAirport && destAirport
              ? `Route ${originAirport} → ${destAirport}`
              : searchQuery
                ? `Results for "${searchQuery}"`
                : "Live Flights"}{" "}
            • {displayedFlights.length} found • Refresh: {refreshIntervalSec}s
            {lastRefresh && (
              <Text> • Updated {lastRefresh.toLocaleTimeString()}</Text>
            )}
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
        {/* Left panel - Flight list */}
        <Box
          flexDirection="column"
          width={leftPanelWidth}
          borderStyle="single"
          borderColor={CYBER_COLORS.dim}
          paddingX={1}
        >
          <Box marginBottom={1}>
            <Text color={CYBER_COLORS.neonMagenta} bold>
              {showWatchlistOnly ? "[ WATCHLIST ]" : "[ FLIGHTS ]"}
            </Text>
            {watchlist.size > 0 && !showWatchlistOnly && (
              <Text color={CYBER_COLORS.neonYellow}> ★{watchlist.size}</Text>
            )}
          </Box>
          <FlightList
            flights={displayedFlights}
            selectedIndex={selectedIndex}
            maxHeight={contentHeight - 4}
            watchlist={watchlist}
          />
        </Box>

        {/* Right panel - Details */}
        <Box flexDirection="column" width={rightPanelWidth} paddingLeft={1}>
          <FlightInfoPanel
            flight={selectedFlight}
            width={rightPanelWidth - 2}
          />
          <Box marginTop={1}>
            <MiniMap
              flight={selectedFlight}
              width={rightPanelWidth - 2}
              height={Math.min(12, Math.floor(contentHeight * 0.4))}
            />
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          {searchMode
            ? searchType === "route"
              ? "Tab: switch field • Enter: submit • Esc: cancel • 1/2: switch mode"
              : "Enter: submit • Esc: cancel • 1: callsign • 2: route"
            : `↑↓ nav • /t search • w★ watch • +/- interval • r now • q quit`}
        </Text>
      </Box>
    </Box>
  );
}
