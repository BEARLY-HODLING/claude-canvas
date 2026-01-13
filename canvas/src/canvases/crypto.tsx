// Crypto Canvas - Real-time cryptocurrency price tracker

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type CryptoConfig,
  type WatchlistCoin,
  CYBER_COLORS,
} from "./crypto/types";
import { HelpOverlay, CRYPTO_BINDINGS } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  cryptoService,
  formatPrice,
  formatChange,
  formatMarketCap,
  miniSparkline,
  getChangeColor,
  DEFAULT_COINS,
  POPULAR_COINS,
  type CoinData,
} from "../services/crypto";

interface Props {
  id: string;
  config?: CryptoConfig;
  socketPath?: string;
  scenario?: string;
}

// Coin row component
function CoinRow({
  coin,
  isSelected,
  showSparkline,
  showMarketCap,
  width,
}: {
  coin: CoinData;
  isSelected: boolean;
  showSparkline: boolean;
  showMarketCap: boolean;
  width: number;
}) {
  const changeColor = getChangeColor(coin.priceChangePercent24h);
  const sparklineWidth = Math.min(20, Math.floor(width * 0.15));

  return (
    <Box>
      {/* Selection indicator */}
      <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
        {isSelected ? "▶ " : "  "}
      </Text>

      {/* Symbol */}
      <Text color={isSelected ? CYBER_COLORS.neonCyan : "white"} bold>
        {coin.symbol.padEnd(6)}
      </Text>

      {/* Name */}
      <Text color={CYBER_COLORS.dim}>{coin.name.slice(0, 12).padEnd(13)}</Text>

      {/* Price */}
      <Text color={isSelected ? CYBER_COLORS.neonYellow : "white"}>
        {formatPrice(coin.currentPrice).padStart(12)}
      </Text>

      {/* 24h Change */}
      <Text color={changeColor}>
        {" "}
        {formatChange(coin.priceChangePercent24h).padStart(8)}
      </Text>

      {/* Market Cap (optional) */}
      {showMarketCap && (
        <Text color={CYBER_COLORS.dim}>
          {" "}
          {formatMarketCap(coin.marketCap).padStart(10)}
        </Text>
      )}

      {/* Sparkline (optional) */}
      {showSparkline && coin.sparkline7d.length > 0 && (
        <Text color={changeColor}>
          {" "}
          {miniSparkline(coin.sparkline7d, sparklineWidth)}
        </Text>
      )}
    </Box>
  );
}

// Search results panel
function SearchResults({
  results,
  selectedIndex,
  onSelect,
}: {
  results: Array<{ id: string; symbol: string; name: string }>;
  selectedIndex: number;
  onSelect: (coin: WatchlistCoin) => void;
}) {
  if (results.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color={CYBER_COLORS.dim}>No results found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={CYBER_COLORS.dim} italic>
        Select coin to add:
      </Text>
      {results.map((coin, i) => (
        <Box key={coin.id}>
          <Text
            color={
              i === selectedIndex ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim
            }
          >
            {i === selectedIndex ? "▶ " : "  "}
          </Text>
          <Text
            color={i === selectedIndex ? CYBER_COLORS.neonCyan : "white"}
            bold={i === selectedIndex}
          >
            {coin.symbol.padEnd(6)}
          </Text>
          <Text color={CYBER_COLORS.dim}>{coin.name}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Coin details panel
function CoinDetailsPanel({
  coin,
  width,
}: {
  coin: CoinData | null;
  width: number;
}) {
  if (!coin) {
    return (
      <Box
        flexDirection="column"
        width={width}
        borderStyle="single"
        borderColor={CYBER_COLORS.dim}
        paddingX={1}
      >
        <Text color={CYBER_COLORS.dim}>Select a coin to view details</Text>
      </Box>
    );
  }

  const changeColor = getChangeColor(coin.priceChangePercent24h);

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={CYBER_COLORS.dim}
      paddingX={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={CYBER_COLORS.neonMagenta} bold>
          {"[ "}
          {coin.symbol}
          {" - "}
          {coin.name}
          {" ]"}
        </Text>
      </Box>

      {/* Current price */}
      <Box>
        <Text color={CYBER_COLORS.dim}>Price: </Text>
        <Text color={CYBER_COLORS.neonYellow} bold>
          {formatPrice(coin.currentPrice)}
        </Text>
      </Box>

      {/* 24h Change */}
      <Box>
        <Text color={CYBER_COLORS.dim}>24h: </Text>
        <Text color={changeColor} bold>
          {formatChange(coin.priceChangePercent24h)}
        </Text>
        <Text color={changeColor}>
          {" ("}
          {coin.priceChange24h >= 0 ? "+" : ""}
          {formatPrice(Math.abs(coin.priceChange24h))}
          {")"}
        </Text>
      </Box>

      {/* High/Low */}
      <Box marginTop={1}>
        <Text color={CYBER_COLORS.dim}>24h High: </Text>
        <Text color={CYBER_COLORS.neonGreen}>{formatPrice(coin.high24h)}</Text>
      </Box>
      <Box>
        <Text color={CYBER_COLORS.dim}>24h Low: </Text>
        <Text color={CYBER_COLORS.neonRed}>{formatPrice(coin.low24h)}</Text>
      </Box>

      {/* Market cap & Volume */}
      <Box marginTop={1}>
        <Text color={CYBER_COLORS.dim}>Mkt Cap: </Text>
        <Text color="white">{formatMarketCap(coin.marketCap)}</Text>
      </Box>
      <Box>
        <Text color={CYBER_COLORS.dim}>Volume: </Text>
        <Text color="white">{formatMarketCap(coin.volume24h)}</Text>
      </Box>

      {/* 7-day sparkline */}
      {coin.sparkline7d.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color={CYBER_COLORS.dim}>7-Day Trend:</Text>
          <Text color={changeColor}>
            {miniSparkline(coin.sparkline7d, Math.min(width - 4, 40))}
          </Text>
        </Box>
      )}

      {/* Last updated */}
      <Box marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          Updated: {coin.lastUpdated.toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
}

export function CryptoCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "crypto",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistCoin[]>(
    initialConfig?.watchlist || DEFAULT_COINS,
  );
  const [coinData, setCoinData] = useState<CoinData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; symbol: string; name: string }>
  >([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Settings
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    initialConfig?.refreshInterval || 30,
  );
  const [showSparkline, setShowSparkline] = useState(
    initialConfig?.showSparkline !== false,
  );
  const [showMarketCap, setShowMarketCap] = useState(
    initialConfig?.showMarketCap !== false,
  );
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
    "crypto",
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

  // Fetch coin data
  const fetchCoinData = useCallback(async () => {
    if (watchlist.length === 0) {
      setCoinData([]);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const ids = watchlist.map((c) => c.id);
      const data = await cryptoService.getMarketData(ids);

      // Sort data to match watchlist order
      const sortedData = ids
        .map((id) => data.find((d) => d.id === id))
        .filter((d): d is CoinData => d !== undefined);

      setCoinData(sortedData);
    } catch (err) {
      setError(`Failed to fetch prices: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [watchlist]);

  // Search for coins
  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(POPULAR_COINS.slice(0, 8));
      return;
    }

    setIsSearching(true);
    try {
      const results = await cryptoService.searchCoins(query.trim());
      setSearchResults(results);
      setSearchSelectedIndex(0);
    } catch (err) {
      setError(`Search failed: ${(err as Error).message}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Add coin to watchlist
  const addCoin = useCallback(
    (coin: { id: string; symbol: string; name: string }) => {
      if (!watchlist.find((c) => c.id === coin.id)) {
        setWatchlist((prev) => [
          ...prev,
          { id: coin.id, symbol: coin.symbol, name: coin.name },
        ]);
      }
      setSearchMode(false);
      setSearchQuery("");
      setSearchResults([]);
    },
    [watchlist],
  );

  // Remove coin from watchlist
  const removeCoin = useCallback(() => {
    if (watchlist.length > 0 && selectedIndex < watchlist.length) {
      setWatchlist((prev) => prev.filter((_, i) => i !== selectedIndex));
      setSelectedIndex((i) => Math.max(0, Math.min(i, watchlist.length - 2)));
    }
  }, [watchlist, selectedIndex]);

  // Initial fetch
  useEffect(() => {
    fetchCoinData();
  }, []);

  // Fetch when watchlist changes
  useEffect(() => {
    fetchCoinData();
  }, [watchlist, fetchCoinData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchCoinData, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [refreshIntervalSec, fetchCoinData]);

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

    // Search mode
    if (searchMode) {
      if (key.escape) {
        setSearchMode(false);
        setSearchQuery("");
        setSearchResults([]);
      } else if (key.downArrow && searchResults.length > 0) {
        setSearchSelectedIndex((i) =>
          Math.min(searchResults.length - 1, i + 1),
        );
      } else if (key.upArrow && searchResults.length > 0) {
        setSearchSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.return && searchResults.length > 0) {
        const selected = searchResults[searchSelectedIndex];
        if (selected) {
          addCoin(selected);
        }
      }
      return;
    }

    // Normal mode
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    if (input === "/" || input === "a") {
      setSearchMode(true);
      setSearchResults(POPULAR_COINS.slice(0, 8));
      setSearchSelectedIndex(0);
    } else if (input === "d") {
      removeCoin();
    } else if (input === "r") {
      fetchCoinData();
    } else if (input === "s") {
      setShowSparkline((s) => !s);
    } else if (input === "m") {
      setShowMarketCap((s) => !s);
    } else if (input === "+") {
      setRefreshIntervalSec((s) => Math.min(300, s + 10));
    } else if (input === "-") {
      setRefreshIntervalSec((s) => Math.max(10, s - 10));
    } else if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(coinData.length - 1, i + 1));
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Two-column layout
  const leftWidth = Math.floor(termWidth * 0.6);
  const rightWidth = termWidth - leftWidth - 2;

  const selectedCoin = coinData[selectedIndex] || null;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={CYBER_COLORS.neonMagenta}
      >
        <Text color={CYBER_COLORS.neonCyan} bold>
          {"// CRYPTO TRACKER //"}
        </Text>
        <Box>
          {isRefreshing ? (
            <Text color={CYBER_COLORS.neonGreen}>
              <Spinner type="dots" /> Updating...
            </Text>
          ) : (
            <Text color={CYBER_COLORS.dim}>
              {coinData.length} coins • {refreshIntervalSec}s refresh
            </Text>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1}>
          <Text color={CYBER_COLORS.neonRed}>Error: {error}</Text>
        </Box>
      )}

      {/* Search bar */}
      {searchMode && (
        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Box>
            <Text color={CYBER_COLORS.neonCyan}>Search coin: </Text>
            <TextInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                doSearch(value);
              }}
              placeholder="BTC, ETH, Solana..."
            />
            {isSearching && (
              <Text color={CYBER_COLORS.neonGreen}>
                {" "}
                <Spinner type="dots" />
              </Text>
            )}
          </Box>
          <SearchResults
            results={searchResults}
            selectedIndex={searchSelectedIndex}
            onSelect={addCoin}
          />
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left panel - Coin list */}
        <Box flexDirection="column" width={leftWidth}>
          <Box marginBottom={1} paddingX={1}>
            <Text color={CYBER_COLORS.neonMagenta} bold>
              {"[ WATCHLIST ]"}
            </Text>
          </Box>

          {/* Column headers */}
          <Box paddingX={1}>
            <Text color={CYBER_COLORS.dim}>
              {"  "}
              {"COIN".padEnd(6)}
              {"NAME".padEnd(13)}
              {"PRICE".padStart(12)}
              {"24H CHG".padStart(9)}
              {showMarketCap && "MKT CAP".padStart(11)}
              {showSparkline && " 7D TREND"}
            </Text>
          </Box>

          {/* Coin list */}
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={CYBER_COLORS.dim}
            paddingX={1}
            height={contentHeight - 4}
          >
            {coinData.length === 0 ? (
              <Text color={CYBER_COLORS.dim}>
                No coins in watchlist. Press 'a' to add.
              </Text>
            ) : (
              coinData.map((coin, i) => (
                <CoinRow
                  key={coin.id}
                  coin={coin}
                  isSelected={i === selectedIndex}
                  showSparkline={showSparkline}
                  showMarketCap={showMarketCap}
                  width={leftWidth - 4}
                />
              ))
            )}
          </Box>
        </Box>

        {/* Right panel - Coin details */}
        <Box flexDirection="column" width={rightWidth} marginLeft={1}>
          <Box marginBottom={1}>
            <Text color={CYBER_COLORS.neonMagenta} bold>
              {"[ DETAILS ]"}
            </Text>
          </Box>
          <CoinDetailsPanel coin={selectedCoin} width={rightWidth - 1} />
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          {searchMode
            ? "↑↓ select • Enter add • Esc cancel"
            : "Tab switch • ? help • a add • d remove • ↑↓ navigate • s sparkline • +/- interval • q quit"}
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
            title="CRYPTO TRACKER"
            bindings={CRYPTO_BINDINGS}
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
            currentCanvas="crypto"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
