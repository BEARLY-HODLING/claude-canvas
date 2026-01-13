// Chat Canvas Types

/**
 * Chat configuration options
 */
export interface ChatConfig {
  systemPrompt?: string;
  model?: string;
  welcomeMessage?: string;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Chat response from the service
 */
export interface ChatResponse {
  message: ChatMessage;
  error?: string;
}

/**
 * Chat result for IPC
 */
export interface ChatResult {
  action: "send" | "clear" | "navigate" | "quit";
  message?: string;
  messageCount?: number;
  canvas?: string;
}

/**
 * Chat canvas color palette
 */
export const CHAT_COLORS = {
  primary: "cyan",
  secondary: "magenta",
  accent: "green",
  userMessage: "cyan",
  assistantMessage: "white",
  timestamp: "gray",
  muted: "gray",
  danger: "red",
  warning: "yellow",
  input: "white",
  inputBorder: "cyan",
} as const;
