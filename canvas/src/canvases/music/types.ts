// Music Canvas - Type Definitions

import type { Track, PlaybackState, PlayerType } from "../../services/music";

export type { Track, PlaybackState, PlayerType };

/**
 * Music Canvas Configuration
 */
export interface MusicConfig {
  mode?: "music";
  title?: string;
  player?: PlayerType; // "spotify" | "apple-music" (default: auto-detect)
  refreshInterval?: number; // Milliseconds (default: 1000)
}

/**
 * Music Canvas Result
 */
export interface MusicResult {
  action: "play" | "pause" | "next" | "previous" | "close";
  track?: Track;
}

// Music-themed color palette
export const MUSIC_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
  // Spotify green
  spotifyGreen: "green",
  // Apple Music pink/red
  appleMusicPink: "magenta",
} as const;
