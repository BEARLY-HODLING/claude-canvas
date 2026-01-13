import { spawn, spawnSync } from "child_process";

export interface TerminalEnvironment {
  inTmux: boolean;
  inITerm2: boolean;
  inAppleTerminal: boolean;
  inKitty: boolean;
  inWezTerm: boolean;
  inAlacritty: boolean;
  inVSCode: boolean;
  terminalType:
    | "tmux"
    | "iterm2"
    | "apple-terminal"
    | "kitty"
    | "wezterm"
    | "alacritty"
    | "vscode"
    | "none";
  summary: string;
}

export function detectTerminal(): TerminalEnvironment {
  const inTmux = !!process.env.TMUX;
  const inITerm2 =
    process.env.TERM_PROGRAM === "iTerm.app" || !!process.env.ITERM_SESSION_ID;
  const inAppleTerminal = process.env.TERM_PROGRAM === "Apple_Terminal";
  const inKitty =
    process.env.TERM_PROGRAM === "kitty" || !!process.env.KITTY_PID;
  const inWezTerm = process.env.TERM_PROGRAM === "WezTerm";
  const inAlacritty =
    process.env.TERM_PROGRAM === "Alacritty" || !!process.env.ALACRITTY_SOCKET;
  const inVSCode =
    process.env.TERM_PROGRAM === "vscode" || !!process.env.VSCODE_INJECTION;

  let terminalType:
    | "tmux"
    | "iterm2"
    | "apple-terminal"
    | "kitty"
    | "wezterm"
    | "alacritty"
    | "vscode"
    | "none" = "none";
  let summary = "unsupported terminal";

  if (inTmux) {
    terminalType = "tmux";
    summary = "tmux";
  } else if (inITerm2) {
    terminalType = "iterm2";
    summary = "iTerm2";
  } else if (inKitty) {
    terminalType = "kitty";
    summary = "Kitty";
  } else if (inWezTerm) {
    terminalType = "wezterm";
    summary = "WezTerm";
  } else if (inAlacritty) {
    terminalType = "alacritty";
    summary = "Alacritty (new window mode)";
  } else if (inVSCode) {
    terminalType = "vscode";
    summary = "VS Code (new terminal)";
  } else if (inAppleTerminal) {
    terminalType = "apple-terminal";
    summary = "Apple Terminal (new window mode)";
  }

  return {
    inTmux,
    inITerm2,
    inAppleTerminal,
    inKitty,
    inWezTerm,
    inAlacritty,
    inVSCode,
    terminalType,
    summary,
  };
}

export interface SpawnResult {
  method: string;
  pid?: number;
}

export interface SpawnOptions {
  socketPath?: string;
  scenario?: string;
}

export async function spawnCanvas(
  kind: string,
  id: string,
  configJson?: string,
  options?: SpawnOptions,
): Promise<SpawnResult> {
  const env = detectTerminal();

  // Get the directory of this script (skill directory)
  const scriptDir = import.meta.dir.replace("/src", "");
  const runScript = `${scriptDir}/run-canvas.sh`;

  // Auto-generate socket path for IPC if not provided
  const socketPath = options?.socketPath || `/tmp/canvas-${id}.sock`;

  // Build the command to run
  let command = `${runScript} show ${kind} --id ${id}`;
  if (configJson) {
    // Write config to a temp file to avoid shell escaping issues
    const configFile = `/tmp/canvas-config-${id}.json`;
    await Bun.write(configFile, configJson);
    command += ` --config "$(cat ${configFile})"`;
  }
  command += ` --socket ${socketPath}`;
  if (options?.scenario) {
    command += ` --scenario ${options.scenario}`;
  }

  // Try iTerm2 first, then tmux, then Kitty, then Alacritty, then Apple Terminal (new window)
  if (env.inITerm2) {
    const result = await spawnITerm2(command);
    if (result) return { method: "iterm2" };
  }

  if (env.inTmux) {
    const result = await spawnTmux(command);
    if (result) return { method: "tmux" };
  }

  if (env.inKitty) {
    const result = await spawnKitty(command);
    if (result) return { method: "kitty" };
  }

  if (env.inWezTerm) {
    const result = await spawnWezTerm(command);
    if (result) return { method: "wezterm" };
  }

  if (env.inAlacritty) {
    const result = await spawnAlacritty(command);
    if (result) return { method: "alacritty" };
  }

  if (env.inVSCode) {
    const result = await spawnVSCode(command);
    if (result) return { method: "vscode" };
  }

  if (env.inAppleTerminal) {
    const result = await spawnAppleTerminal(command);
    if (result) return { method: "apple-terminal" };
  }

  throw new Error(
    "Canvas requires iTerm2, tmux, Kitty, WezTerm, Alacritty, VS Code, or Apple Terminal. Please run in a supported terminal.",
  );
}

// File to track the canvas pane ID
const CANVAS_PANE_FILE = "/tmp/claude-canvas-pane-id";

async function getCanvasPaneId(): Promise<string | null> {
  try {
    const file = Bun.file(CANVAS_PANE_FILE);
    if (await file.exists()) {
      const paneId = (await file.text()).trim();
      // Verify the pane still exists by checking if tmux can find it
      const result = spawnSync("tmux", [
        "display-message",
        "-t",
        paneId,
        "-p",
        "#{pane_id}",
      ]);
      const output = result.stdout?.toString().trim();
      // Pane exists only if command succeeds AND returns the same pane ID
      if (result.status === 0 && output === paneId) {
        return paneId;
      }
      // Stale pane reference - clean up the file
      await Bun.write(CANVAS_PANE_FILE, "");
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveCanvasPaneId(paneId: string): Promise<void> {
  await Bun.write(CANVAS_PANE_FILE, paneId);
}

async function createNewPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Use split-window -h for vertical split (side by side)
    // -p 67 gives canvas 2/3 width (1:2 ratio, Claude:Canvas)
    // -P -F prints the new pane ID so we can save it
    const args = [
      "split-window",
      "-h",
      "-p",
      "67",
      "-P",
      "-F",
      "#{pane_id}",
      command,
    ];
    const proc = spawn("tmux", args);
    let paneId = "";
    proc.stdout?.on("data", (data) => {
      paneId += data.toString();
    });
    proc.on("close", async (code) => {
      if (code === 0 && paneId.trim()) {
        await saveCanvasPaneId(paneId.trim());
      }
      resolve(code === 0);
    });
    proc.on("error", () => resolve(false));
  });
}

async function reuseExistingPane(
  paneId: string,
  command: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    // Send Ctrl+C to interrupt any running process
    const killProc = spawn("tmux", ["send-keys", "-t", paneId, "C-c"]);
    killProc.on("close", () => {
      // Wait for process to terminate before sending new command
      setTimeout(() => {
        // Clear the terminal and run the new command
        const args = [
          "send-keys",
          "-t",
          paneId,
          `clear && ${command}`,
          "Enter",
        ];
        const proc = spawn("tmux", args);
        proc.on("close", (code) => resolve(code === 0));
        proc.on("error", () => resolve(false));
      }, 150);
    });
    killProc.on("error", () => resolve(false));
  });
}

async function spawnTmux(command: string): Promise<boolean> {
  // Check if we have an existing canvas pane to reuse
  const existingPaneId = await getCanvasPaneId();

  if (existingPaneId) {
    // Try to reuse existing pane
    const reused = await reuseExistingPane(existingPaneId, command);
    if (reused) {
      return true;
    }
    // Reuse failed (pane may have been closed) - clear stale reference and create new
    await Bun.write(CANVAS_PANE_FILE, "");
  }

  // Create a new split pane
  return createNewPane(command);
}

// ============================================================================
// iTerm2 Support
// ============================================================================

const ITERM2_SESSION_FILE = "/tmp/claude-canvas-iterm2-session";

async function getITerm2SessionId(): Promise<string | null> {
  try {
    const file = Bun.file(ITERM2_SESSION_FILE);
    if (await file.exists()) {
      const sessionId = (await file.text()).trim();
      if (sessionId) {
        // Verify session still exists
        const checkScript = `
          tell application "iTerm2"
            repeat with w in windows
              repeat with t in tabs of w
                repeat with s in sessions of t
                  if unique ID of s is "${sessionId}" then
                    return "exists"
                  end if
                end repeat
              end repeat
            end repeat
            return "not_found"
          end tell
        `;
        const result = spawnSync("osascript", ["-e", checkScript]);
        if (
          result.status === 0 &&
          result.stdout?.toString().trim() === "exists"
        ) {
          return sessionId;
        }
        // Stale session - clean up
        await Bun.write(ITERM2_SESSION_FILE, "");
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveITerm2SessionId(sessionId: string): Promise<void> {
  await Bun.write(ITERM2_SESSION_FILE, sessionId);
}

async function createITerm2SplitPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // AppleScript to create a vertical split in iTerm2 and run the command
    // The split takes ~67% of the width (same as tmux config)
    const script = `
      tell application "iTerm2"
        tell current session of current tab of current window
          -- Create vertical split (side by side)
          set newSession to split vertically with same profile

          -- Run the canvas command in the new pane
          tell newSession
            write text "${command.replace(/"/g, '\\"')}"
          end tell

          -- Return the new session's unique ID for tracking
          return unique ID of newSession
        end tell
      end tell
    `;

    const proc = spawn("osascript", ["-e", script]);
    let sessionId = "";

    proc.stdout?.on("data", (data) => {
      sessionId += data.toString();
    });

    proc.on("close", async (code) => {
      if (code === 0 && sessionId.trim()) {
        await saveITerm2SessionId(sessionId.trim());
        resolve(true);
      } else {
        resolve(false);
      }
    });

    proc.on("error", () => resolve(false));
  });
}

async function reuseITerm2Session(
  sessionId: string,
  command: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    // AppleScript to send Ctrl+C and run new command in existing session
    const script = `
      tell application "iTerm2"
        repeat with w in windows
          repeat with t in tabs of w
            repeat with s in sessions of t
              if unique ID of s is "${sessionId}" then
                tell s
                  -- Send Ctrl+C to interrupt current process
                  write text (ASCII character 3)
                  delay 0.15
                  -- Clear and run new command
                  write text "clear && ${command.replace(/"/g, '\\"')}"
                end tell
                return "success"
              end if
            end repeat
          end repeat
        end repeat
        return "not_found"
      end tell
    `;

    const proc = spawn("osascript", ["-e", script]);
    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      resolve(code === 0 && output.trim() === "success");
    });

    proc.on("error", () => resolve(false));
  });
}

async function spawnITerm2(command: string): Promise<boolean> {
  // Check if we have an existing canvas session to reuse
  const existingSessionId = await getITerm2SessionId();

  if (existingSessionId) {
    // Try to reuse existing session
    const reused = await reuseITerm2Session(existingSessionId, command);
    if (reused) {
      return true;
    }
    // Reuse failed - clear stale reference and create new
    await Bun.write(ITERM2_SESSION_FILE, "");
  }

  // Create a new split pane
  return createITerm2SplitPane(command);
}

// ============================================================================
// Apple Terminal Support (opens new window since no split panes available)
// ============================================================================

const APPLE_TERMINAL_WINDOW_FILE = "/tmp/claude-canvas-terminal-window";

async function getAppleTerminalWindowId(): Promise<number | null> {
  try {
    const file = Bun.file(APPLE_TERMINAL_WINDOW_FILE);
    if (await file.exists()) {
      const windowId = parseInt((await file.text()).trim(), 10);
      if (!isNaN(windowId)) {
        // Verify window still exists
        const checkScript = `
          tell application "Terminal"
            repeat with w in windows
              if id of w is ${windowId} then
                return "exists"
              end if
            end repeat
            return "not_found"
          end tell
        `;
        const result = spawnSync("osascript", ["-e", checkScript]);
        if (
          result.status === 0 &&
          result.stdout?.toString().trim() === "exists"
        ) {
          return windowId;
        }
        // Stale window - clean up
        await Bun.write(APPLE_TERMINAL_WINDOW_FILE, "");
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveAppleTerminalWindowId(windowId: number): Promise<void> {
  await Bun.write(APPLE_TERMINAL_WINDOW_FILE, String(windowId));
}

async function createAppleTerminalWindow(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // AppleScript to create a new Terminal window and run the command
    // Position the window on the right side of the screen
    const script = `
      tell application "Terminal"
        -- Create new window with the command
        do script "${command.replace(/"/g, '\\"')}"

        -- Get the new window (it's the frontmost one)
        set canvasWindow to front window
        set windowId to id of canvasWindow

        -- Get screen dimensions
        tell application "Finder"
          set screenBounds to bounds of window of desktop
          set screenWidth to item 3 of screenBounds
          set screenHeight to item 4 of screenBounds
        end tell

        -- Position canvas window on right half of screen
        set bounds of canvasWindow to {(screenWidth / 2), 0, screenWidth, screenHeight}

        -- Set window title
        set custom title of canvasWindow to "Canvas"

        return windowId
      end tell
    `;

    const proc = spawn("osascript", ["-e", script]);
    let windowId = "";

    proc.stdout?.on("data", (data) => {
      windowId += data.toString();
    });

    proc.on("close", async (code) => {
      const id = parseInt(windowId.trim(), 10);
      if (code === 0 && !isNaN(id)) {
        await saveAppleTerminalWindowId(id);
        resolve(true);
      } else {
        resolve(false);
      }
    });

    proc.on("error", () => resolve(false));
  });
}

async function reuseAppleTerminalWindow(
  windowId: number,
  command: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    // AppleScript to send Ctrl+C and run new command in existing window
    const script = `
      tell application "Terminal"
        repeat with w in windows
          if id of w is ${windowId} then
            -- Focus the window
            set frontmost of w to true

            -- Get the first tab's session
            do script "clear && ${command.replace(/"/g, '\\"')}" in w

            return "success"
          end if
        end repeat
        return "not_found"
      end tell
    `;

    const proc = spawn("osascript", ["-e", script]);
    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      resolve(code === 0 && output.trim() === "success");
    });

    proc.on("error", () => resolve(false));
  });
}

async function spawnAppleTerminal(command: string): Promise<boolean> {
  // Check if we have an existing canvas window to reuse
  const existingWindowId = await getAppleTerminalWindowId();

  if (existingWindowId) {
    // Try to reuse existing window
    const reused = await reuseAppleTerminalWindow(existingWindowId, command);
    if (reused) {
      return true;
    }
    // Reuse failed - clear stale reference and create new
    await Bun.write(APPLE_TERMINAL_WINDOW_FILE, "");
  }

  // Create a new window
  return createAppleTerminalWindow(command);
}

// ============================================================================
// WezTerm Support
// ============================================================================

const WEZTERM_PANE_FILE = "/tmp/claude-canvas-wezterm-pane";

async function getWezTermPaneId(): Promise<string | null> {
  try {
    const file = Bun.file(WEZTERM_PANE_FILE);
    if (await file.exists()) {
      const paneId = (await file.text()).trim();
      if (paneId) {
        // Verify pane still exists by listing panes
        const result = spawnSync("wezterm", ["cli", "list", "--format=json"]);
        if (result.status === 0) {
          try {
            const panes = JSON.parse(result.stdout?.toString() || "[]");
            const exists = panes.some(
              (p: { pane_id: number }) => String(p.pane_id) === paneId,
            );
            if (exists) {
              return paneId;
            }
          } catch {
            // JSON parse error - pane doesn't exist
          }
        }
        // Stale pane - clean up
        await Bun.write(WEZTERM_PANE_FILE, "");
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveWezTermPaneId(paneId: string): Promise<void> {
  await Bun.write(WEZTERM_PANE_FILE, paneId);
}

async function createWezTermSplitPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a vertical split (side by side) with 67% width for the canvas
    // --right creates the pane to the right of the current one
    // --percent 67 gives the new pane 67% of the width
    const args = [
      "cli",
      "split-pane",
      "--right",
      "--percent",
      "67",
      "--",
      "bash",
      "-c",
      command,
    ];

    const proc = spawn("wezterm", args);
    let output = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", async (code) => {
      if (code === 0) {
        // wezterm cli split-pane returns the new pane ID
        const paneId = output.trim();
        if (paneId) {
          await saveWezTermPaneId(paneId);
        }
        resolve(true);
      } else {
        resolve(false);
      }
    });

    proc.on("error", () => resolve(false));
  });
}

async function reuseWezTermPane(
  paneId: string,
  command: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    // Send Ctrl+C to interrupt any running process
    const ctrlC = spawn("wezterm", [
      "cli",
      "send-text",
      "--pane-id",
      paneId,
      "--no-paste",
      "\x03",
    ]);

    ctrlC.on("close", () => {
      // Wait for process to terminate before sending new command
      setTimeout(() => {
        // Clear and run the new command
        const newCommand = `clear && ${command}\n`;
        const sendProc = spawn("wezterm", [
          "cli",
          "send-text",
          "--pane-id",
          paneId,
          "--no-paste",
          newCommand,
        ]);

        sendProc.on("close", (code) => resolve(code === 0));
        sendProc.on("error", () => resolve(false));
      }, 150);
    });

    ctrlC.on("error", () => resolve(false));
  });
}

async function spawnWezTerm(command: string): Promise<boolean> {
  // Check if we have an existing canvas pane to reuse
  const existingPaneId = await getWezTermPaneId();

  if (existingPaneId) {
    // Try to reuse existing pane
    const reused = await reuseWezTermPane(existingPaneId, command);
    if (reused) {
      return true;
    }
    // Reuse failed - clear stale reference and create new
    await Bun.write(WEZTERM_PANE_FILE, "");
  }

  // Create a new split pane
  return createWezTermSplitPane(command);
}

// ============================================================================
// Kitty Support
// ============================================================================

const KITTY_WINDOW_FILE = "/tmp/claude-canvas-kitty-window";

async function getKittyWindowId(): Promise<string | null> {
  try {
    const file = Bun.file(KITTY_WINDOW_FILE);
    if (await file.exists()) {
      const windowId = (await file.text()).trim();
      if (windowId) {
        // Verify window still exists by listing windows
        const result = spawnSync("kitty", ["@", "ls"]);
        if (result.status === 0) {
          try {
            const windows = JSON.parse(result.stdout?.toString() || "[]");
            // Kitty returns an array of OS windows, each containing tabs with windows
            for (const osWindow of windows) {
              for (const tab of osWindow.tabs || []) {
                for (const win of tab.windows || []) {
                  if (String(win.id) === windowId) {
                    return windowId;
                  }
                }
              }
            }
          } catch {
            // JSON parse error - window doesn't exist
          }
        }
        // Stale window - clean up
        await Bun.write(KITTY_WINDOW_FILE, "");
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveKittyWindowId(windowId: string): Promise<void> {
  await Bun.write(KITTY_WINDOW_FILE, windowId);
}

function isKittyRemoteControlAvailable(): boolean {
  // Check if kitty remote control is available
  const result = spawnSync("kitty", ["@", "ls"], { timeout: 2000 });
  return result.status === 0;
}

async function createKittySplitPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (isKittyRemoteControlAvailable()) {
      // Use kitty remote control to create a vertical split
      // --location=vsplit creates the window to the right (vertical split)
      const args = [
        "@",
        "launch",
        "--location=vsplit",
        "--cwd=current",
        "--title=Canvas",
        "bash",
        "-c",
        command,
      ];

      const proc = spawn("kitty", args);
      let output = "";

      proc.stdout?.on("data", (data) => {
        output += data.toString();
      });

      proc.on("close", async (code) => {
        if (code === 0) {
          // kitty @ launch returns the window ID
          const windowId = output.trim();
          if (windowId) {
            await saveKittyWindowId(windowId);
          }
          resolve(true);
        } else {
          resolve(false);
        }
      });

      proc.on("error", () => resolve(false));
    } else {
      // Remote control not available - spawn new Kitty window
      const proc = spawn("kitty", ["--title=Canvas", "bash", "-c", command], {
        detached: true,
        stdio: "ignore",
      });

      proc.unref();

      // Can't track window ID without remote control
      resolve(true);
    }
  });
}

async function reuseKittyWindow(
  windowId: string,
  command: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    // Send Ctrl+C to interrupt any running process
    const ctrlC = spawn("kitty", [
      "@",
      "send-text",
      "--match",
      `id:${windowId}`,
      "\x03",
    ]);

    ctrlC.on("close", () => {
      // Wait for process to terminate before sending new command
      setTimeout(() => {
        // Clear and run the new command
        const newCommand = `clear && ${command}\n`;
        const sendProc = spawn("kitty", [
          "@",
          "send-text",
          "--match",
          `id:${windowId}`,
          newCommand,
        ]);

        sendProc.on("close", (code) => resolve(code === 0));
        sendProc.on("error", () => resolve(false));
      }, 150);
    });

    ctrlC.on("error", () => resolve(false));
  });
}

async function spawnKitty(command: string): Promise<boolean> {
  // Check if remote control is available for pane reuse
  if (isKittyRemoteControlAvailable()) {
    // Check if we have an existing canvas window to reuse
    const existingWindowId = await getKittyWindowId();

    if (existingWindowId) {
      // Try to reuse existing window
      const reused = await reuseKittyWindow(existingWindowId, command);
      if (reused) {
        return true;
      }
      // Reuse failed - clear stale reference and create new
      await Bun.write(KITTY_WINDOW_FILE, "");
    }
  }

  // Create a new split pane (or new window if remote control unavailable)
  return createKittySplitPane(command);
}

// ============================================================================
// Alacritty Support (opens new window since no split panes available)
// ============================================================================

const ALACRITTY_PID_FILE = "/tmp/claude-canvas-alacritty-pid";

async function getAlacrittyPid(): Promise<number | null> {
  try {
    const file = Bun.file(ALACRITTY_PID_FILE);
    if (await file.exists()) {
      const pid = parseInt((await file.text()).trim(), 10);
      if (!isNaN(pid)) {
        // Verify process still exists
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          return pid;
        } catch {
          // Process doesn't exist
        }
        // Stale PID - clean up
        await Bun.write(ALACRITTY_PID_FILE, "");
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveAlacrittyPid(pid: number): Promise<void> {
  await Bun.write(ALACRITTY_PID_FILE, String(pid));
}

async function createAlacrittyWindow(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Alacritty doesn't have native splits or remote control
    // Spawn a new window with the command
    const proc = spawn(
      "alacritty",
      ["--title", "Canvas", "-e", "/bin/sh", "-c", command],
      {
        detached: true,
        stdio: "ignore",
      },
    );

    if (proc.pid) {
      // Save the PID for potential tracking
      saveAlacrittyPid(proc.pid);

      // On macOS, position the window using AppleScript after a short delay
      if (process.platform === "darwin") {
        setTimeout(() => {
          const positionScript = `
            tell application "System Events"
              tell process "Alacritty"
                set frontmost to true
                -- Get screen dimensions
                tell application "Finder"
                  set screenBounds to bounds of window of desktop
                  set screenWidth to item 3 of screenBounds
                  set screenHeight to item 4 of screenBounds
                end tell
                -- Position window on right half of screen
                try
                  set position of front window to {(screenWidth / 2), 0}
                  set size of front window to {(screenWidth / 2), screenHeight}
                end try
              end tell
            end tell
          `;
          spawn("osascript", ["-e", positionScript], {
            detached: true,
            stdio: "ignore",
          });
        }, 500); // Wait for window to appear
      }

      proc.unref();
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

async function spawnAlacritty(command: string): Promise<boolean> {
  // Check if we have an existing Alacritty process
  // Note: Unlike other terminals, we can't really reuse Alacritty windows
  // since it doesn't have remote control. We just track if one exists
  // to potentially kill it before spawning a new one.
  const existingPid = await getAlacrittyPid();

  if (existingPid) {
    // Try to kill the existing process so we don't accumulate windows
    try {
      process.kill(existingPid, "SIGTERM");
      // Wait a moment for it to close
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // Process may already be dead, ignore
    }
    // Clear the stale reference
    await Bun.write(ALACRITTY_PID_FILE, "");
  }

  // Create a new window
  return createAlacrittyWindow(command);
}

// ============================================================================
// VS Code Support (opens new terminal since VS Code doesn't expose split API)
// ============================================================================

const VSCODE_PID_FILE = "/tmp/claude-canvas-vscode-pid";

async function getVSCodePid(): Promise<number | null> {
  try {
    const file = Bun.file(VSCODE_PID_FILE);
    if (await file.exists()) {
      const pid = parseInt((await file.text()).trim(), 10);
      if (!isNaN(pid)) {
        // Verify process still exists
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          return pid;
        } catch {
          // Process doesn't exist
        }
        // Stale PID - clean up
        await Bun.write(VSCODE_PID_FILE, "");
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveVSCodePid(pid: number): Promise<void> {
  await Bun.write(VSCODE_PID_FILE, String(pid));
}

function isVSCodeCLIAvailable(): boolean {
  // Check if VS Code CLI is available
  const result = spawnSync("code", ["--version"], { timeout: 2000 });
  return result.status === 0;
}

async function createVSCodeTerminal(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // VS Code doesn't have a clean CLI way to create a new split terminal
    // and run a command. However, we can:
    // 1. Try using `code --goto` with a terminal command (limited)
    // 2. Use a workaround by spawning a shell process that runs in a new terminal
    //
    // The most reliable approach is to spawn the command in a way that the user
    // can manually split in VS Code's integrated terminal.

    if (isVSCodeCLIAvailable()) {
      // Try to use VS Code's command line to open a new terminal
      // Unfortunately, VS Code CLI doesn't have direct "open new terminal" support
      // We can try using workbench.action.terminal.new via --command, but it's unreliable

      // Best approach: spawn the canvas command directly in a detached process
      // VS Code users can manually split their terminal
      const proc = spawn("bash", ["-c", command], {
        detached: true,
        stdio: "ignore",
      });

      if (proc.pid) {
        saveVSCodePid(proc.pid);
        proc.unref();

        // Print helpful message to stderr so user knows what happened
        console.error(
          "\x1b[33m[Canvas] Started in new process. Use VS Code's split terminal (Cmd/Ctrl+Shift+5) to view side-by-side.\x1b[0m",
        );
        resolve(true);
      } else {
        resolve(false);
      }
    } else {
      // VS Code CLI not available, just spawn directly
      const proc = spawn("bash", ["-c", command], {
        detached: true,
        stdio: "ignore",
      });

      if (proc.pid) {
        saveVSCodePid(proc.pid);
        proc.unref();
        resolve(true);
      } else {
        resolve(false);
      }
    }
  });
}

async function spawnVSCode(command: string): Promise<boolean> {
  // Check if we have an existing VS Code process
  // Similar to Alacritty, we can't really reuse VS Code terminal sessions
  // since it doesn't have remote control. We track PIDs to clean up old processes.
  const existingPid = await getVSCodePid();

  if (existingPid) {
    // Try to kill the existing process so we don't accumulate processes
    try {
      process.kill(existingPid, "SIGTERM");
      // Wait a moment for it to close
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // Process may already be dead, ignore
    }
    // Clear the stale reference
    await Bun.write(VSCODE_PID_FILE, "");
  }

  // Create a new terminal/process
  return createVSCodeTerminal(command);
}
