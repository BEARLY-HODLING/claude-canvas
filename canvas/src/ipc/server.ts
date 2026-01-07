// IPC Server - Canvas side (for standalone CLI mode)
// Listens on a Unix domain socket for controller commands

import type { ControllerMessage, CanvasMessage } from "./types";
import { unlinkSync, existsSync } from "fs";
import type { Socket } from "bun";

export interface IPCServerOptions {
  socketPath: string;
  onMessage: (msg: ControllerMessage) => void;
  onClientConnect?: () => void;
  onClientDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface IPCServer {
  broadcast: (msg: CanvasMessage) => void;
  close: () => void;
}

export async function createIPCServer(
  options: IPCServerOptions,
): Promise<IPCServer> {
  const {
    socketPath,
    onMessage,
    onClientConnect,
    onClientDisconnect,
    onError,
  } = options;

  // Remove existing socket file if it exists
  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }

  const clients = new Set<Socket<{ buffer: string }>>();

  const server = Bun.listen<{ buffer: string }>({
    unix: socketPath,
    socket: {
      open(socket) {
        // Initialize per-client buffer
        socket.data = { buffer: "" };
        clients.add(socket);
        onClientConnect?.();
      },

      data(socket, data) {
        // Accumulate data in per-client buffer and parse complete JSON messages
        socket.data.buffer += data.toString();

        const lines = socket.data.buffer.split("\n");
        socket.data.buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const msg = JSON.parse(line) as ControllerMessage;
              onMessage(msg);
            } catch (e) {
              onError?.(new Error(`Failed to parse message: ${line}`));
            }
          }
        }
      },

      close(socket) {
        clients.delete(socket);
        onClientDisconnect?.();
      },

      error(socket, error) {
        onError?.(error);
      },
    },
  });

  return {
    broadcast(msg: CanvasMessage) {
      const data = JSON.stringify(msg) + "\n";
      for (const client of clients) {
        client.write(data);
      }
    },

    close() {
      server.stop();
      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    },
  };
}
