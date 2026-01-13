// Regex Canvas - Interactive regex tester with real-time matching

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type RegexConfig,
  type RegexResult,
  type ViewMode,
  type FocusArea,
  type HistoryEntry,
  REGEX_COLORS,
  FLAG_INFO,
  PRESET_CATEGORIES,
} from "./regex/types";
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
  testRegex,
  parseFlags,
  flagsToString,
  PatternHistory,
  PATTERN_PRESETS,
  type RegexFlags,
  type RegexMatch,
  type PatternPreset,
} from "../services/regex";

// Regex-specific keybindings
const REGEX_BINDINGS: KeyBinding[] = [
  { key: "Tab", description: "Switch input focus", category: "navigation" },
  { key: "Ctrl+G", description: "Toggle global (g)", category: "action" },
  {
    key: "Ctrl+I",
    description: "Toggle case insensitive (i)",
    category: "action",
  },
  { key: "Ctrl+M", description: "Toggle multiline (m)", category: "action" },
  { key: "Ctrl+S", description: "Toggle dotAll (s)", category: "action" },
  { key: "p", description: "Show presets", category: "action" },
  { key: "h", description: "Show history", category: "view" },
  { key: "c", description: "Copy pattern", category: "action" },
  { key: "Ctrl+Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: RegexConfig;
  socketPath?: string;
  scenario?: string;
}

// Generate unique ID
function generateId(): string {
  return `regex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

// Pattern input component
function PatternInput({
  value,
  onChange,
  isActive,
  error,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  error: string | null;
  width: number;
}) {
  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text color={REGEX_COLORS.secondary} bold>
          Pattern:{" "}
        </Text>
        <Text color={isActive ? REGEX_COLORS.accent : REGEX_COLORS.muted}>
          /
        </Text>
      </Box>
      <Box
        borderStyle="single"
        borderColor={
          error
            ? REGEX_COLORS.error
            : isActive
              ? REGEX_COLORS.accent
              : REGEX_COLORS.muted
        }
        paddingX={1}
      >
        {isActive ? (
          <TextInput
            value={value}
            onChange={onChange}
            placeholder="Enter regex pattern..."
          />
        ) : (
          <Text color={value ? "white" : REGEX_COLORS.muted}>
            {value || "Enter regex pattern..."}
          </Text>
        )}
      </Box>
      {error && (
        <Box marginTop={0}>
          <Text color={REGEX_COLORS.error}>Error: {error}</Text>
        </Box>
      )}
    </Box>
  );
}

// Flags toggle component
function FlagsToggle({
  flags,
  onToggle,
}: {
  flags: RegexFlags;
  onToggle: (flag: keyof RegexFlags) => void;
}) {
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={REGEX_COLORS.muted}>Flags: </Text>
      {FLAG_INFO.map((info) => {
        const isActive = flags[info.flag];
        return (
          <Box key={info.key} marginRight={1}>
            <Text
              color={isActive ? REGEX_COLORS.flagActive : REGEX_COLORS.muted}
              bold={isActive}
            >
              [{info.shortLabel}]
            </Text>
          </Box>
        );
      })}
      <Text color={REGEX_COLORS.muted}>
        {" "}
        = /{flagsToString(flags) || "none"}/
      </Text>
    </Box>
  );
}

// Test text input component
function TestTextInput({
  value,
  onChange,
  isActive,
  matches,
  width,
  height,
}: {
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  matches: RegexMatch[];
  width: number;
  height: number;
}) {
  // Create a map of character positions that are part of a match
  const matchRanges = useMemo(() => {
    const ranges: Array<{ start: number; end: number; groupLevel: number }> =
      [];
    for (const match of matches) {
      ranges.push({
        start: match.index,
        end: match.endIndex,
        groupLevel: 0,
      });
    }
    return ranges;
  }, [matches]);

  // Render text with highlights
  const renderHighlightedText = useCallback(() => {
    if (!value) {
      return (
        <Text color={REGEX_COLORS.muted}>
          {isActive ? "" : "Enter test text here..."}
        </Text>
      );
    }

    if (matchRanges.length === 0) {
      return <Text>{value.slice(0, width * height)}</Text>;
    }

    const elements: React.ReactNode[] = [];
    let lastEnd = 0;

    // Sort ranges by start position
    const sortedRanges = [...matchRanges].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sortedRanges.length; i++) {
      const range = sortedRanges[i]!;

      // Add non-matched text before this range
      if (range.start > lastEnd) {
        elements.push(
          <Text key={`text-${i}`}>{value.slice(lastEnd, range.start)}</Text>,
        );
      }

      // Add matched text with highlight
      elements.push(
        <Text key={`match-${i}`} color="black" backgroundColor="green">
          {value.slice(range.start, range.end)}
        </Text>,
      );

      lastEnd = range.end;
    }

    // Add remaining text after last match
    if (lastEnd < value.length) {
      elements.push(<Text key="text-end">{value.slice(lastEnd)}</Text>);
    }

    return <>{elements}</>;
  }, [value, matchRanges, width, height, isActive]);

  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text color={REGEX_COLORS.secondary} bold>
          Test Text:
        </Text>
        <Text color={REGEX_COLORS.muted}>
          {" "}
          ({matches.length} match{matches.length !== 1 ? "es" : ""})
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={isActive ? REGEX_COLORS.accent : REGEX_COLORS.muted}
        paddingX={1}
        height={Math.max(3, height)}
      >
        {isActive ? (
          <TextInput
            value={value}
            onChange={onChange}
            placeholder="Enter test text here..."
          />
        ) : (
          <Box flexWrap="wrap">{renderHighlightedText()}</Box>
        )}
      </Box>
    </Box>
  );
}

// Match list component
function MatchList({
  matches,
  width,
  maxHeight,
}: {
  matches: RegexMatch[];
  width: number;
  maxHeight: number;
}) {
  const visibleMatches = matches.slice(0, maxHeight - 2);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={0}>
        <Text color={REGEX_COLORS.secondary} bold>
          Matches:
        </Text>
        <Text color={REGEX_COLORS.muted}> ({matches.length} found)</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={REGEX_COLORS.muted}
        paddingX={1}
        height={Math.min(maxHeight, matches.length + 2)}
      >
        {visibleMatches.length > 0 ? (
          visibleMatches.map((match, i) => (
            <Box key={i} flexDirection="row">
              <Text color={REGEX_COLORS.index}>{`[${i}]`.padEnd(5)}</Text>
              <Text color={REGEX_COLORS.muted}>
                @{match.index.toString().padEnd(4)}
              </Text>
              <Text color={REGEX_COLORS.match}>
                "{match.fullMatch.slice(0, width - 20)}"
              </Text>
              {match.groups.length > 0 && (
                <Text color={REGEX_COLORS.group}>
                  {" "}
                  groups: [{match.groups.join(", ")}]
                </Text>
              )}
            </Box>
          ))
        ) : (
          <Text color={REGEX_COLORS.muted}>No matches found</Text>
        )}
        {matches.length > visibleMatches.length && (
          <Text color={REGEX_COLORS.muted}>
            ... and {matches.length - visibleMatches.length} more
          </Text>
        )}
      </Box>
    </Box>
  );
}

// Capture groups display component
function CaptureGroups({
  matches,
  width,
}: {
  matches: RegexMatch[];
  width: number;
}) {
  // Only show groups if any match has captured groups
  const hasGroups = matches.some(
    (m) => m.groups.length > 0 || Object.keys(m.namedGroups).length > 0,
  );

  if (!hasGroups) return null;

  const firstWithGroups = matches.find((m) => m.groups.length > 0);
  if (!firstWithGroups) return null;

  return (
    <Box flexDirection="column" width={width} marginTop={1}>
      <Text color={REGEX_COLORS.secondary} bold>
        Capture Groups (first match):
      </Text>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={REGEX_COLORS.group}
        paddingX={1}
      >
        {firstWithGroups.groups.map((group, i) => (
          <Box key={i}>
            <Text color={REGEX_COLORS.index}>${i + 1}: </Text>
            <Text color={REGEX_COLORS.group}>"{group}"</Text>
          </Box>
        ))}
        {Object.entries(firstWithGroups.namedGroups).map(([name, value]) => (
          <Box key={name}>
            <Text color={REGEX_COLORS.index}>${name}: </Text>
            <Text color={REGEX_COLORS.group}>"{value}"</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Presets panel component
function PresetsPanel({
  onSelect,
  onClose,
  width,
  height,
}: {
  onSelect: (preset: PatternPreset) => void;
  onClose: () => void;
  width: number;
  height: number;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    PRESET_CATEGORIES[0],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredPresets = PATTERN_PRESETS.filter(
    (p) => p.category === selectedCategory,
  );

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.leftArrow) {
      const idx = PRESET_CATEGORIES.indexOf(selectedCategory as any);
      const newIdx =
        (idx - 1 + PRESET_CATEGORIES.length) % PRESET_CATEGORIES.length;
      const newCat = PRESET_CATEGORIES[newIdx];
      if (newCat) setSelectedCategory(newCat);
      setSelectedIndex(0);
    } else if (key.rightArrow) {
      const idx = PRESET_CATEGORIES.indexOf(selectedCategory as any);
      const newIdx = (idx + 1) % PRESET_CATEGORIES.length;
      const newCat = PRESET_CATEGORIES[newIdx];
      if (newCat) setSelectedCategory(newCat);
      setSelectedIndex(0);
    } else if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(filteredPresets.length - 1, i + 1));
    } else if (key.return) {
      const preset = filteredPresets[selectedIndex];
      if (preset) {
        onSelect(preset);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={REGEX_COLORS.secondary}
      paddingX={2}
      paddingY={1}
      width={Math.min(width - 4, 70)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={REGEX_COLORS.secondary} bold>
          {"[ REGEX PRESETS ]"}
        </Text>
      </Box>

      {/* Category tabs */}
      <Box flexDirection="row" marginBottom={1} gap={1}>
        {PRESET_CATEGORIES.map((cat) => (
          <Box key={cat}>
            <Text
              color={
                cat === selectedCategory
                  ? REGEX_COLORS.accent
                  : REGEX_COLORS.muted
              }
              bold={cat === selectedCategory}
            >
              [{cat}]
            </Text>
          </Box>
        ))}
      </Box>

      {/* Preset list */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={REGEX_COLORS.muted}
        paddingX={1}
        height={Math.min(height - 10, filteredPresets.length + 2)}
      >
        {filteredPresets.map((preset, i) => (
          <Box key={preset.id}>
            <Text
              color={
                i === selectedIndex ? REGEX_COLORS.accent : REGEX_COLORS.muted
              }
            >
              {i === selectedIndex ? "> " : "  "}
            </Text>
            <Text
              color={i === selectedIndex ? REGEX_COLORS.primary : "white"}
              bold={i === selectedIndex}
            >
              {preset.name.padEnd(15)}
            </Text>
            <Text color={REGEX_COLORS.muted}>{preset.description}</Text>
          </Box>
        ))}
      </Box>

      {/* Selected preset preview */}
      {filteredPresets[selectedIndex] && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={REGEX_COLORS.flag}>
            Pattern: /{filteredPresets[selectedIndex]!.pattern}/
            {filteredPresets[selectedIndex]!.flags}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={REGEX_COLORS.muted}>
          Left/Right: category | Up/Down: select | Enter: use | Esc: close
        </Text>
      </Box>
    </Box>
  );
}

// History panel component
function HistoryPanel({
  history,
  onSelect,
  onClose,
  width,
  height,
}: {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClose: () => void;
  width: number;
  height: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(history.length - 1, i + 1));
    } else if (key.return) {
      const entry = history[selectedIndex];
      if (entry) {
        onSelect(entry);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={REGEX_COLORS.secondary}
      paddingX={2}
      paddingY={1}
      width={Math.min(width - 4, 60)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={REGEX_COLORS.secondary} bold>
          {"[ PATTERN HISTORY ]"}
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={REGEX_COLORS.muted}
        paddingX={1}
        height={Math.min(height - 8, history.length + 2)}
      >
        {history.length > 0 ? (
          history.slice(0, height - 10).map((entry, i) => (
            <Box key={entry.id}>
              <Text
                color={
                  i === selectedIndex ? REGEX_COLORS.accent : REGEX_COLORS.muted
                }
              >
                {i === selectedIndex ? "> " : "  "}
              </Text>
              <Text
                color={i === selectedIndex ? REGEX_COLORS.primary : "white"}
              >
                /{entry.pattern.slice(0, width - 30)}/{entry.flags}
              </Text>
              <Text color={REGEX_COLORS.muted}>
                {" "}
                {formatRelativeTime(entry.timestamp)}
              </Text>
            </Box>
          ))
        ) : (
          <Text color={REGEX_COLORS.muted}>No history yet</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color={REGEX_COLORS.muted}>
          Up/Down: select | Enter: use | Esc: close
        </Text>
      </Box>
    </Box>
  );
}

export function RegexCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "regex",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Pattern state
  const [pattern, setPattern] = useState(initialConfig?.initialPattern || "");
  const [testText, setTestText] = useState(
    initialConfig?.initialText ||
      "The quick brown fox jumps over the lazy dog.\nEmail: test@example.com\nPhone: 555-123-4567",
  );
  const [flags, setFlags] = useState<RegexFlags>(() =>
    parseFlags(initialConfig?.initialFlags || "gi"),
  );

  // Results state
  const [matches, setMatches] = useState<RegexMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState(0);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("test");
  const [focusArea, setFocusArea] = useState<FocusArea>("pattern");
  const [showHelp, setShowHelp] = useState(false);

  // History
  const [historyManager] = useState(() => new PatternHistory(20));
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

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
    "regex",
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

  // Test regex whenever pattern, text, or flags change
  useEffect(() => {
    const result = testRegex(pattern, testText, flags);
    setMatches(result.matches);
    setError(result.error);
    setExecutionTime(result.executionTime);

    // Add to history if valid pattern with matches
    if (result.isValid && pattern && result.matchCount > 0) {
      historyManager.add(pattern, flagsToString(flags));
      setHistoryEntries(
        historyManager.getAll().map((h) => ({
          id: generateId(),
          ...h,
        })),
      );
    }
  }, [pattern, testText, flags, historyManager]);

  // Toggle flag
  const toggleFlag = useCallback((flag: keyof RegexFlags) => {
    setFlags((prev) => ({
      ...prev,
      [flag]: !prev[flag],
    }));
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: PatternPreset) => {
    setPattern(preset.pattern);
    setFlags(parseFlags(preset.flags));
    setViewMode("test");
  }, []);

  // Handle history selection
  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setPattern(entry.pattern);
    setFlags(parseFlags(entry.flags));
    setViewMode("test");
  }, []);

  // Copy pattern to clipboard (simulated via IPC)
  const copyPattern = useCallback(() => {
    const fullPattern = `/${pattern}/${flagsToString(flags)}`;
    ipc.sendSelected({
      action: "copy",
      pattern: fullPattern,
    });
  }, [pattern, flags, ipc]);

  // Cycle focus between pattern and test text
  const cycleFocus = useCallback(() => {
    setFocusArea((prev) => (prev === "pattern" ? "testText" : "pattern"));
  }, []);

  // Keyboard input
  useInput(
    (input, key) => {
      // Canvas navigation takes priority
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

      // Handle overlays
      if (viewMode === "presets" || viewMode === "history") {
        return; // Input handled by overlay components
      }

      // Quit
      if (key.escape || input === "q") {
        const result: RegexResult = {
          action: "close",
          pattern,
          flags: flagsToString(flags),
          matchCount: matches.length,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Tab to cycle focus
      if (key.tab && !key.ctrl && !key.shift) {
        cycleFocus();
        return;
      }

      // Flag toggles with Ctrl+key
      if (key.ctrl) {
        if (input === "g") {
          toggleFlag("global");
          return;
        }
        if (input === "i") {
          toggleFlag("ignoreCase");
          return;
        }
        if (input === "m") {
          toggleFlag("multiline");
          return;
        }
        if (input === "s") {
          toggleFlag("dotAll");
          return;
        }
        if (input === "u") {
          toggleFlag("unicode");
          return;
        }
        if (input === "y") {
          toggleFlag("sticky");
          return;
        }
      }

      // View mode toggles
      if (
        input === "p" &&
        focusArea !== "pattern" &&
        focusArea !== "testText"
      ) {
        setViewMode("presets");
        return;
      }
      if (
        input === "h" &&
        focusArea !== "pattern" &&
        focusArea !== "testText"
      ) {
        setViewMode("history");
        return;
      }
      if (
        input === "c" &&
        focusArea !== "pattern" &&
        focusArea !== "testText"
      ) {
        copyPattern();
        return;
      }

      // Allow p, h, c when not typing in input fields
      if (focusArea !== "pattern" && focusArea !== "testText") {
        if (input === "p") {
          setViewMode("presets");
          return;
        }
        if (input === "h") {
          setViewMode("history");
          return;
        }
      }
    },
    { isActive: !showNav && viewMode === "test" },
  );

  // Additional input handler for when not in text input mode
  useInput(
    (input, key) => {
      // Only handle when not focused on text inputs
      if (focusArea === "pattern" || focusArea === "testText") {
        return;
      }

      if (input === "p") {
        setViewMode("presets");
      } else if (input === "h") {
        setViewMode("history");
      } else if (input === "c") {
        copyPattern();
      }
    },
    {
      isActive:
        !showNav &&
        viewMode === "test" &&
        focusArea !== "pattern" &&
        focusArea !== "testText",
    },
  );

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const contentWidth = Math.max(40, termWidth - 4);
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={REGEX_COLORS.accent}
      >
        <Text color={REGEX_COLORS.primary} bold>
          {"// REGEX TESTER //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Pattern input */}
        <PatternInput
          value={pattern}
          onChange={setPattern}
          isActive={focusArea === "pattern"}
          error={error}
          width={contentWidth}
        />

        {/* Flags toggle */}
        <Box marginY={1}>
          <FlagsToggle flags={flags} onToggle={toggleFlag} />
        </Box>

        {/* Test text input */}
        <TestTextInput
          value={testText}
          onChange={setTestText}
          isActive={focusArea === "testText"}
          matches={matches}
          width={contentWidth}
          height={Math.max(3, Math.floor(contentHeight * 0.3))}
        />

        {/* Results section */}
        <Box flexDirection="row" marginTop={1} gap={2}>
          {/* Match list */}
          <Box width="60%">
            <MatchList
              matches={matches}
              width={Math.floor(contentWidth * 0.58)}
              maxHeight={Math.floor(contentHeight * 0.35)}
            />
          </Box>

          {/* Capture groups */}
          <Box width="40%">
            <CaptureGroups
              matches={matches}
              width={Math.floor(contentWidth * 0.38)}
            />
          </Box>
        </Box>

        {/* Execution time */}
        <Box marginTop={1}>
          <Text color={REGEX_COLORS.muted}>
            Execution: {executionTime.toFixed(2)}ms | Matches: {matches.length}
            {matches.length >= 1000 && " (limit reached)"}
          </Text>
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={REGEX_COLORS.muted}>
          Tab focus | Ctrl+g/i/m/s flags | p presets | h history | c copy | ?
          help | q quit
        </Text>
        <Text color={REGEX_COLORS.muted}>
          Focus: {focusArea === "pattern" ? "Pattern" : "Test Text"}
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
            title="REGEX TESTER"
            bindings={REGEX_BINDINGS}
            visible={showHelp}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}

      {/* Presets overlay */}
      {viewMode === "presets" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <PresetsPanel
            onSelect={handlePresetSelect}
            onClose={() => setViewMode("test")}
            width={termWidth}
            height={termHeight}
          />
        </Box>
      )}

      {/* History overlay */}
      {viewMode === "history" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <HistoryPanel
            history={historyEntries}
            onSelect={handleHistorySelect}
            onClose={() => setViewMode("test")}
            width={termWidth}
            height={termHeight}
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
            currentCanvas="regex"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
