// Calculator Canvas - A functional calculator with history and memory

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type CalculatorConfig,
  type CalculatorResult,
  type CalculationEntry,
  type ViewMode,
  CALC_COLORS,
  BUTTON_LAYOUT,
} from "./calculator/types";
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
  evaluate,
  Memory,
  History,
  formatDisplay,
} from "../services/calculator";

// Calculator-specific keybindings
const CALCULATOR_BINDINGS: KeyBinding[] = [
  { key: "0-9", description: "Enter digits", category: "action" },
  { key: "+-*/%", description: "Operators", category: "action" },
  { key: "()", description: "Parentheses", category: "action" },
  { key: "Enter/=", description: "Calculate", category: "action" },
  { key: "c", description: "Clear display", category: "action" },
  {
    key: "Backspace",
    description: "Delete last character",
    category: "action",
  },
  { key: "m", description: "Memory menu", category: "action" },
  { key: "h", description: "Toggle history", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: CalculatorConfig;
  socketPath?: string;
  scenario?: string;
}

// Generate unique ID
function generateId(): string {
  return `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

// Display component
function CalculatorDisplay({
  value,
  error,
  memory,
  width,
}: {
  value: string;
  error: string | null;
  memory: number;
  width: number;
}) {
  const displayWidth = Math.max(20, width - 4);
  const displayValue = error || formatDisplay(value);

  // Truncate if too long
  const truncated =
    displayValue.length > displayWidth
      ? "..." + displayValue.slice(-(displayWidth - 3))
      : displayValue;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={error ? CALC_COLORS.error : CALC_COLORS.accent}
      paddingX={1}
      width={width}
    >
      {/* Memory indicator */}
      <Box justifyContent="space-between">
        <Text color={CALC_COLORS.muted}>
          {memory !== 0 ? `M: ${formatDisplay(memory.toString())}` : ""}
        </Text>
        <Text color={CALC_COLORS.muted}>{error ? "ERR" : ""}</Text>
      </Box>

      {/* Main display */}
      <Box justifyContent="flex-end" marginY={1}>
        <Text color={error ? CALC_COLORS.error : CALC_COLORS.result} bold>
          {truncated || "0"}
        </Text>
      </Box>
    </Box>
  );
}

// Button grid component
function ButtonGrid({ width }: { width: number }) {
  const buttonWidth = Math.floor((width - 10) / 4);

  return (
    <Box flexDirection="column" paddingX={1}>
      {BUTTON_LAYOUT.map((row, rowIndex) => (
        <Box key={rowIndex} flexDirection="row" justifyContent="space-around">
          {row.map((button) => {
            let color: string;
            switch (button.type) {
              case "number":
                color = CALC_COLORS.number;
                break;
              case "operator":
                color = CALC_COLORS.operator;
                break;
              case "memory":
                color = CALC_COLORS.memory;
                break;
              case "control":
                color = CALC_COLORS.primary;
                break;
              default:
                color = CALC_COLORS.muted;
            }

            return (
              <Box
                key={button.key}
                width={buttonWidth}
                justifyContent="center"
                marginX={1}
              >
                <Text color={color}>[{button.label}]</Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

// History panel component
function HistoryPanel({
  history,
  width,
  maxItems = 10,
}: {
  history: CalculationEntry[];
  width: number;
  maxItems?: number;
}) {
  const visibleHistory = history.slice(0, maxItems);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={CALC_COLORS.secondary} bold>
          {"[ HISTORY ]"}
        </Text>
        <Text color={CALC_COLORS.muted}> ({history.length} items)</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={CALC_COLORS.muted}
        paddingX={1}
        height={Math.min(maxItems + 2, 12)}
      >
        {visibleHistory.length > 0 ? (
          visibleHistory.map((calc) => (
            <Box
              key={calc.id}
              flexDirection="row"
              justifyContent="space-between"
            >
              <Box width={Math.floor(width * 0.6)}>
                <Text color={CALC_COLORS.muted}>
                  {calc.expression.slice(0, Math.floor(width * 0.4))}
                </Text>
                <Text color={CALC_COLORS.operator}> = </Text>
                <Text color={CALC_COLORS.result}>{calc.result}</Text>
              </Box>
              <Text color={CALC_COLORS.muted}>
                {formatRelativeTime(calc.timestamp)}
              </Text>
            </Box>
          ))
        ) : (
          <Text color={CALC_COLORS.muted}>No calculations yet</Text>
        )}
      </Box>
    </Box>
  );
}

// Memory menu component
function MemoryMenu({
  onSelect,
  onClose,
}: {
  onSelect: (action: "MC" | "MR" | "M+" | "M-" | "MS") => void;
  onClose: () => void;
}) {
  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    switch (input.toLowerCase()) {
      case "c":
        onSelect("MC");
        break;
      case "r":
        onSelect("MR");
        break;
      case "+":
        onSelect("M+");
        break;
      case "-":
        onSelect("M-");
        break;
      case "s":
        onSelect("MS");
        break;
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={CALC_COLORS.memory}
      paddingX={2}
      paddingY={1}
    >
      <Text color={CALC_COLORS.memory} bold>
        {"[ MEMORY ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={CALC_COLORS.muted}>c</Text>
        <Text> - MC (Clear)</Text>
      </Box>
      <Box>
        <Text color={CALC_COLORS.muted}>r</Text>
        <Text> - MR (Recall)</Text>
      </Box>
      <Box>
        <Text color={CALC_COLORS.muted}>+</Text>
        <Text> - M+ (Add)</Text>
      </Box>
      <Box>
        <Text color={CALC_COLORS.muted}>-</Text>
        <Text> - M- (Subtract)</Text>
      </Box>
      <Box>
        <Text color={CALC_COLORS.muted}>s</Text>
        <Text> - MS (Store)</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={CALC_COLORS.muted}>Esc to close</Text>
      </Box>
    </Box>
  );
}

export function CalculatorCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "calculator",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Calculator state
  const [display, setDisplay] = useState("0");
  const [memory] = useState(() => new Memory());
  const [memoryValue, setMemoryValue] = useState(0);
  const [history] = useState(() => new History(50));
  const [historyEntries, setHistoryEntries] = useState<CalculationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("calculator");
  const [showHelp, setShowHelp] = useState(false);
  const [showMemoryMenu, setShowMemoryMenu] = useState(false);

  // Config
  const precision = initialConfig?.precision || 10;

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
    "calculator",
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

  // Append to display
  const appendToDisplay = useCallback(
    (char: string) => {
      setError(null);
      setDisplay((prev) => {
        // If display is just "0" or last result, replace it
        if (prev === "0" || prev === lastResult) {
          // Unless we're adding an operator
          if ("+-*/%".includes(char)) {
            return prev + char;
          }
          return char;
        }
        return prev + char;
      });
    },
    [lastResult],
  );

  // Clear display
  const clearDisplay = useCallback(() => {
    setDisplay("0");
    setError(null);
  }, []);

  // Delete last character
  const deleteChar = useCallback(() => {
    setError(null);
    setDisplay((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, []);

  // Calculate result
  const calculate = useCallback(() => {
    try {
      const result = evaluate(display);

      // Add to history
      const entry: CalculationEntry = {
        id: generateId(),
        expression: display,
        result,
        timestamp: new Date(),
      };
      history.add(display, result);
      setHistoryEntries(history.getAll());

      setDisplay(result);
      setLastResult(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }, [display, history]);

  // Handle memory operations
  const handleMemory = useCallback(
    (action: "MC" | "MR" | "M+" | "M-" | "MS") => {
      setShowMemoryMenu(false);
      setError(null);

      try {
        switch (action) {
          case "MC":
            memory.clear();
            break;
          case "MR":
            setDisplay(memory.recall().toString());
            break;
          case "M+":
            memory.add(parseFloat(display) || 0);
            break;
          case "M-":
            memory.subtract(parseFloat(display) || 0);
            break;
          case "MS":
            memory.store(parseFloat(display) || 0);
            break;
        }
        setMemoryValue(memory.getValue());
      } catch (err) {
        setError("Memory error");
      }
    },
    [display, memory],
  );

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

      // Memory menu
      if (showMemoryMenu) {
        return; // Handled by MemoryMenu component
      }

      // Quit
      if (key.escape || input === "q") {
        const result: CalculatorResult = {
          action: "close",
          lastExpression: display,
          lastResult: lastResult || undefined,
          historyCount: historyEntries.length,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Calculator controls
      if (input === "c") {
        clearDisplay();
        return;
      }

      if (key.backspace || key.delete) {
        deleteChar();
        return;
      }

      if (key.return || input === "=") {
        calculate();
        return;
      }

      // Memory menu toggle
      if (input === "m") {
        setShowMemoryMenu(true);
        return;
      }

      // History toggle
      if (input === "h") {
        setViewMode((v) => (v === "calculator" ? "history" : "calculator"));
        return;
      }

      // Number input
      if (/[0-9.]/.test(input)) {
        // Prevent multiple decimal points
        if (input === ".") {
          const lastNumber = display.split(/[+\-*/%()]/).pop() || "";
          if (lastNumber.includes(".")) return;
        }
        appendToDisplay(input);
        return;
      }

      // Operators
      if ("+-*/%^".includes(input)) {
        appendToDisplay(input);
        return;
      }

      // Parentheses
      if (input === "(" || input === ")") {
        appendToDisplay(input);
        return;
      }
    },
    { isActive: !showNav && !showMemoryMenu },
  );

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const calcWidth = Math.min(50, termWidth - 4);

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={CALC_COLORS.accent}
      >
        <Text color={CALC_COLORS.primary} bold>
          {"// CALCULATOR //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} paddingY={1}>
        {/* Calculator panel */}
        <Box
          flexDirection="column"
          width={viewMode === "history" ? "50%" : "100%"}
          alignItems="center"
        >
          {/* Display */}
          <CalculatorDisplay
            value={display}
            error={error}
            memory={memoryValue}
            width={calcWidth}
          />

          {/* Button grid */}
          <Box marginTop={1}>
            <ButtonGrid width={calcWidth} />
          </Box>
        </Box>

        {/* History panel */}
        {viewMode === "history" && (
          <Box flexDirection="column" width="50%" paddingX={1}>
            <HistoryPanel
              history={historyEntries}
              width={Math.floor(termWidth * 0.45)}
              maxItems={Math.floor(termHeight - 10)}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1}>
        <Text color={CALC_COLORS.muted}>
          Tab nav | ? help | 0-9 digits | +-*/% ops | Enter calc | c clear |
          Backspace del | m memory | h history | q quit
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
            title="CALCULATOR"
            bindings={CALCULATOR_BINDINGS}
            visible={showHelp}
            width={Math.min(50, termWidth - 10)}
          />
        </Box>
      )}

      {/* Memory menu overlay */}
      {showMemoryMenu && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <MemoryMenu
            onSelect={handleMemory}
            onClose={() => setShowMemoryMenu(false)}
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
            currentCanvas="calculator"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
