// Password Generator Canvas - Secure password and passphrase generator

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type PasswordConfig,
  type PasswordResult,
  type ViewMode,
  type GenerationMode,
  PASSWORD_COLORS,
  CHAR_SET_LABELS,
  LENGTH_PRESETS,
  WORD_COUNT_PRESETS,
  SEPARATOR_OPTIONS,
} from "./password/types";
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
  generatePassword,
  generatePassphrase,
  calculateStrength,
  getStrengthColor,
  getStrengthBar,
  calculateEntropy,
  PasswordHistory,
  copyToClipboard,
  type PasswordOptions,
  type PassphraseOptions,
  type GeneratedPassword,
  DEFAULT_PASSWORD_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
} from "../services/password";

// Password-specific keybindings
const PASSWORD_BINDINGS: KeyBinding[] = [
  { key: "g/Space", description: "Generate new password", category: "action" },
  { key: "c", description: "Copy to clipboard", category: "action" },
  {
    key: "m",
    description: "Toggle mode (password/passphrase)",
    category: "view",
  },
  { key: "+/-", description: "Adjust length/word count", category: "action" },
  { key: "u", description: "Toggle uppercase", category: "action" },
  { key: "l", description: "Toggle lowercase", category: "action" },
  { key: "n", description: "Toggle numbers", category: "action" },
  { key: "s", description: "Toggle symbols", category: "action" },
  { key: "x", description: "Toggle exclude similar", category: "action" },
  { key: "h", description: "Toggle history", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

interface Props {
  id: string;
  config?: PasswordConfig;
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

// Password Display component
function PasswordDisplay({
  password,
  strength,
  entropy,
  width,
  copied,
}: {
  password: string;
  strength: ReturnType<typeof calculateStrength>;
  entropy: number;
  width: number;
  copied: boolean;
}) {
  const displayWidth = Math.max(30, width - 4);
  const strengthColor = getStrengthColor(strength);
  const strengthBar = getStrengthBar(strength, 15);

  // Truncate if too long
  const truncated =
    password.length > displayWidth
      ? password.slice(0, displayWidth - 3) + "..."
      : password;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={PASSWORD_COLORS.accent}
      paddingX={1}
      width={width}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Text color={PASSWORD_COLORS.muted}>Generated Password</Text>
        {copied && <Text color={PASSWORD_COLORS.primary}>Copied!</Text>}
      </Box>

      {/* Password display */}
      <Box justifyContent="center" marginY={1}>
        <Text color={PASSWORD_COLORS.result} bold>
          {truncated || "Press g to generate"}
        </Text>
      </Box>

      {/* Strength meter */}
      {password && (
        <Box justifyContent="space-between">
          <Box>
            <Text color={PASSWORD_COLORS.muted}>Strength: </Text>
            <Text color={strengthColor} bold>
              {strength.toUpperCase()}
            </Text>
          </Box>
          <Text color={strengthColor}>{strengthBar}</Text>
        </Box>
      )}

      {/* Entropy */}
      {password && (
        <Box>
          <Text color={PASSWORD_COLORS.muted}>Entropy: </Text>
          <Text color={PASSWORD_COLORS.secondary}>{entropy} bits</Text>
        </Box>
      )}
    </Box>
  );
}

// Options panel component
function OptionsPanel({
  mode,
  options,
  passphraseOptions,
  width,
}: {
  mode: GenerationMode;
  options: PasswordOptions;
  passphraseOptions: PassphraseOptions;
  width: number;
}) {
  if (mode === "password") {
    return (
      <Box flexDirection="column" width={width}>
        <Box marginBottom={1}>
          <Text color={PASSWORD_COLORS.secondary} bold>
            {"[ PASSWORD OPTIONS ]"}
          </Text>
        </Box>

        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={PASSWORD_COLORS.muted}
          paddingX={1}
        >
          {/* Length */}
          <Box>
            <Text color={PASSWORD_COLORS.muted}>Length (+/-): </Text>
            <Text color={PASSWORD_COLORS.accent} bold>
              {options.length}
            </Text>
            <Text color={PASSWORD_COLORS.muted}> chars</Text>
          </Box>

          {/* Character sets */}
          <Box marginTop={1} flexDirection="column">
            <Text color={PASSWORD_COLORS.muted}>Character Sets:</Text>
            <Box marginLeft={2} flexDirection="column">
              <Box>
                <Text
                  color={
                    options.uppercase
                      ? PASSWORD_COLORS.primary
                      : PASSWORD_COLORS.muted
                  }
                >
                  [u] {CHAR_SET_LABELS.uppercase}{" "}
                  {options.uppercase ? "ON" : "off"}
                </Text>
              </Box>
              <Box>
                <Text
                  color={
                    options.lowercase
                      ? PASSWORD_COLORS.primary
                      : PASSWORD_COLORS.muted
                  }
                >
                  [l] {CHAR_SET_LABELS.lowercase}{" "}
                  {options.lowercase ? "ON" : "off"}
                </Text>
              </Box>
              <Box>
                <Text
                  color={
                    options.numbers
                      ? PASSWORD_COLORS.primary
                      : PASSWORD_COLORS.muted
                  }
                >
                  [n] {CHAR_SET_LABELS.numbers} {options.numbers ? "ON" : "off"}
                </Text>
              </Box>
              <Box>
                <Text
                  color={
                    options.symbols
                      ? PASSWORD_COLORS.primary
                      : PASSWORD_COLORS.muted
                  }
                >
                  [s] {CHAR_SET_LABELS.symbols} {options.symbols ? "ON" : "off"}
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Exclude similar */}
          <Box marginTop={1}>
            <Text
              color={
                options.excludeSimilar
                  ? PASSWORD_COLORS.warning
                  : PASSWORD_COLORS.muted
              }
            >
              [x] Exclude similar ({CHAR_SET_LABELS.excludeSimilar}):{" "}
              {options.excludeSimilar ? "ON" : "off"}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Passphrase options
  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={PASSWORD_COLORS.secondary} bold>
          {"[ PASSPHRASE OPTIONS ]"}
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={PASSWORD_COLORS.muted}
        paddingX={1}
      >
        {/* Word count */}
        <Box>
          <Text color={PASSWORD_COLORS.muted}>Words (+/-): </Text>
          <Text color={PASSWORD_COLORS.accent} bold>
            {passphraseOptions.wordCount}
          </Text>
        </Box>

        {/* Separator */}
        <Box>
          <Text color={PASSWORD_COLORS.muted}>Separator: </Text>
          <Text color={PASSWORD_COLORS.accent} bold>
            "{passphraseOptions.separator}"
          </Text>
        </Box>

        {/* Options */}
        <Box marginTop={1} flexDirection="column">
          <Text color={PASSWORD_COLORS.muted}>Options:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Box>
              <Text
                color={
                  passphraseOptions.capitalize
                    ? PASSWORD_COLORS.primary
                    : PASSWORD_COLORS.muted
                }
              >
                [u] Capitalize: {passphraseOptions.capitalize ? "ON" : "off"}
              </Text>
            </Box>
            <Box>
              <Text
                color={
                  passphraseOptions.includeNumber
                    ? PASSWORD_COLORS.primary
                    : PASSWORD_COLORS.muted
                }
              >
                [n] Include number:{" "}
                {passphraseOptions.includeNumber ? "ON" : "off"}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// History panel component
function HistoryPanel({
  history,
  selectedIndex,
  width,
  maxItems = 10,
}: {
  history: GeneratedPassword[];
  selectedIndex: number;
  width: number;
  maxItems?: number;
}) {
  const visibleHistory = history.slice(0, maxItems);

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={PASSWORD_COLORS.secondary} bold>
          {"[ HISTORY ]"}
        </Text>
        <Text color={PASSWORD_COLORS.muted}> ({history.length} items)</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={PASSWORD_COLORS.muted}
        paddingX={1}
        height={Math.min(maxItems + 2, 12)}
      >
        {visibleHistory.length > 0 ? (
          visibleHistory.map((pwd, index) => {
            const isSelected = index === selectedIndex;
            const strengthColor = getStrengthColor(pwd.strength);
            const truncatedValue =
              pwd.value.length > 25
                ? pwd.value.slice(0, 22) + "..."
                : pwd.value;

            return (
              <Box
                key={pwd.id}
                flexDirection="row"
                justifyContent="space-between"
              >
                <Box>
                  <Text
                    color={
                      isSelected
                        ? PASSWORD_COLORS.accent
                        : PASSWORD_COLORS.muted
                    }
                  >
                    {isSelected ? ">" : " "}
                  </Text>
                  <Text color={strengthColor}>{truncatedValue}</Text>
                </Box>
                <Box>
                  <Text color={PASSWORD_COLORS.muted}>
                    {pwd.type === "passphrase" ? "phrase" : "pwd"}
                  </Text>
                  <Text color={PASSWORD_COLORS.muted}> </Text>
                  <Text color={PASSWORD_COLORS.muted}>
                    {formatRelativeTime(pwd.timestamp)}
                  </Text>
                </Box>
              </Box>
            );
          })
        ) : (
          <Text color={PASSWORD_COLORS.muted}>No passwords generated yet</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color={PASSWORD_COLORS.muted}>
          Up/Down to select | Enter to copy | d to delete
        </Text>
      </Box>
    </Box>
  );
}

// Mode toggle component
function ModeToggle({ mode }: { mode: GenerationMode }) {
  return (
    <Box>
      <Text color={PASSWORD_COLORS.muted}>[m] Mode: </Text>
      <Text
        color={
          mode === "password" ? PASSWORD_COLORS.accent : PASSWORD_COLORS.muted
        }
        bold={mode === "password"}
      >
        Password
      </Text>
      <Text color={PASSWORD_COLORS.muted}> | </Text>
      <Text
        color={
          mode === "passphrase" ? PASSWORD_COLORS.accent : PASSWORD_COLORS.muted
        }
        bold={mode === "passphrase"}
      >
        Passphrase
      </Text>
    </Box>
  );
}

export function PasswordCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "password",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>(
    DEFAULT_PASSWORD_OPTIONS,
  );
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>(
    DEFAULT_PASSPHRASE_OPTIONS,
  );
  const [history] = useState(() => new PasswordHistory(50));
  const [historyEntries, setHistoryEntries] = useState<GeneratedPassword[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // UI state
  const [mode, setMode] = useState<GenerationMode>(
    initialConfig?.defaultMode || "password",
  );
  const [viewMode, setViewMode] = useState<ViewMode>("generator");
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    "password",
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

  // Generate a new password
  const generate = useCallback(() => {
    setError(null);
    setCopied(false);

    try {
      let newPassword: string;

      if (mode === "password") {
        newPassword = generatePassword(passwordOptions);
      } else {
        newPassword = generatePassphrase(passphraseOptions);
      }

      setCurrentPassword(newPassword);

      // Add to history
      history.add(
        newPassword,
        mode,
        mode === "password" ? passwordOptions : passphraseOptions,
      );
      setHistoryEntries(history.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [mode, passwordOptions, passphraseOptions, history]);

  // Copy password to clipboard
  const copyPasswordToClipboard = useCallback(
    async (password?: string) => {
      const toCopy = password || currentPassword;
      if (!toCopy) return;

      try {
        await copyToClipboard(toCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setError("Failed to copy to clipboard");
      }
    },
    [currentPassword],
  );

  // Toggle character option
  const toggleOption = useCallback(
    (option: keyof Omit<PasswordOptions, "length">) => {
      setPasswordOptions((prev) => ({
        ...prev,
        [option]: !prev[option],
      }));
    },
    [],
  );

  // Toggle passphrase option
  const togglePassphraseOption = useCallback(
    (option: keyof Omit<PassphraseOptions, "wordCount" | "separator">) => {
      setPassphraseOptions((prev) => ({
        ...prev,
        [option]: !prev[option],
      }));
    },
    [],
  );

  // Adjust length/word count
  const adjustLength = useCallback(
    (delta: number) => {
      if (mode === "password") {
        setPasswordOptions((prev) => ({
          ...prev,
          length: Math.min(128, Math.max(8, prev.length + delta)),
        }));
      } else {
        setPassphraseOptions((prev) => ({
          ...prev,
          wordCount: Math.min(10, Math.max(2, prev.wordCount + delta)),
        }));
      }
    },
    [mode],
  );

  // Delete from history
  const deleteFromHistory = useCallback(() => {
    if (historyEntries.length === 0) return;

    const toDelete = historyEntries[historyIndex];
    if (toDelete) {
      history.remove(toDelete.id);
      setHistoryEntries(history.getAll());
      setHistoryIndex((prev) =>
        Math.min(prev, Math.max(0, historyEntries.length - 2)),
      );
    }
  }, [history, historyEntries, historyIndex]);

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
        const result: PasswordResult = {
          action: "close",
          lastPassword: currentPassword || undefined,
          historyCount: historyEntries.length,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // History navigation when in history view
      if (viewMode === "history") {
        if (key.upArrow) {
          setHistoryIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (key.downArrow) {
          setHistoryIndex((prev) =>
            Math.min(historyEntries.length - 1, prev + 1),
          );
          return;
        }
        if (key.return) {
          const selected = historyEntries[historyIndex];
          if (selected) {
            copyPasswordToClipboard(selected.value);
          }
          return;
        }
        if (input === "d") {
          deleteFromHistory();
          return;
        }
      }

      // Generate
      if (input === "g" || input === " ") {
        generate();
        return;
      }

      // Copy
      if (input === "c") {
        copyPasswordToClipboard();
        return;
      }

      // Toggle mode
      if (input === "m") {
        setMode((prev) => (prev === "password" ? "passphrase" : "password"));
        return;
      }

      // Toggle history view
      if (input === "h") {
        setViewMode((v) => (v === "generator" ? "history" : "generator"));
        return;
      }

      // Refresh (regenerate)
      if (input === "r") {
        generate();
        return;
      }

      // Adjust length/word count
      if (input === "+" || input === "=") {
        adjustLength(1);
        return;
      }
      if (input === "-" || input === "_") {
        adjustLength(-1);
        return;
      }

      // Toggle character options (password mode)
      if (mode === "password") {
        if (input === "u") {
          toggleOption("uppercase");
          return;
        }
        if (input === "l") {
          toggleOption("lowercase");
          return;
        }
        if (input === "n") {
          toggleOption("numbers");
          return;
        }
        if (input === "s") {
          toggleOption("symbols");
          return;
        }
        if (input === "x") {
          toggleOption("excludeSimilar");
          return;
        }
      }

      // Toggle passphrase options
      if (mode === "passphrase") {
        if (input === "u") {
          togglePassphraseOption("capitalize");
          return;
        }
        if (input === "n") {
          togglePassphraseOption("includeNumber");
          return;
        }
      }
    },
    { isActive: !showNav },
  );

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const panelWidth = Math.min(50, termWidth - 4);

  // Calculate current password strength
  const strength = currentPassword
    ? calculateStrength(currentPassword)
    : "weak";
  const entropy = currentPassword ? calculateEntropy(currentPassword) : 0;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={PASSWORD_COLORS.accent}
      >
        <Text color={PASSWORD_COLORS.primary} bold>
          {"// PASSWORD GENERATOR //"}
        </Text>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1}>
          <Text color={PASSWORD_COLORS.error}>Error: {error}</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} paddingY={1}>
        {/* Generator panel */}
        <Box
          flexDirection="column"
          width={viewMode === "history" ? "50%" : "100%"}
          alignItems="center"
        >
          {/* Mode toggle */}
          <Box marginBottom={1}>
            <ModeToggle mode={mode} />
          </Box>

          {/* Password display */}
          <PasswordDisplay
            password={currentPassword}
            strength={strength}
            entropy={entropy}
            width={panelWidth}
            copied={copied}
          />

          {/* Options panel */}
          <Box marginTop={1}>
            <OptionsPanel
              mode={mode}
              options={passwordOptions}
              passphraseOptions={passphraseOptions}
              width={panelWidth}
            />
          </Box>

          {/* Quick actions */}
          <Box marginTop={1}>
            <Text color={PASSWORD_COLORS.muted}>
              [g/Space] Generate | [c] Copy | [+/-] Length
            </Text>
          </Box>
        </Box>

        {/* History panel */}
        {viewMode === "history" && (
          <Box flexDirection="column" width="50%" paddingX={1}>
            <HistoryPanel
              history={historyEntries}
              selectedIndex={historyIndex}
              width={Math.floor(termWidth * 0.45)}
              maxItems={Math.floor(termHeight - 10)}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1}>
        <Text color={PASSWORD_COLORS.muted}>
          Tab nav | ? help | g generate | c copy | m mode | h history | +/-
          length | q quit
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
            title="PASSWORD GENERATOR"
            bindings={PASSWORD_BINDINGS}
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
            currentCanvas="password"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
