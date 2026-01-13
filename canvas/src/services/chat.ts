// Chat Service - Mock AI chat service (placeholder for Claude API integration)

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
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock responses for demo purposes
 */
const MOCK_RESPONSES = [
  "I understand. Let me think about that for a moment...",
  "That's an interesting question! Here's what I think:",
  "Based on my analysis, I would suggest the following approach:",
  "I can help you with that. Here are some options to consider:",
  "Great question! Let me break this down step by step.",
  "I'd be happy to assist. Here's my perspective on this:",
  "That makes sense. Here's how we could proceed:",
  "Thank you for sharing that. Here are my thoughts:",
];

/**
 * Get a mock AI response (simulates processing delay)
 */
function getMockResponse(userMessage: string): string {
  // Simple mock logic - in real implementation, this would call Claude API
  const baseResponse =
    MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] ?? "";

  // Add context-aware elaboration
  if (
    userMessage.toLowerCase().includes("help") ||
    userMessage.toLowerCase().includes("how")
  ) {
    return `${baseResponse}\n\n1. First, analyze the situation\n2. Then, identify key requirements\n3. Finally, implement the solution\n\nWould you like me to elaborate on any of these steps?`;
  }

  if (
    userMessage.toLowerCase().includes("code") ||
    userMessage.toLowerCase().includes("programming")
  ) {
    return `${baseResponse}\n\nFor coding tasks, I recommend:\n- Breaking down the problem into smaller parts\n- Writing tests first when possible\n- Using clear variable names\n- Adding comments for complex logic`;
  }

  if (
    userMessage.toLowerCase().includes("explain") ||
    userMessage.toLowerCase().includes("what is")
  ) {
    return `${baseResponse}\n\nLet me provide a clear explanation. The key concepts to understand are:\n1. The fundamental principles\n2. How they apply in practice\n3. Common use cases and examples`;
  }

  return `${baseResponse}\n\nIs there anything specific you'd like me to clarify or expand upon?`;
}

/**
 * Chat Service class for managing conversations
 */
export class ChatService {
  private history: ChatMessage[] = [];
  private systemPrompt?: string;
  private model?: string;
  private isProcessing = false;

  constructor(options?: { systemPrompt?: string; model?: string }) {
    this.systemPrompt = options?.systemPrompt;
    this.model = options?.model || "claude-mock";
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(content: string): Promise<ChatResponse> {
    if (this.isProcessing) {
      return {
        message: {
          id: generateMessageId(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
        error: "Already processing a message. Please wait.",
      };
    }

    this.isProcessing = true;

    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      this.history.push(userMessage);

      // Simulate API delay (300-1500ms)
      const delay = 300 + Math.random() * 1200;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Generate mock response
      const responseContent = getMockResponse(content);

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };
      this.history.push(assistantMessage);

      return { message: assistantMessage };
    } catch (err) {
      return {
        message: {
          id: generateMessageId(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
        error: (err as Error).message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get current processing state
   */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(): string | undefined {
    return this.systemPrompt;
  }

  /**
   * Get model name
   */
  getModel(): string {
    return this.model || "claude-mock";
  }
}

// Default service instance
export const chatService = new ChatService();
