// Music Canvas - Real-time music player control TUI

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type MusicConfig,
  type Track,
  type PlaybackState,
  MUSIC_COLORS,
} from "./music/types";
import { HelpOverlay, MUSIC_BINDINGS } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  musicService,
  formatTime,
  playbackProgressBar,
  detectAvailablePlayer,
} from "../services/music";

interface Props {
  id: string;
  config?: MusicConfig;
  socketPath?: string;
  scenario?: string;
}

// Album art ASCII placeholder
function AlbumArt({ isPlaying }: { isPlaying: boolean }) {
  const color = isPlaying ? MUSIC_COLORS.neonGreen : MUSIC_COLORS.dim;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      paddingX={1}
      width={20}
      height={10}
    >
      <Text color={color}>{"    ╭──────╮"}</Text>
      <Text color={color}>{"   ╭┴──────┴╮"}</Text>
      <Text color={color}>{"  ╭┴────────┴╮"}</Text>
      <Text color={color}>{"  │  ╭────╮  │"}</Text>
      <Text color={color}>{"  │  │ ●● │  │"}</Text>
      <Text color={color}>{"  │  ╰────╯  │"}</Text>
      <Text color={color}>{"  ╰──────────╯"}</Text>
    </Box>
  );
}

// Now playing display
function NowPlaying({
  track,
  state,
  width,
}: {
  track: Track;
  state: PlaybackState;
  width: number;
}) {
  const progressBarWidth = Math.max(20, width - 20);
  const progressBar = playbackProgressBar(
    track.position,
    track.duration,
    progressBarWidth,
  );

  return (
    <Box flexDirection="column" width={width}>
      {/* Track info */}
      <Box marginBottom={1}>
        <Text color={MUSIC_COLORS.neonCyan} bold>
          {state.isPlaying ? "▶ NOW PLAYING" : "⏸ PAUSED"}
        </Text>
      </Box>

      {/* Title */}
      <Box>
        <Text color="white" bold>
          {track.title.slice(0, width - 4) || "No track"}
        </Text>
      </Box>

      {/* Artist */}
      <Box>
        <Text color={MUSIC_COLORS.neonMagenta}>
          {track.artist.slice(0, width - 4) || "Unknown artist"}
        </Text>
      </Box>

      {/* Album */}
      {track.album && (
        <Box>
          <Text color={MUSIC_COLORS.dim}>
            {track.album.slice(0, width - 4)}
          </Text>
        </Box>
      )}

      {/* Progress bar */}
      <Box marginTop={1}>
        <Text
          color={state.isPlaying ? MUSIC_COLORS.neonGreen : MUSIC_COLORS.dim}
        >
          {progressBar}
        </Text>
      </Box>

      {/* Time */}
      <Box>
        <Text color={MUSIC_COLORS.dim}>
          {formatTime(track.position)} / {formatTime(track.duration)}
        </Text>
      </Box>
    </Box>
  );
}

// Controls display
function ControlsDisplay({
  state,
  player,
  width,
}: {
  state: PlaybackState;
  player: string;
  width: number;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={MUSIC_COLORS.dim}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={MUSIC_COLORS.neonMagenta} bold>
          {"[ CONTROLS ]"}
        </Text>
      </Box>

      {/* Volume */}
      <Box>
        <Text color={MUSIC_COLORS.dim}>Volume: </Text>
        <Text color={MUSIC_COLORS.neonYellow}>
          {"█".repeat(Math.round(state.volume / 10))}
          {"░".repeat(10 - Math.round(state.volume / 10))}
        </Text>
        <Text color={MUSIC_COLORS.dim}> {state.volume}%</Text>
      </Box>

      {/* Shuffle */}
      <Box>
        <Text color={MUSIC_COLORS.dim}>Shuffle: </Text>
        <Text color={state.shuffle ? MUSIC_COLORS.neonGreen : MUSIC_COLORS.dim}>
          {state.shuffle ? "ON" : "OFF"}
        </Text>
      </Box>

      {/* Repeat */}
      <Box>
        <Text color={MUSIC_COLORS.dim}>Repeat: </Text>
        <Text
          color={
            state.repeat !== "off" ? MUSIC_COLORS.neonGreen : MUSIC_COLORS.dim
          }
        >
          {state.repeat.toUpperCase()}
        </Text>
      </Box>

      {/* Player */}
      <Box marginTop={1}>
        <Text color={MUSIC_COLORS.dim}>Player: </Text>
        <Text
          color={
            player === "spotify"
              ? MUSIC_COLORS.spotifyGreen
              : MUSIC_COLORS.appleMusicPink
          }
          bold
        >
          {player === "spotify" ? "Spotify" : "Apple Music"}
        </Text>
      </Box>
    </Box>
  );
}

// Keyboard shortcuts display
function KeyboardShortcuts({ width }: { width: number }) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={MUSIC_COLORS.dim}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={MUSIC_COLORS.neonMagenta} bold>
          {"[ SHORTCUTS ]"}
        </Text>
      </Box>

      <Box>
        <Text color={MUSIC_COLORS.neonCyan}>Space</Text>
        <Text color={MUSIC_COLORS.dim}> Play/Pause</Text>
      </Box>
      <Box>
        <Text color={MUSIC_COLORS.neonCyan}>n/p</Text>
        <Text color={MUSIC_COLORS.dim}> Next/Prev</Text>
      </Box>
      <Box>
        <Text color={MUSIC_COLORS.neonCyan}>+/-</Text>
        <Text color={MUSIC_COLORS.dim}> Volume</Text>
      </Box>
      <Box>
        <Text color={MUSIC_COLORS.neonCyan}>s</Text>
        <Text color={MUSIC_COLORS.dim}> Shuffle</Text>
      </Box>
      <Box>
        <Text color={MUSIC_COLORS.neonCyan}>r</Text>
        <Text color={MUSIC_COLORS.dim}> Repeat</Text>
      </Box>
      <Box>
        <Text color={MUSIC_COLORS.neonCyan}>t</Text>
        <Text color={MUSIC_COLORS.dim}> Switch player</Text>
      </Box>
    </Box>
  );
}

export function MusicCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "music",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Track and playback state
  const [track, setTrack] = useState<Track>({
    title: "Loading...",
    artist: "",
    album: "",
    duration: 0,
    position: 0,
  });
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    volume: 50,
    shuffle: false,
    repeat: "off",
  });
  const [player, setPlayer] = useState<"spotify" | "apple-music">(
    initialConfig?.player || "spotify",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    "music",
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

  // Initialize player detection
  useEffect(() => {
    const init = async () => {
      if (!initialConfig?.player) {
        const detected = await detectAvailablePlayer();
        if (detected) {
          setPlayer(detected);
          musicService.setPlayer(detected);
        }
      } else {
        musicService.setPlayer(initialConfig.player);
      }
    };
    init();
  }, [initialConfig?.player]);

  // Fetch track and state
  const fetchData = useCallback(async () => {
    try {
      const [newTrack, newState] = await Promise.all([
        musicService.getCurrentTrack(),
        musicService.getPlaybackState(),
      ]);
      setTrack(newTrack);
      setPlaybackState(newState);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      setError(`Failed to get music data: ${(err as Error).message}`);
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh (every 1 second for smooth progress bar)
  useEffect(() => {
    const interval = setInterval(
      fetchData,
      initialConfig?.refreshInterval || 1000,
    );
    return () => clearInterval(interval);
  }, [fetchData, initialConfig?.refreshInterval]);

  // Player controls
  const handlePlayPause = useCallback(async () => {
    try {
      await musicService.togglePlayPause();
      await fetchData();
    } catch (err) {
      setError(`Play/pause failed: ${(err as Error).message}`);
    }
  }, [fetchData]);

  const handleNext = useCallback(async () => {
    try {
      await musicService.next();
      await fetchData();
    } catch (err) {
      setError(`Next failed: ${(err as Error).message}`);
    }
  }, [fetchData]);

  const handlePrevious = useCallback(async () => {
    try {
      await musicService.previous();
      await fetchData();
    } catch (err) {
      setError(`Previous failed: ${(err as Error).message}`);
    }
  }, [fetchData]);

  const handleVolumeUp = useCallback(async () => {
    try {
      await musicService.setVolume(playbackState.volume + 10);
      await fetchData();
    } catch (err) {
      setError(`Volume failed: ${(err as Error).message}`);
    }
  }, [playbackState.volume, fetchData]);

  const handleVolumeDown = useCallback(async () => {
    try {
      await musicService.setVolume(playbackState.volume - 10);
      await fetchData();
    } catch (err) {
      setError(`Volume failed: ${(err as Error).message}`);
    }
  }, [playbackState.volume, fetchData]);

  const handleToggleShuffle = useCallback(async () => {
    try {
      await musicService.toggleShuffle();
      await fetchData();
    } catch (err) {
      setError(`Shuffle failed: ${(err as Error).message}`);
    }
  }, [fetchData]);

  const handleToggleRepeat = useCallback(async () => {
    try {
      await musicService.toggleRepeat();
      await fetchData();
    } catch (err) {
      setError(`Repeat failed: ${(err as Error).message}`);
    }
  }, [fetchData]);

  const handleSwitchPlayer = useCallback(() => {
    const newPlayer = player === "spotify" ? "apple-music" : "spotify";
    setPlayer(newPlayer);
    musicService.setPlayer(newPlayer);
    fetchData();
  }, [player, fetchData]);

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

    // Playback controls
    if (input === " ") {
      handlePlayPause();
    } else if (input === "n" || key.rightArrow) {
      handleNext();
    } else if (input === "p" || key.leftArrow) {
      handlePrevious();
    } else if (input === "+" || input === "=" || key.upArrow) {
      handleVolumeUp();
    } else if (input === "-" || key.downArrow) {
      handleVolumeDown();
    } else if (input === "s") {
      handleToggleShuffle();
    } else if (input === "r") {
      handleToggleRepeat();
    } else if (input === "t") {
      handleSwitchPlayer();
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const leftWidth = Math.floor(termWidth * 0.55);
  const rightWidth = termWidth - leftWidth - 3;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={MUSIC_COLORS.neonMagenta}
      >
        <Text color={MUSIC_COLORS.neonCyan} bold>
          {"// MUSIC PLAYER //"}
        </Text>
        <Box>
          {isLoading ? (
            <Text color={MUSIC_COLORS.neonGreen}>
              <Spinner type="dots" /> Loading...
            </Text>
          ) : (
            <Text color={MUSIC_COLORS.dim}>
              {player === "spotify" ? "Spotify" : "Apple Music"}
            </Text>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1}>
          <Text color={MUSIC_COLORS.neonRed}>Error: {error}</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" marginTop={1}>
        {/* Left panel - Now playing */}
        <Box flexDirection="column" width={leftWidth} paddingX={1}>
          <Box flexDirection="row">
            {/* Album art placeholder */}
            <AlbumArt isPlaying={playbackState.isPlaying} />

            {/* Track info */}
            <Box marginLeft={2} flexDirection="column" width={leftWidth - 24}>
              <NowPlaying
                track={track}
                state={playbackState}
                width={leftWidth - 26}
              />
            </Box>
          </Box>
        </Box>

        {/* Right panel - Controls and shortcuts */}
        <Box flexDirection="column" width={rightWidth} marginLeft={1}>
          <ControlsDisplay
            state={playbackState}
            player={player}
            width={rightWidth - 1}
          />
          <Box marginTop={1}>
            <KeyboardShortcuts width={rightWidth - 1} />
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={MUSIC_COLORS.dim}>
          Tab switch | ? help | Space play/pause | n/p next/prev | +/- volume |
          s shuffle | r repeat | q quit
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
            title="MUSIC PLAYER"
            bindings={MUSIC_BINDINGS}
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
            currentCanvas="music"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
