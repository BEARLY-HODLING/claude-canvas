#!/usr/bin/env bun
import { program } from "commander";
import { detectTerminal, spawnCanvas } from "./terminal";

// Set window title via ANSI escape codes
function setWindowTitle(title: string) {
  process.stdout.write(`\x1b]0;${title}\x07`);
}

program
  .name("claude-canvas")
  .description("Interactive terminal canvases for Claude")
  .version("1.0.0");

program
  .command("show [kind]")
  .description("Show a canvas in the current terminal")
  .option("--id <id>", "Canvas ID")
  .option("--config <json>", "Canvas configuration (JSON)")
  .option("--socket <path>", "Unix socket path for IPC")
  .option("--scenario <name>", "Scenario name (e.g., display, meeting-picker)")
  .action(async (kind = "demo", options) => {
    const id = options.id || `${kind}-1`;
    const config = options.config ? JSON.parse(options.config) : undefined;
    const socketPath = options.socket;
    const scenario = options.scenario || "display";

    // Set window title
    setWindowTitle(`canvas: ${kind}`);

    // Dynamically import and render the canvas
    const { renderCanvas } = await import("./canvases");
    await renderCanvas(kind, id, config, { socketPath, scenario });
  });

program
  .command("spawn [kind]")
  .description("Spawn a canvas in a new terminal window")
  .option("--id <id>", "Canvas ID")
  .option("--config <json>", "Canvas configuration (JSON)")
  .option("--socket <path>", "Unix socket path for IPC")
  .option("--scenario <name>", "Scenario name (e.g., display, meeting-picker)")
  .action(async (kind = "demo", options) => {
    const id = options.id || `${kind}-1`;
    const result = await spawnCanvas(kind, id, options.config, {
      socketPath: options.socket,
      scenario: options.scenario,
    });
    console.log(`Spawned ${kind} canvas '${id}' via ${result.method}`);
  });

program
  .command("env")
  .description("Show detected terminal environment")
  .action(() => {
    const env = detectTerminal();
    console.log("Terminal Environment:");
    console.log(`  In tmux: ${env.inTmux}`);
    console.log(`  In iTerm2: ${env.inITerm2}`);
    console.log(`  In Kitty: ${env.inKitty}`);
    console.log(`  In WezTerm: ${env.inWezTerm}`);
    console.log(`  In Alacritty: ${env.inAlacritty}`);
    console.log(`  In VS Code: ${env.inVSCode}`);
    console.log(`  In Apple Terminal: ${env.inAppleTerminal}`);
    console.log(`  Terminal type: ${env.terminalType}`);
    console.log(`\nSummary: ${env.summary}`);

    if (env.terminalType === "wezterm") {
      console.log(
        "\nWezTerm detected - canvas will open in a split pane to the right.",
      );
    } else if (env.terminalType === "vscode") {
      console.log("\nVS Code detected - canvas will spawn in a new process.");
      console.log(
        "   Use Cmd/Ctrl+Shift+5 to split your terminal for side-by-side view.",
      );
    } else if (env.terminalType === "apple-terminal") {
      console.log(
        "\nApple Terminal detected - canvas will open in a new window.",
      );
      console.log(
        "   The window will be positioned on the right side of your screen.",
      );
    } else if (env.terminalType === "alacritty") {
      console.log("\nAlacritty detected - canvas will open in a new window.");
    } else if (env.terminalType === "none") {
      console.log("\nNo supported terminal detected.");
      console.log(
        "   Supported: iTerm2, tmux, Kitty, WezTerm, VS Code, Alacritty, Apple Terminal",
      );
    }
  });

program
  .command("update <id>")
  .description("Send updated config to a running canvas via IPC")
  .option("--config <json>", "New canvas configuration (JSON)")
  .action(async (id: string, options) => {
    const { getSocketPath } = await import("./ipc/types");
    const socketPath = getSocketPath(id);
    const config = options.config ? JSON.parse(options.config) : {};

    try {
      const socket = await Bun.connect({
        unix: socketPath,
        socket: {
          data(socket, data) {
            // Ignore responses
          },
          open(socket) {
            const msg = JSON.stringify({ type: "update", config });
            socket.write(msg + "\n");
            socket.end();
          },
          close() {},
          error(socket, error) {
            console.error("Socket error:", error);
          },
        },
      });
      console.log(`Sent update to canvas '${id}'`);
    } catch (err) {
      console.error(`Failed to connect to canvas '${id}':`, err);
    }
  });

// Helper function to send a request to canvas and get response
async function sendCanvasRequest(
  socketPath: string,
  requestType: string,
  expectedResponseType: string,
  timeoutMs: number = 2000,
): Promise<string> {
  let resolved = false;

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Timeout waiting for response"));
      }
    }, timeoutMs);

    Bun.connect({
      unix: socketPath,
      socket: {
        data(socket, data) {
          if (resolved) return;
          clearTimeout(timeout);
          resolved = true;
          const response = JSON.parse(data.toString().trim());
          if (response.type === expectedResponseType) {
            resolve(JSON.stringify(response.data));
          } else {
            resolve(JSON.stringify(null));
          }
          socket.end();
        },
        open(socket) {
          const msg = JSON.stringify({ type: requestType });
          socket.write(msg + "\n");
        },
        close() {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(JSON.stringify(null));
          }
        },
        error(socket, error) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            reject(error);
          }
        },
      },
    });
  });
}

program
  .command("selection <id>")
  .description("Get the current selection from a running document canvas")
  .action(async (id: string) => {
    const { getSocketPath } = await import("./ipc/types");
    const socketPath = getSocketPath(id);

    try {
      const result = await sendCanvasRequest(
        socketPath,
        "getSelection",
        "selection",
      );
      console.log(result);
    } catch (err) {
      console.error(`Failed to get selection from canvas '${id}':`, err);
      process.exit(1);
    }
  });

program
  .command("content <id>")
  .description("Get the current content from a running document canvas")
  .action(async (id: string) => {
    const { getSocketPath } = await import("./ipc/types");
    const socketPath = getSocketPath(id);

    try {
      const result = await sendCanvasRequest(
        socketPath,
        "getContent",
        "content",
      );
      console.log(result);
    } catch (err) {
      console.error(`Failed to get content from canvas '${id}':`, err);
      process.exit(1);
    }
  });

program.parse();
