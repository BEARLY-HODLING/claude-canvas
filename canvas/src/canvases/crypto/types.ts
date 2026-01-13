// Crypto Canvas - Type Definitions

import type { CoinData } from "../../services/crypto";

/**
 * Coin in watchlist
 */
export interface WatchlistCoin {
  id: string;
  symbol: string;
  name: string;
}

/**
 * Crypto Canvas Configuration
 */
export interface CryptoConfig {
  mode?: "crypto";
  title?: string;
  watchlist?: WatchlistCoin[]; // Coins to track
  refreshInterval?: number; // Seconds (default: 30)
  showSparkline?: boolean; // Show 7-day sparkline
  showMarketCap?: boolean; // Show market cap column
  showVolume?: boolean; // Show 24h volume column
}

/**
 * Crypto Canvas Result
 */
export interface CryptoResult {
  action: "view" | "add" | "remove" | "close";
  coin?: WatchlistCoin;
  data?: CoinData;
}

// Shared cyberpunk color palette
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;
