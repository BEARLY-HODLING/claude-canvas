// IPC Message Types for Canvas Communication

// Messages sent from Controller (Claude) to Canvas
export type ControllerMessage =
  | { type: "close" }
  | { type: "update"; config: unknown }
  | { type: "ping" }
  | { type: "getSelection" }
  | { type: "getContent" };

// Messages sent from Canvas to Controller (Claude)
export type CanvasMessage =
  | { type: "ready"; scenario: string }
  | { type: "selected"; data: unknown }
  | { type: "cancelled"; reason?: string }
  | { type: "error"; message: string }
  | { type: "pong" }
  | {
      type: "selection";
      data: {
        selectedText: string;
        startOffset: number;
        endOffset: number;
      } | null;
    }
  | { type: "content"; data: { content: string; cursorPosition: number } }
  | { type: "alert"; alert: { type: string; message: string; data?: unknown } };

// Socket path convention
export function getSocketPath(id: string): string {
  return `/tmp/canvas-${id}.sock`;
}
