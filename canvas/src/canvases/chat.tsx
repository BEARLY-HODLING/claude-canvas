// Chat Canvas - AI Chat interface with conversation history

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type ChatConfig,
  type ChatResult,
  type ChatMessage,
  CHAT_COLORS,
} from "./chat/types";
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
import { ChatService } from "../services/chat";

interface Props {
  id: string;
  config?: ChatConfig;
  socketPath?: string;
  scenario?: string;
}

// Chat-specific keybindings
const CHAT_BINDINGS: KeyBinding[] = [
  { key: "Enter", description: "Send message", category: "action" },
  { key: "Up/Down", description: "Scroll history", category: "navigation" },
  { key: "c", description: "Clear history", category: "action" },
  { key: "Esc", description: "Cancel input / Quit", category: "other" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Format timestamp for display
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Message display component
function MessageDisplay({
  message,
  width,
}: {
  message: ChatMessage;
  width: number;
}) {
  const isUser = message.role === "user";
  const maxContentWidth = Math.max(20, width - 15);

  // Word wrap content
  const wrapText = (text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxWidth) {
        lines.push(paragraph);
      } else {
        const words = paragraph.split(" ");
        let currentLine = "";

        for (const word of words) {
          if (currentLine.length + word.length + 1 <= maxWidth) {
            currentLine += (currentLine ? " " : "") + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
      }
    }

    return lines;
  };

  const contentLines = wrapText(message.content, maxContentWidth);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Role indicator and timestamp */}
      <Box>
        <Text
          color={
            isUser ? CHAT_COLORS.userMessage : CHAT_COLORS.assistantMessage
          }
          bold
        >
          {isUser ? "You" : "Assistant"}
        </Text>
        <Text color={CHAT_COLORS.timestamp}>
          {" "}
          {formatTimestamp(message.timestamp)}
        </Text>
      </Box>

      {/* Message content */}
      <Box flexDirection="column" marginLeft={2}>
        {contentLines.map((line, idx) => (
          <Text
            key={idx}
            color={
              isUser ? CHAT_COLORS.userMessage : CHAT_COLORS.assistantMessage
            }
          >
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

// Clear confirmation component
function ClearConfirmation({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (input.toLowerCase() === "y") {
      onConfirm();
    } else if (input.toLowerCase() === "n" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={CHAT_COLORS.warning} bold>
        Clear all conversation history?
      </Text>
      <Text color={CHAT_COLORS.muted}>
        Press Y to confirm, N or Esc to cancel
      </Text>
    </Box>
  );
}

export function ChatCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "chat",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Chat service
  const chatServiceRef = useRef(
    new ChatService({
      systemPrompt: initialConfig?.systemPrompt,
      model: initialConfig?.model,
    }),
  );

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [inputFocused, setInputFocused] = useState(true);

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      const result: ChatResult = {
        action: "navigate",
        canvas: canvas.kind,
        messageCount: messages.length,
      };
      ipc.sendSelected(result);
    },
    [ipc, messages.length],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "chat",
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

  // Add welcome message on mount
  useEffect(() => {
    if (initialConfig?.welcomeMessage) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: initialConfig.welcomeMessage,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  }, [initialConfig?.welcomeMessage]);

  // Send message handler
  const sendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    setIsLoading(true);
    setError(null);
    setInputValue("");

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Reset scroll to show latest
    setScrollOffset(0);

    try {
      const response = await chatServiceRef.current.sendMessage(trimmedInput);

      if (response.error) {
        setError(response.error);
      } else {
        setMessages((prev) => [...prev, response.message]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  // Clear history handler
  const clearHistory = useCallback(() => {
    chatServiceRef.current.clearHistory();
    setMessages([]);
    setScrollOffset(0);
    setShowClearConfirm(false);
    setError(null);
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

      // Clear confirmation
      if (showClearConfirm) {
        // Handled by ClearConfirmation component
        return;
      }

      // Handle quit
      if (key.escape && !inputValue) {
        const result: ChatResult = {
          action: "quit",
          messageCount: messages.length,
        };
        ipc.sendCancelled("User quit");
        exit();
        return;
      }

      // Escape clears input if there's content
      if (key.escape && inputValue) {
        setInputValue("");
        return;
      }

      // Clear history shortcut
      if (input === "c" && !inputFocused) {
        setShowClearConfirm(true);
        return;
      }

      // Scroll history
      if (!inputFocused || !inputValue) {
        if (key.upArrow) {
          setScrollOffset((s) =>
            Math.min(s + 1, Math.max(0, messages.length - 3)),
          );
          return;
        }
        if (key.downArrow) {
          setScrollOffset((s) => Math.max(0, s - 1));
          return;
        }
      }
    },
    { isActive: !showClearConfirm && !showNav },
  );

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const inputHeight = 4;
  const statusBarHeight = 2;
  const contentHeight =
    termHeight - headerHeight - inputHeight - statusBarHeight;
  const messageWidth = Math.max(40, termWidth - 4);

  // Calculate visible messages
  const visibleMessageCount = Math.max(3, Math.floor(contentHeight / 4));
  const startIndex = Math.max(
    0,
    messages.length - visibleMessageCount - scrollOffset,
  );
  const visibleMessages = messages.slice(
    startIndex,
    startIndex + visibleMessageCount,
  );

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={CHAT_COLORS.primary}
      >
        <Box>
          <Text color={CHAT_COLORS.primary} bold>
            {"// AI CHAT //"}
          </Text>
          {isLoading && (
            <Text color={CHAT_COLORS.accent}>
              {" "}
              <Spinner type="dots" />
            </Text>
          )}
        </Box>
        <Box>
          <Text color={CHAT_COLORS.muted}>
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </Text>
          <Text color={CHAT_COLORS.muted}>
            {" "}
            | {chatServiceRef.current.getModel()}
          </Text>
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1}>
          <Text color={CHAT_COLORS.danger}>Error: {error}</Text>
        </Box>
      )}

      {/* Clear confirmation */}
      {showClearConfirm && (
        <ClearConfirmation
          onConfirm={clearHistory}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* Message history */}
      {!showClearConfirm && (
        <Box
          flexDirection="column"
          height={contentHeight}
          paddingX={1}
          overflow="hidden"
        >
          {messages.length === 0 ? (
            <Box flexDirection="column" marginTop={2}>
              <Text color={CHAT_COLORS.muted}>No messages yet.</Text>
              <Text color={CHAT_COLORS.accent}>
                Type a message below to start chatting.
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {/* Scroll indicator (top) */}
              {startIndex > 0 && (
                <Box justifyContent="center" marginBottom={1}>
                  <Text color={CHAT_COLORS.muted}>
                    ↑ {startIndex} more message{startIndex !== 1 ? "s" : ""}{" "}
                    above
                  </Text>
                </Box>
              )}

              {/* Messages */}
              {visibleMessages.map((message) => (
                <MessageDisplay
                  key={message.id}
                  message={message}
                  width={messageWidth}
                />
              ))}

              {/* Scroll indicator (bottom) */}
              {scrollOffset > 0 && (
                <Box justifyContent="center" marginTop={1}>
                  <Text color={CHAT_COLORS.muted}>
                    ↓ {scrollOffset} more message{scrollOffset !== 1 ? "s" : ""}{" "}
                    below
                  </Text>
                </Box>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <Box marginTop={1}>
                  <Text color={CHAT_COLORS.accent}>
                    <Spinner type="dots" /> Thinking...
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Input area */}
      {!showClearConfirm && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={CHAT_COLORS.inputBorder}
          paddingX={1}
          marginX={1}
        >
          <Box>
            <Text color={CHAT_COLORS.accent}>{">"} </Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={sendMessage}
              placeholder="Type a message..."
              focus={inputFocused && !showNav && !showHelp && !showClearConfirm}
            />
          </Box>
          <Text color={CHAT_COLORS.muted}>
            Enter send | Esc clear/quit | ↑/↓ scroll
          </Text>
        </Box>
      )}

      {/* Status bar */}
      <Box paddingX={1}>
        <Text color={CHAT_COLORS.muted}>
          Tab nav | ? help | c clear | q quit
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
            title="AI CHAT"
            bindings={CHAT_BINDINGS}
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
            currentCanvas="chat"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
