// Unit Converter Canvas - Convert between different units of measurement

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type UnitsConfig,
  type UnitsResult,
  type ViewMode,
  UNITS_COLORS,
  CATEGORY_KEYS,
} from "./units/types";
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
  convert,
  formatValue,
  parseValue,
  ConversionHistory,
  UNITS,
  UNITS_BY_CATEGORY,
  CATEGORY_NAMES,
  COMMON_PRESETS,
  type UnitCategory,
  type ConversionEntry,
  type ConversionPreset,
} from "../services/units";

// Unit Converter keybindings
const UNITS_BINDINGS: KeyBinding[] = [
  { key: "0-9/.", description: "Enter value", category: "action" },
  { key: "-", description: "Toggle negative", category: "action" },
  { key: "Backspace", description: "Delete character", category: "action" },
  { key: "Enter", description: "Add to history", category: "action" },
  { key: "s", description: "Swap units", category: "action" },
  { key: "c", description: "Clear input", category: "action" },
  {
    key: "[/]",
    description: "Previous/next from unit",
    category: "navigation",
  },
  { key: "{/}", description: "Previous/next to unit", category: "navigation" },
  { key: "1-6", description: "Select category", category: "navigation" },
  { key: "h", description: "Toggle history", category: "view" },
  { key: "p", description: "Toggle presets", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: UnitsConfig;
  socketPath?: string;
  scenario?: string;
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

// Category selector component
function CategorySelector({
  category,
  width,
}: {
  category: UnitCategory;
  width: number;
}) {
  const categories = Object.keys(CATEGORY_KEYS) as string[];

  return (
    <Box flexDirection="row" justifyContent="space-around" width={width}>
      {categories.map((key) => {
        const cat = CATEGORY_KEYS[key]!;
        const isActive = cat === category;

        return (
          <Box key={key}>
            <Text color={UNITS_COLORS.muted}>[</Text>
            <Text color={isActive ? UNITS_COLORS.primary : UNITS_COLORS.muted}>
              {key}
            </Text>
            <Text color={UNITS_COLORS.muted}>]</Text>
            <Text color={isActive ? UNITS_COLORS.category : UNITS_COLORS.muted}>
              {" "}
              {CATEGORY_NAMES[cat]}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// Conversion display component
function ConversionDisplay({
  inputValue,
  fromUnit,
  toUnit,
  result,
  error,
  width,
}: {
  inputValue: string;
  fromUnit: string;
  toUnit: string;
  result: string;
  error: string | null;
  width: number;
}) {
  const fromDef = UNITS[fromUnit];
  const toDef = UNITS[toUnit];

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={error ? UNITS_COLORS.error : UNITS_COLORS.accent}
      paddingX={1}
      paddingY={1}
      width={width}
    >
      {/* From value */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={UNITS_COLORS.muted}>From:</Text>
        <Text color={UNITS_COLORS.category}>
          {fromDef?.name} ({fromUnit})
        </Text>
      </Box>
      <Box justifyContent="flex-end" marginY={1}>
        <Text color={UNITS_COLORS.unit} bold>
          {inputValue || "0"}
        </Text>
        <Text color={UNITS_COLORS.muted}> {fromUnit}</Text>
      </Box>

      {/* Arrow */}
      <Box justifyContent="center">
        <Text color={UNITS_COLORS.swap}>{"  ||  "}</Text>
      </Box>
      <Box justifyContent="center">
        <Text color={UNITS_COLORS.swap}>{"  \\/  "}</Text>
      </Box>

      {/* To value */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Text color={UNITS_COLORS.muted}>To:</Text>
        <Text color={UNITS_COLORS.category}>
          {toDef?.name} ({toUnit})
        </Text>
      </Box>
      <Box justifyContent="flex-end" marginY={1}>
        <Text color={error ? UNITS_COLORS.error : UNITS_COLORS.result} bold>
          {error || result || "0"}
        </Text>
        <Text color={UNITS_COLORS.muted}> {toUnit}</Text>
      </Box>
    </Box>
  );
}

// Unit selector component
function UnitSelector({
  units,
  selectedUnit,
  label,
  width,
}: {
  units: string[];
  selectedUnit: string;
  label: string;
  width: number;
}) {
  return (
    <Box flexDirection="column" width={width}>
      <Text color={UNITS_COLORS.muted}>{label}:</Text>
      <Box flexDirection="row" flexWrap="wrap">
        {units.map((unit) => {
          const isSelected = unit === selectedUnit;
          const def = UNITS[unit];

          return (
            <Box key={unit} marginRight={1}>
              <Text
                color={isSelected ? UNITS_COLORS.primary : UNITS_COLORS.muted}
                bold={isSelected}
              >
                {def?.name || unit}
              </Text>
              <Text color={UNITS_COLORS.muted}>({unit})</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// History panel component
function HistoryPanel({
  history,
  width,
  maxItems = 10,
}: {
  history: ConversionEntry[];
  width: number;
  maxItems?: number;
}) {
  const visibleHistory = history.slice(0, maxItems);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={UNITS_COLORS.secondary} bold>
          {"[ HISTORY ]"}
        </Text>
        <Text color={UNITS_COLORS.muted}> ({history.length} items)</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={UNITS_COLORS.muted}
        paddingX={1}
        height={Math.min(maxItems + 2, 12)}
      >
        {visibleHistory.length > 0 ? (
          visibleHistory.map((entry) => (
            <Box
              key={entry.id}
              flexDirection="row"
              justifyContent="space-between"
            >
              <Box>
                <Text color={UNITS_COLORS.unit}>
                  {formatValue(entry.fromValue, 4)}
                </Text>
                <Text color={UNITS_COLORS.muted}> {entry.fromUnit}</Text>
                <Text color={UNITS_COLORS.swap}> = </Text>
                <Text color={UNITS_COLORS.result}>
                  {formatValue(entry.toValue, 4)}
                </Text>
                <Text color={UNITS_COLORS.muted}> {entry.toUnit}</Text>
              </Box>
              <Text color={UNITS_COLORS.muted}>
                {formatRelativeTime(entry.timestamp)}
              </Text>
            </Box>
          ))
        ) : (
          <Text color={UNITS_COLORS.muted}>No conversions yet</Text>
        )}
      </Box>
    </Box>
  );
}

// Presets panel component
function PresetsPanel({
  onSelect,
  width,
}: {
  onSelect: (preset: ConversionPreset) => void;
  width: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(COMMON_PRESETS.length - 1, i + 1));
    } else if (key.return) {
      const preset = COMMON_PRESETS[selectedIndex];
      if (preset) {
        onSelect(preset);
      }
    }
  });

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={UNITS_COLORS.secondary} bold>
          {"[ COMMON PRESETS ]"}
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={UNITS_COLORS.muted}
        paddingX={1}
      >
        {COMMON_PRESETS.map((preset, index) => {
          const isSelected = index === selectedIndex;

          return (
            <Box key={preset.name}>
              <Text
                color={isSelected ? UNITS_COLORS.primary : UNITS_COLORS.muted}
              >
                {isSelected ? "> " : "  "}
              </Text>
              <Text
                color={isSelected ? UNITS_COLORS.unit : UNITS_COLORS.muted}
                bold={isSelected}
              >
                {preset.name}
              </Text>
              <Text color={UNITS_COLORS.muted}>
                {" "}
                ({preset.fromUnit} {"->"} {preset.toUnit})
              </Text>
            </Box>
          );
        })}
        <Box marginTop={1}>
          <Text color={UNITS_COLORS.muted}>
            Use Up/Down to select, Enter to apply
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function UnitsCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "units",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Converter state
  const [category, setCategory] = useState<UnitCategory>(
    initialConfig?.defaultCategory || "length",
  );
  const [fromUnit, setFromUnit] = useState<string>(
    initialConfig?.defaultFromUnit || "m",
  );
  const [toUnit, setToUnit] = useState<string>(
    initialConfig?.defaultToUnit || "km",
  );
  const [inputValue, setInputValue] = useState<string>(
    initialConfig?.defaultValue?.toString() || "1",
  );
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // History
  const [history] = useState(() => new ConversionHistory(50));
  const [historyEntries, setHistoryEntries] = useState<ConversionEntry[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("converter");
  const [showHelp, setShowHelp] = useState(false);

  // Config
  const precision = initialConfig?.precision || 6;

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
    "units",
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

  // Perform conversion when input changes
  useEffect(() => {
    const value = parseValue(inputValue);
    if (value === null) {
      setResult("");
      setError(null);
      return;
    }

    try {
      const converted = convert(value, fromUnit, toUnit);
      setResult(formatValue(converted, precision));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion error");
      setResult("");
    }
  }, [inputValue, fromUnit, toUnit, precision]);

  // Update units when category changes
  useEffect(() => {
    const units = UNITS_BY_CATEGORY[category];
    if (units && units.length >= 2) {
      setFromUnit(units[0]!);
      setToUnit(units[1]!);
    }
  }, [category]);

  // Get units for current category
  const categoryUnits = UNITS_BY_CATEGORY[category] || [];

  // Cycle unit within category
  const cycleUnit = useCallback(
    (current: string, direction: 1 | -1, setter: (u: string) => void) => {
      const index = categoryUnits.indexOf(current);
      if (index === -1) return;

      let newIndex = index + direction;
      if (newIndex < 0) newIndex = categoryUnits.length - 1;
      if (newIndex >= categoryUnits.length) newIndex = 0;

      setter(categoryUnits[newIndex]!);
    },
    [categoryUnits],
  );

  // Swap units
  const swapUnits = useCallback(() => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  }, [fromUnit, toUnit]);

  // Clear input
  const clearInput = useCallback(() => {
    setInputValue("");
    setError(null);
  }, []);

  // Add to history
  const addToHistory = useCallback(() => {
    const value = parseValue(inputValue);
    if (value === null || error) return;

    try {
      const converted = convert(value, fromUnit, toUnit);
      history.add(value, fromUnit, converted, toUnit);
      setHistoryEntries(history.getAll());
    } catch {
      // Ignore errors when adding to history
    }
  }, [inputValue, fromUnit, toUnit, error, history]);

  // Apply preset
  const applyPreset = useCallback((preset: ConversionPreset) => {
    const cat = UNITS[preset.fromUnit]?.category;
    if (cat) {
      setCategory(cat);
      setFromUnit(preset.fromUnit);
      setToUnit(preset.toUnit);
      setInputValue(preset.defaultValue.toString());
      setViewMode("converter");
    }
  }, []);

  // Keyboard input
  useInput(
    (input, key) => {
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
        const lastEntry = history.getLast();
        const resultData: UnitsResult = {
          action: "close",
          lastFromValue: lastEntry?.fromValue,
          lastFromUnit: lastEntry?.fromUnit,
          lastToValue: lastEntry?.toValue,
          lastToUnit: lastEntry?.toUnit,
          historyCount: historyEntries.length,
        };
        ipc.sendSelected(resultData);
        exit();
        return;
      }

      // View mode toggles
      if (input === "h") {
        setViewMode((v) => (v === "history" ? "converter" : "history"));
        return;
      }

      if (input === "p") {
        setViewMode((v) => (v === "presets" ? "converter" : "presets"));
        return;
      }

      // In presets mode, input is handled by PresetsPanel
      if (viewMode === "presets") {
        return;
      }

      // Category selection (1-6)
      if (CATEGORY_KEYS[input]) {
        setCategory(CATEGORY_KEYS[input]!);
        return;
      }

      // Swap units
      if (input === "s") {
        swapUnits();
        return;
      }

      // Clear input
      if (input === "c") {
        clearInput();
        return;
      }

      // Add to history
      if (key.return) {
        addToHistory();
        return;
      }

      // Delete character
      if (key.backspace || key.delete) {
        setInputValue((v) => (v.length <= 1 ? "" : v.slice(0, -1)));
        return;
      }

      // Cycle from unit
      if (input === "[") {
        cycleUnit(fromUnit, -1, setFromUnit);
        return;
      }
      if (input === "]") {
        cycleUnit(fromUnit, 1, setFromUnit);
        return;
      }

      // Cycle to unit (shift + [ or ])
      if (input === "{") {
        cycleUnit(toUnit, -1, setToUnit);
        return;
      }
      if (input === "}") {
        cycleUnit(toUnit, 1, setToUnit);
        return;
      }

      // Number input
      if (/[0-9.]/.test(input)) {
        // Prevent multiple decimal points
        if (input === "." && inputValue.includes(".")) return;
        setInputValue((v) => (v === "0" ? input : v + input));
        return;
      }

      // Negative toggle
      if (input === "-") {
        setInputValue((v) => {
          if (v.startsWith("-")) {
            return v.slice(1);
          }
          return "-" + v;
        });
        return;
      }
    },
    { isActive: !showNav && viewMode !== "presets" },
  );

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const converterWidth = Math.min(60, termWidth - 4);

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={UNITS_COLORS.accent}
      >
        <Text color={UNITS_COLORS.primary} bold>
          {"// UNIT CONVERTER //"}
        </Text>
      </Box>

      {/* Category selector */}
      <Box justifyContent="center" marginY={1}>
        <CategorySelector category={category} width={converterWidth} />
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} paddingY={1}>
        {/* Converter panel */}
        <Box
          flexDirection="column"
          width={viewMode === "converter" ? "100%" : "50%"}
          alignItems="center"
        >
          {/* Conversion display */}
          <ConversionDisplay
            inputValue={inputValue}
            fromUnit={fromUnit}
            toUnit={toUnit}
            result={result}
            error={error}
            width={converterWidth}
          />

          {/* Unit selectors */}
          <Box marginTop={1} flexDirection="column" width={converterWidth}>
            <UnitSelector
              units={categoryUnits}
              selectedUnit={fromUnit}
              label="From [/]"
              width={converterWidth}
            />
            <Box marginTop={1}>
              <UnitSelector
                units={categoryUnits}
                selectedUnit={toUnit}
                label="To {/}"
                width={converterWidth}
              />
            </Box>
          </Box>
        </Box>

        {/* Side panel */}
        {viewMode === "history" && (
          <Box flexDirection="column" width="50%" paddingX={1}>
            <HistoryPanel
              history={historyEntries}
              width={Math.floor(termWidth * 0.45)}
              maxItems={Math.floor(termHeight - 12)}
            />
          </Box>
        )}

        {viewMode === "presets" && (
          <Box flexDirection="column" width="50%" paddingX={1}>
            <PresetsPanel
              onSelect={applyPreset}
              width={Math.floor(termWidth * 0.45)}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1}>
        <Text color={UNITS_COLORS.muted}>
          Tab nav | ? help | 0-9 value | [/] from | {"{/}"} to | s swap | c
          clear | Enter save | h history | p presets | q quit
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
            title="UNIT CONVERTER"
            bindings={UNITS_BINDINGS}
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
            currentCanvas="units"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
