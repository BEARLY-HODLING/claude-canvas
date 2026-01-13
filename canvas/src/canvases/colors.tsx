// Colors Canvas - Color picker with conversion and clipboard support

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type ColorsConfig,
  type ColorsResult,
  type ColorFormat,
  COLORS_COLORS,
} from "./colors/types";
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
  parseColor,
  formatColor,
  adjustBrightness,
  adjustHue,
  adjustSaturation,
  copyToClipboard,
  isValidHex,
  getComplementary,
  getAnalogous,
  getMonochromatic,
  getSuggestedTextColor,
  PRESET_COLORS,
  type Color,
} from "../services/colors";

// Colors-specific keybindings
const COLORS_BINDINGS: KeyBinding[] = [
  { key: "Enter", description: "Copy color to clipboard", category: "action" },
  { key: "c", description: "Copy color", category: "action" },
  { key: "f", description: "Cycle format (hex/rgb/hsl)", category: "view" },
  { key: "Up/Down", description: "Adjust brightness", category: "navigation" },
  { key: "Left/Right", description: "Adjust hue", category: "navigation" },
  { key: "s/S", description: "Adjust saturation -/+", category: "action" },
  { key: "p", description: "Toggle preset palette", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: ColorsConfig;
  socketPath?: string;
  scenario?: string;
}

// Color swatch component
function ColorSwatch({
  color,
  width,
  height,
  showLabel,
  label,
}: {
  color: Color;
  width: number;
  height: number;
  showLabel?: boolean;
  label?: string;
}) {
  const textColor = getSuggestedTextColor(color);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={COLORS_COLORS.dim}
    >
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height={height - 2}
      >
        {/* Render colored block using background */}
        <Text backgroundColor={color.hex} color={textColor.hex}>
          {" ".repeat(Math.max(1, width - 2))}
        </Text>
        <Text backgroundColor={color.hex} color={textColor.hex}>
          {showLabel
            ? (label || color.hex.toUpperCase())
                .slice(0, width - 2)
                .padStart(
                  Math.floor(
                    (width -
                      2 +
                      (label || color.hex.toUpperCase()).slice(0, width - 2)
                        .length) /
                      2,
                  ),
                )
                .padEnd(width - 2)
            : " ".repeat(Math.max(1, width - 2))}
        </Text>
        <Text backgroundColor={color.hex} color={textColor.hex}>
          {" ".repeat(Math.max(1, width - 2))}
        </Text>
      </Box>
    </Box>
  );
}

// Mini color swatch for palette
function MiniSwatch({
  color,
  isSelected,
}: {
  color: Color;
  isSelected: boolean;
}) {
  return (
    <Box>
      <Text
        backgroundColor={color.hex}
        color={getSuggestedTextColor(color).hex}
      >
        {isSelected ? "[" : " "}
      </Text>
      <Text backgroundColor={color.hex}> </Text>
      <Text
        backgroundColor={color.hex}
        color={getSuggestedTextColor(color).hex}
      >
        {isSelected ? "]" : " "}
      </Text>
    </Box>
  );
}

// Color info panel
function ColorInfoPanel({
  color,
  format,
  width,
}: {
  color: Color;
  format: ColorFormat;
  width: number;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS_COLORS.dim}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={COLORS_COLORS.neonMagenta} bold>
          {"[ COLOR INFO ]"}
        </Text>
      </Box>

      {/* Name if known */}
      {color.name && (
        <Box>
          <Text color={COLORS_COLORS.dim}>Name: </Text>
          <Text color={COLORS_COLORS.neonCyan} bold>
            {color.name}
          </Text>
        </Box>
      )}

      {/* HEX */}
      <Box>
        <Text color={COLORS_COLORS.dim}>HEX: </Text>
        <Text
          color={format === "hex" ? COLORS_COLORS.neonYellow : "white"}
          bold={format === "hex"}
        >
          {color.hex.toUpperCase()}
        </Text>
        {format === "hex" && <Text color={COLORS_COLORS.neonGreen}> *</Text>}
      </Box>

      {/* RGB */}
      <Box>
        <Text color={COLORS_COLORS.dim}>RGB: </Text>
        <Text
          color={format === "rgb" ? COLORS_COLORS.neonYellow : "white"}
          bold={format === "rgb"}
        >
          {formatColor(color, "rgb")}
        </Text>
        {format === "rgb" && <Text color={COLORS_COLORS.neonGreen}> *</Text>}
      </Box>

      {/* HSL */}
      <Box>
        <Text color={COLORS_COLORS.dim}>HSL: </Text>
        <Text
          color={format === "hsl" ? COLORS_COLORS.neonYellow : "white"}
          bold={format === "hsl"}
        >
          {formatColor(color, "hsl")}
        </Text>
        {format === "hsl" && <Text color={COLORS_COLORS.neonGreen}> *</Text>}
      </Box>

      {/* HSL values */}
      <Box marginTop={1}>
        <Text color={COLORS_COLORS.dim}>H: </Text>
        <Text color="white">{color.hsl.h}</Text>
        <Text color={COLORS_COLORS.dim}> S: </Text>
        <Text color="white">{color.hsl.s}%</Text>
        <Text color={COLORS_COLORS.dim}> L: </Text>
        <Text color="white">{color.hsl.l}%</Text>
      </Box>
    </Box>
  );
}

// Harmony colors panel
function HarmonyPanel({ color, width }: { color: Color; width: number }) {
  const complementary = getComplementary(color);
  const analogous = getAnalogous(color);
  const monochromatic = getMonochromatic(color, 5);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS_COLORS.dim}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={COLORS_COLORS.neonMagenta} bold>
          {"[ HARMONY ]"}
        </Text>
      </Box>

      {/* Complementary */}
      <Box>
        <Text color={COLORS_COLORS.dim}>Complement: </Text>
        <Text
          backgroundColor={complementary.hex}
          color={getSuggestedTextColor(complementary).hex}
        >
          {" " + complementary.hex.toUpperCase() + " "}
        </Text>
      </Box>

      {/* Analogous */}
      <Box marginTop={1}>
        <Text color={COLORS_COLORS.dim}>Analogous: </Text>
        {analogous.map((c, i) => (
          <Text
            key={i}
            backgroundColor={c.hex}
            color={getSuggestedTextColor(c).hex}
          >
            {" "}
          </Text>
        ))}
      </Box>

      {/* Monochromatic */}
      <Box marginTop={1}>
        <Text color={COLORS_COLORS.dim}>Shades: </Text>
        {monochromatic.map((c, i) => (
          <Text
            key={i}
            backgroundColor={c.hex}
            color={getSuggestedTextColor(c).hex}
          >
            {" "}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

export function ColorsCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "colors",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Color state
  const [currentColor, setCurrentColor] = useState<Color>(() =>
    parseColor(initialConfig?.initialColor || "#0080ff"),
  );
  const [format, setFormat] = useState<ColorFormat>(
    initialConfig?.format || "hex",
  );
  const [recentColors, setRecentColors] = useState<Color[]>(() =>
    (initialConfig?.recentColors || []).map(parseColor),
  );
  const maxRecent = initialConfig?.maxRecent || 12;

  // Input state
  const [inputMode, setInputMode] = useState(false);
  const [hexInput, setHexInput] = useState("");

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [showPalette, setShowPalette] = useState(
    initialConfig?.showPalette !== false,
  );
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      const result: ColorsResult = {
        action: "navigate",
        canvas: canvas.kind,
      };
      ipc.sendSelected(result);
    },
    [ipc],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "colors",
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

  // Clear copy message after delay
  useEffect(() => {
    if (copyMessage) {
      const timer = setTimeout(() => setCopyMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyMessage]);

  // Add color to recent
  const addToRecent = useCallback(
    (color: Color) => {
      setRecentColors((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter((c) => c.hex !== color.hex);
        // Add to front and limit size
        return [color, ...filtered].slice(0, maxRecent);
      });
    },
    [maxRecent],
  );

  // Copy current color
  const copyColor = useCallback(async () => {
    const text = formatColor(currentColor, format);
    try {
      await copyToClipboard(text);
      setCopyMessage(`Copied: ${text}`);
      addToRecent(currentColor);
    } catch {
      setCopyMessage("Copy failed");
    }
  }, [currentColor, format, addToRecent]);

  // Cycle format
  const cycleFormat = useCallback(() => {
    setFormat((f) => {
      if (f === "hex") return "rgb";
      if (f === "rgb") return "hsl";
      return "hex";
    });
  }, []);

  // Handle hex input submission
  const handleHexSubmit = useCallback(() => {
    const input = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (isValidHex(input)) {
      setCurrentColor(parseColor(input));
      setInputMode(false);
      setHexInput("");
    }
  }, [hexInput]);

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

      // Input mode
      if (inputMode) {
        if (key.escape) {
          setInputMode(false);
          setHexInput("");
        } else if (key.return) {
          handleHexSubmit();
        }
        return;
      }

      // Quit
      if (key.escape || input === "q") {
        const result: ColorsResult = {
          action: "close",
          color: currentColor,
          format,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Copy color
      if (input === "c" || key.return) {
        copyColor();
        return;
      }

      // Cycle format
      if (input === "f") {
        cycleFormat();
        return;
      }

      // Toggle palette
      if (input === "p") {
        setShowPalette((s) => !s);
        return;
      }

      // Enter hex input mode
      if (input === "#" || input === "i") {
        setInputMode(true);
        setHexInput("");
        return;
      }

      // Adjust brightness (up/down)
      if (key.upArrow) {
        setCurrentColor((c) => adjustBrightness(c, 5));
        return;
      }
      if (key.downArrow) {
        setCurrentColor((c) => adjustBrightness(c, -5));
        return;
      }

      // Adjust hue (left/right)
      if (key.leftArrow) {
        setCurrentColor((c) => adjustHue(c, -10));
        return;
      }
      if (key.rightArrow) {
        setCurrentColor((c) => adjustHue(c, 10));
        return;
      }

      // Adjust saturation
      if (input === "s") {
        setCurrentColor((c) => adjustSaturation(c, -5));
        return;
      }
      if (input === "S") {
        setCurrentColor((c) => adjustSaturation(c, 5));
        return;
      }

      // Palette navigation (when visible)
      if (showPalette) {
        if (input === "[") {
          setPaletteIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (input === "]") {
          setPaletteIndex((i) => Math.min(PRESET_COLORS.length - 1, i + 1));
          return;
        }
        // Number keys select from palette
        const num = parseInt(input);
        if (!isNaN(num) && num >= 1 && num <= PRESET_COLORS.length) {
          const presetColor = PRESET_COLORS[num - 1];
          if (presetColor) setCurrentColor(presetColor);
          return;
        }
      }

      // Recent colors selection (shift+number)
      if (key.shift && !isNaN(parseInt(input))) {
        const idx = parseInt(input) - 1;
        if (idx >= 0 && idx < recentColors.length) {
          const recentColor = recentColors[idx];
          if (recentColor) setCurrentColor(recentColor);
        }
      }
    },
    { isActive: !showNav },
  );

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  // Two-column layout
  const leftWidth = Math.max(30, Math.floor(termWidth * 0.4));
  const rightWidth = termWidth - leftWidth - 2;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={COLORS_COLORS.neonMagenta}
      >
        <Text color={COLORS_COLORS.neonCyan} bold>
          {"// COLOR PICKER //"}
        </Text>
        <Box>
          {copyMessage ? (
            <Text color={COLORS_COLORS.neonGreen}>{copyMessage}</Text>
          ) : (
            <Text color={COLORS_COLORS.dim}>
              Format: {format.toUpperCase()}
            </Text>
          )}
        </Box>
      </Box>

      {/* Input bar when active */}
      {inputMode && (
        <Box paddingX={1} marginY={1}>
          <Text color={COLORS_COLORS.neonCyan}>Enter hex: # </Text>
          <TextInput
            value={hexInput}
            onChange={setHexInput}
            placeholder="ff0080"
          />
          <Text color={COLORS_COLORS.dim}>
            {" "}
            (Enter to confirm, Esc to cancel)
          </Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left panel - Color swatch */}
        <Box flexDirection="column" width={leftWidth}>
          <Box marginBottom={1} paddingX={1}>
            <Text color={COLORS_COLORS.neonMagenta} bold>
              {"[ CURRENT COLOR ]"}
            </Text>
          </Box>

          {/* Main swatch */}
          <Box paddingX={1}>
            <ColorSwatch
              color={currentColor}
              width={leftWidth - 2}
              height={Math.min(10, contentHeight - 12)}
              showLabel
              label={formatColor(currentColor, format)}
            />
          </Box>

          {/* Color info */}
          <Box marginTop={1} paddingX={1}>
            <ColorInfoPanel
              color={currentColor}
              format={format}
              width={leftWidth - 2}
            />
          </Box>
        </Box>

        {/* Right panel - Palette & Harmony */}
        <Box flexDirection="column" width={rightWidth} marginLeft={1}>
          {/* Harmony colors */}
          <Box marginBottom={1}>
            <HarmonyPanel color={currentColor} width={rightWidth - 1} />
          </Box>

          {/* Preset palette */}
          {showPalette && (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1}>
                <Text color={COLORS_COLORS.neonMagenta} bold>
                  {"[ PALETTE ]"}
                </Text>
                <Text color={COLORS_COLORS.dim}> (1-9 to select)</Text>
              </Box>
              <Box
                flexDirection="row"
                flexWrap="wrap"
                borderStyle="single"
                borderColor={COLORS_COLORS.dim}
                paddingX={1}
              >
                {PRESET_COLORS.map((color, i) => (
                  <MiniSwatch
                    key={color.hex}
                    color={color}
                    isSelected={i === paletteIndex}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text color={COLORS_COLORS.neonMagenta} bold>
                  {"[ RECENT ]"}
                </Text>
                <Text color={COLORS_COLORS.dim}> (Shift+1-9 to select)</Text>
              </Box>
              <Box
                flexDirection="row"
                flexWrap="wrap"
                borderStyle="single"
                borderColor={COLORS_COLORS.dim}
                paddingX={1}
              >
                {recentColors.slice(0, 9).map((color, i) => (
                  <Box key={`${color.hex}-${i}`}>
                    <Text backgroundColor={color.hex}>{"   "}</Text>
                    <Text color={COLORS_COLORS.dim}> </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={COLORS_COLORS.dim}>
          {inputMode
            ? "Type hex value | Enter confirm | Esc cancel"
            : "Tab nav | ? help | c copy | f format | #/i input | arrows adjust | p palette | q quit"}
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
            title="COLOR PICKER"
            bindings={COLORS_BINDINGS}
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
            currentCanvas="colors"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
