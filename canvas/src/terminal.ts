import { spawn, spawnSync } from "child_process";

export interface TerminalEnvironment {
  inTmux: boolean;
  inITerm2: boolean;
  inAppleTerminal: boolean;
  terminalType: "tmux" | "iterm2" | "apple-terminal" | "none";
  summary: string;
}

export function detectTerminal(): TerminalEnvironment {
  const inTmux = !!process.env.TMUX;
  const inITerm2 =
    process.env.TERM_PROGRAM === "iTerm.app" || !!process.env.ITERM_SESSION_ID;
  const inAppleTerminal = process.env.TERM_PROGRAM === "Apple_Terminal";

  let terminalType: "tmux" | "iterm2" | "apple-terminal" | "none" = "none";
  let summary = "unsupported terminal";

  if (inTmux) {
    terminalType = "tmux";
    summary = "tmux";
  } else if (inITerm2) {
    terminalType = "iterm2";
    summary = "iTerm2";
  } else if (inAppleTerminal) {
    terminalType = "apple-terminal";
    summary = "Apple Terminal (new window mode)";
  }

  return { inTmux, inITerm2, inAppleTerminal, terminalType, summary };
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

  // Try iTerm2 first, then tmux, then Apple Terminal (new window)
  if (env.inITerm2) {
    const result = await spawnITerm2(command);
    if (result) return { method: "iterm2" };
  }

  if (env.inTmux) {
    const result = await spawnTmux(command);
    if (result) return { method: "tmux" };
  }

  if (env.inAppleTerminal) {
    const result = await spawnAppleTerminal(command);
    if (result) return { method: "apple-terminal" };
  }

  throw new Error(
    "Canvas requires iTerm2, tmux, or Apple Terminal. Please run in a supported terminal.",
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
