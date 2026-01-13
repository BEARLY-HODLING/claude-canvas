// Music Service - macOS Music.app and Spotify control via AppleScript
// Uses osascript for native AppleScript execution on macOS

import { $ } from "bun";

/**
 * Track information
 */
export interface Track {
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  position: number; // seconds
  artworkUrl?: string;
}

/**
 * Playback state
 */
export interface PlaybackState {
  isPlaying: boolean;
  volume: number; // 0-100
  shuffle: boolean;
  repeat: "off" | "one" | "all";
}

/**
 * Player type
 */
export type PlayerType = "spotify" | "apple-music";

/**
 * Execute AppleScript and return result
 */
async function runAppleScript(script: string): Promise<string> {
  try {
    const result = await $`osascript -e ${script}`.text();
    return result.trim();
  } catch (error) {
    throw new Error(`AppleScript error: ${(error as Error).message}`);
  }
}

/**
 * Check if an app is running
 */
async function isAppRunning(appName: string): Promise<boolean> {
  try {
    const script = `tell application "System Events" to (name of processes) contains "${appName}"`;
    const result = await runAppleScript(script);
    return result === "true";
  } catch {
    return false;
  }
}

/**
 * Music Service - Controls both Spotify and Apple Music
 */
export class MusicService {
  private player: PlayerType;

  constructor(player: PlayerType = "spotify") {
    this.player = player;
  }

  /**
   * Set the player to control
   */
  setPlayer(player: PlayerType): void {
    this.player = player;
  }

  /**
   * Get current player
   */
  getPlayer(): PlayerType {
    return this.player;
  }

  /**
   * Check if the player is running
   */
  async isRunning(): Promise<boolean> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    return isAppRunning(appName);
  }

  /**
   * Get currently playing track
   */
  async getCurrentTrack(): Promise<Track> {
    const running = await this.isRunning();
    if (!running) {
      return {
        title: "Player not running",
        artist: `Open ${this.player === "spotify" ? "Spotify" : "Music"} to see tracks`,
        album: "",
        duration: 0,
        position: 0,
      };
    }

    if (this.player === "spotify") {
      return this.getSpotifyTrack();
    } else {
      return this.getAppleMusicTrack();
    }
  }

  private async getSpotifyTrack(): Promise<Track> {
    try {
      const script = `
        tell application "Spotify"
          if player state is stopped then
            return "|||0|0|"
          end if
          set trackName to name of current track
          set trackArtist to artist of current track
          set trackAlbum to album of current track
          set trackDuration to duration of current track
          set trackPosition to player position
          set artworkUrl to artwork url of current track
          return trackName & "|" & trackArtist & "|" & trackAlbum & "|" & (trackDuration / 1000) & "|" & trackPosition & "|" & artworkUrl
        end tell
      `;
      const result = await runAppleScript(script);
      const parts = result.split("|");

      return {
        title: parts[0] || "Unknown",
        artist: parts[1] || "Unknown",
        album: parts[2] || "",
        duration: Math.round(parseFloat(parts[3] || "0")),
        position: Math.round(parseFloat(parts[4] || "0")),
        artworkUrl: parts[5] || undefined,
      };
    } catch {
      return {
        title: "Unable to get track",
        artist: "Spotify may not be playing",
        album: "",
        duration: 0,
        position: 0,
      };
    }
  }

  private async getAppleMusicTrack(): Promise<Track> {
    try {
      const script = `
        tell application "Music"
          if player state is stopped then
            return "|||0|0"
          end if
          set trackName to name of current track
          set trackArtist to artist of current track
          set trackAlbum to album of current track
          set trackDuration to duration of current track
          set trackPosition to player position
          return trackName & "|" & trackArtist & "|" & trackAlbum & "|" & trackDuration & "|" & trackPosition
        end tell
      `;
      const result = await runAppleScript(script);
      const parts = result.split("|");

      return {
        title: parts[0] || "Unknown",
        artist: parts[1] || "Unknown",
        album: parts[2] || "",
        duration: Math.round(parseFloat(parts[3] || "0")),
        position: Math.round(parseFloat(parts[4] || "0")),
      };
    } catch {
      return {
        title: "Unable to get track",
        artist: "Music app may not be playing",
        album: "",
        duration: 0,
        position: 0,
      };
    }
  }

  /**
   * Get playback state
   */
  async getPlaybackState(): Promise<PlaybackState> {
    const running = await this.isRunning();
    if (!running) {
      return {
        isPlaying: false,
        volume: 0,
        shuffle: false,
        repeat: "off",
      };
    }

    if (this.player === "spotify") {
      return this.getSpotifyState();
    } else {
      return this.getAppleMusicState();
    }
  }

  private async getSpotifyState(): Promise<PlaybackState> {
    try {
      const script = `
        tell application "Spotify"
          set playerState to player state as string
          set vol to sound volume
          set shuf to shuffling
          set rep to repeating
          return playerState & "|" & vol & "|" & shuf & "|" & rep
        end tell
      `;
      const result = await runAppleScript(script);
      const parts = result.split("|");

      const isPlaying = parts[0] === "playing";
      const volume = parseInt(parts[1] || "50", 10);
      const shuffle = parts[2] === "true";
      const repeating = parts[3] === "true";

      return {
        isPlaying,
        volume,
        shuffle,
        repeat: repeating ? "all" : "off",
      };
    } catch {
      return {
        isPlaying: false,
        volume: 50,
        shuffle: false,
        repeat: "off",
      };
    }
  }

  private async getAppleMusicState(): Promise<PlaybackState> {
    try {
      const script = `
        tell application "Music"
          set playerState to player state as string
          set vol to sound volume
          set shuf to shuffle enabled
          set rep to song repeat as string
          return playerState & "|" & vol & "|" & shuf & "|" & rep
        end tell
      `;
      const result = await runAppleScript(script);
      const parts = result.split("|");

      const isPlaying = parts[0] === "playing";
      const volume = parseInt(parts[1] || "50", 10);
      const shuffle = parts[2] === "true";
      const repeatMode = parts[3] || "off";

      let repeat: "off" | "one" | "all" = "off";
      if (repeatMode === "one") repeat = "one";
      else if (repeatMode === "all") repeat = "all";

      return {
        isPlaying,
        volume,
        shuffle,
        repeat,
      };
    } catch {
      return {
        isPlaying: false,
        volume: 50,
        shuffle: false,
        repeat: "off",
      };
    }
  }

  /**
   * Play/resume playback
   */
  async play(): Promise<void> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to play`;
    await runAppleScript(script);
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to pause`;
    await runAppleScript(script);
  }

  /**
   * Toggle play/pause
   */
  async togglePlayPause(): Promise<void> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to playpause`;
    await runAppleScript(script);
  }

  /**
   * Skip to next track
   */
  async next(): Promise<void> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to next track`;
    await runAppleScript(script);
  }

  /**
   * Go to previous track
   */
  async previous(): Promise<void> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to previous track`;
    await runAppleScript(script);
  }

  /**
   * Set volume (0-100)
   */
  async setVolume(level: number): Promise<void> {
    const vol = Math.max(0, Math.min(100, Math.round(level)));
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to set sound volume to ${vol}`;
    await runAppleScript(script);
  }

  /**
   * Toggle shuffle
   */
  async toggleShuffle(): Promise<void> {
    if (this.player === "spotify") {
      const script = `tell application "Spotify" to set shuffling to not shuffling`;
      await runAppleScript(script);
    } else {
      const script = `tell application "Music" to set shuffle enabled to not shuffle enabled`;
      await runAppleScript(script);
    }
  }

  /**
   * Toggle repeat mode
   */
  async toggleRepeat(): Promise<void> {
    if (this.player === "spotify") {
      const script = `tell application "Spotify" to set repeating to not repeating`;
      await runAppleScript(script);
    } else {
      // Apple Music has off -> all -> one -> off cycle
      const script = `
        tell application "Music"
          set current to song repeat
          if current is off then
            set song repeat to all
          else if current is all then
            set song repeat to one
          else
            set song repeat to off
          end if
        end tell
      `;
      await runAppleScript(script);
    }
  }

  /**
   * Seek to position (seconds)
   */
  async seekTo(position: number): Promise<void> {
    const appName = this.player === "spotify" ? "Spotify" : "Music";
    const script = `tell application "${appName}" to set player position to ${position}`;
    await runAppleScript(script);
  }
}

// Default service instance
export const musicService = new MusicService("spotify");

/**
 * Format time in seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Create ASCII progress bar for playback
 */
export function playbackProgressBar(
  position: number,
  duration: number,
  width: number = 30,
): string {
  if (duration <= 0) return "─".repeat(width);

  const progress = Math.min(position / duration, 1);
  const filledWidth = Math.round(progress * width);
  const emptyWidth = width - filledWidth;

  const filled = "━".repeat(filledWidth);
  const cursor = "●";
  const empty = "─".repeat(Math.max(0, emptyWidth - 1));

  return filled + cursor + empty;
}

/**
 * Detect which player is available/running
 */
export async function detectAvailablePlayer(): Promise<PlayerType | null> {
  const spotifyRunning = await isAppRunning("Spotify");
  if (spotifyRunning) return "spotify";

  const musicRunning = await isAppRunning("Music");
  if (musicRunning) return "apple-music";

  return null;
}
