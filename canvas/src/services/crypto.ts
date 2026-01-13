// Crypto Service - CoinGecko API integration
// Documentation: https://www.coingecko.com/en/api/documentation
// Free tier: 10-30 calls/minute, no API key required

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

/**
 * Coin data from CoinGecko
 */
export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number; // USD
  priceChange24h: number; // USD
  priceChangePercent24h: number; // %
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  sparkline7d: number[]; // 7-day price history
  lastUpdated: Date;
}

/**
 * Simple price response
 */
export interface PriceData {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
  };
}

/**
 * Market chart data (historical)
 */
export interface ChartData {
  prices: [number, number][]; // [timestamp, price]
  marketCaps: [number, number][];
  volumes: [number, number][];
}

/**
 * Default coins to track
 */
export const DEFAULT_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

/**
 * Popular coins list for searching
 */
export const POPULAR_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "polygon", symbol: "MATIC", name: "Polygon" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos" },
];

/**
 * Crypto Service
 */
export class CryptoService {
  private cache: Map<string, { data: CoinData[]; expiry: number }> = new Map();
  private priceCache: Map<string, { data: PriceData; expiry: number }> =
    new Map();
  private cacheTimeout = 30 * 1000; // 30 seconds (API rate limit friendly)

  /**
   * Get simple prices for multiple coins
   * Uses: /simple/price endpoint
   */
  async getPrices(
    coinIds: string[],
    includeChange: boolean = true,
  ): Promise<PriceData> {
    const cacheKey = coinIds.sort().join(",");
    const cached = this.priceCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const params = new URLSearchParams({
      ids: coinIds.join(","),
      vs_currencies: "usd",
      include_24hr_change: includeChange.toString(),
      include_market_cap: "true",
      include_24hr_vol: "true",
    });

    const url = `${COINGECKO_API_URL}/simple/price?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = (await response.json()) as PriceData;

    this.priceCache.set(cacheKey, {
      data,
      expiry: Date.now() + this.cacheTimeout,
    });

    return data;
  }

  /**
   * Get detailed market data for multiple coins
   * Uses: /coins/markets endpoint
   */
  async getMarketData(coinIds: string[]): Promise<CoinData[]> {
    const cacheKey = `market:${coinIds.sort().join(",")}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const params = new URLSearchParams({
      vs_currency: "usd",
      ids: coinIds.join(","),
      order: "market_cap_desc",
      per_page: "100",
      page: "1",
      sparkline: "true",
      price_change_percentage: "24h",
    });

    const url = `${COINGECKO_API_URL}/coins/markets?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const rawData = (await response.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      market_cap: number;
      total_volume: number;
      high_24h: number;
      low_24h: number;
      sparkline_in_7d?: { price: number[] };
      last_updated: string;
    }>;

    const data: CoinData[] = rawData.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      currentPrice: coin.current_price,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercent24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      sparkline7d: coin.sparkline_in_7d?.price || [],
      lastUpdated: new Date(coin.last_updated),
    }));

    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + this.cacheTimeout,
    });

    return data;
  }

  /**
   * Get historical chart data for a coin
   * Uses: /coins/{id}/market_chart endpoint
   */
  async getChartData(
    coinId: string,
    days: number = 1,
  ): Promise<{ prices: number[]; timestamps: number[] }> {
    const params = new URLSearchParams({
      vs_currency: "usd",
      days: days.toString(),
    });

    const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = (await response.json()) as ChartData;

    return {
      timestamps: data.prices.map(([ts]) => ts),
      prices: data.prices.map(([, price]) => price),
    };
  }

  /**
   * Search for coins by name or symbol
   */
  async searchCoins(
    query: string,
  ): Promise<Array<{ id: string; symbol: string; name: string }>> {
    // First check popular coins for quick matching
    const queryLower = query.toLowerCase();
    const popularMatches = POPULAR_COINS.filter(
      (coin) =>
        coin.symbol.toLowerCase().includes(queryLower) ||
        coin.name.toLowerCase().includes(queryLower) ||
        coin.id.toLowerCase().includes(queryLower),
    );

    if (popularMatches.length > 0) {
      return popularMatches.slice(0, 10);
    }

    // Fallback to API search
    const url = `${COINGECKO_API_URL}/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      coins: Array<{ id: string; symbol: string; name: string }>;
    };

    return data.coins.slice(0, 10).map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
    }));
  }

  /**
   * Get trending coins
   */
  async getTrending(): Promise<
    Array<{ id: string; symbol: string; name: string; marketCapRank: number }>
  > {
    const url = `${COINGECKO_API_URL}/search/trending`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      coins: Array<{
        item: {
          id: string;
          symbol: string;
          name: string;
          market_cap_rank: number;
        };
      }>;
    };

    return data.coins.map((coin) => ({
      id: coin.item.id,
      symbol: coin.item.symbol.toUpperCase(),
      name: coin.item.name,
      marketCapRank: coin.item.market_cap_rank,
    }));
  }
}

// Default service instance
export const cryptoService = new CryptoService();

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(6)}`;
}

/**
 * Format percentage change
 */
export function formatChange(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Format market cap
 */
export function formatMarketCap(cap: number): string {
  if (cap >= 1e12) {
    return `$${(cap / 1e12).toFixed(2)}T`;
  }
  if (cap >= 1e9) {
    return `$${(cap / 1e9).toFixed(2)}B`;
  }
  if (cap >= 1e6) {
    return `$${(cap / 1e6).toFixed(2)}M`;
  }
  return `$${cap.toLocaleString()}`;
}

/**
 * Create mini sparkline from price history
 */
export function miniSparkline(prices: number[], width: number = 20): string {
  if (prices.length === 0) return "─".repeat(width);

  // Sample prices to fit width
  const step = Math.max(1, Math.floor(prices.length / width));
  const sampled: number[] = [];
  for (let i = 0; i < prices.length; i += step) {
    sampled.push(prices[i]!);
  }

  // Ensure we have exactly 'width' points
  while (sampled.length < width && sampled.length > 0) {
    sampled.push(sampled[sampled.length - 1]!);
  }
  if (sampled.length > width) {
    sampled.length = width;
  }

  const chars = "▁▂▃▄▅▆▇█";
  const max = Math.max(...sampled);
  const min = Math.min(...sampled);
  const range = max - min || 1;

  return sampled
    .map((v) => {
      const normalized = (v - min) / range;
      const index = Math.min(
        Math.floor(normalized * chars.length),
        chars.length - 1,
      );
      return chars[index];
    })
    .join("");
}

/**
 * Get color based on price change
 */
export function getChangeColor(change: number): "green" | "red" | "gray" {
  if (change > 0) return "green";
  if (change < 0) return "red";
  return "gray";
}
