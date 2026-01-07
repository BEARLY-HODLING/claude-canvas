# Canvas Plugin Development

Use Bun for all development:

- `bun run src/cli.ts` - Run CLI
- `bun test` - Run tests
- `bun install` - Install dependencies

## Quick Commands

```bash
# Check terminal environment
bun run src/cli.ts env

# Show canvas in current terminal
bun run src/cli.ts show calendar

# Spawn canvas (opens split pane or new window)
bun run src/cli.ts spawn calendar

# Send config update to running canvas
bun run src/cli.ts update calendar-1 --config '{"events":[]}'
```

## Project Structure

```
canvas/
├── src/
│   ├── cli.ts         # CLI entry point (commander.js)
│   ├── terminal.ts    # Terminal detection + spawning (iTerm2/tmux/Apple Terminal)
│   ├── canvases/      # React/Ink canvas components
│   ├── scenarios/     # Scenario definitions per canvas
│   ├── ipc/           # Unix socket server/client
│   └── api/           # High-level API (pickMeetingTime, editDocument)
├── skills/            # Claude Code skill documentation
├── commands/          # User commands
└── package.json
```

## Terminal Support Architecture

The `terminal.ts` file handles multi-terminal support:

```typescript
// Detection priority: tmux > iTerm2 > Apple Terminal
detectTerminal() → { inTmux, inITerm2, inAppleTerminal, terminalType }

// Spawning priority: iTerm2 (split) > tmux (split) > Apple Terminal (new window)
spawnCanvas() → spawnITerm2() | spawnTmux() | spawnAppleTerminal()
```

### Terminal-Specific Implementation

| Terminal       | Method                               | AppleScript/Command       |
| -------------- | ------------------------------------ | ------------------------- |
| iTerm2         | `split vertically with same profile` | Creates side-by-side pane |
| tmux           | `tmux split-window -h -p 67`         | 67% width split pane      |
| Apple Terminal | `do script` + position window        | New window on right half  |

### Session Tracking Files

- `/tmp/claude-canvas-iterm2-session` - iTerm2 session ID
- `/tmp/claude-canvas-pane-id` - tmux pane ID
- `/tmp/claude-canvas-terminal-window` - Apple Terminal window ID

Used to **reuse** existing panes/windows instead of creating new ones.

## Adding a New Canvas Type

1. Create component in `src/canvases/[name].tsx`
2. Register scenarios in `src/scenarios/[name]/`
3. Add skill docs in `skills/[name]/SKILL.md`
4. Export from `src/canvases/index.ts`

## IPC Protocol

Canvases communicate via Unix domain sockets (`/tmp/canvas-{id}.sock`):

```typescript
// Canvas → Controller
{
  type: ("ready", scenario);
}
{
  type: ("selected", data);
}
{
  type: "cancelled";
}
{
  type: ("selection", data);
} // For document canvas
{
  type: ("content", data);
} // For document canvas

// Controller → Canvas
{
  type: ("update", config);
}
{
  type: "close";
}
{
  type: "getSelection";
}
{
  type: "getContent";
}
```

## Key Learnings

### AppleScript for Terminal Control

**iTerm2** has rich AppleScript support:

```applescript
tell application "iTerm2"
  tell current session of current tab of current window
    split vertically with same profile
    write text "command"
  end tell
end tell
```

**Apple Terminal** is more limited (no splits):

```applescript
tell application "Terminal"
  do script "command"  -- Opens new window
  set bounds of front window to {x, y, w, h}
end tell
```

### Ink (React for Terminals)

- Components render via ANSI escape codes
- Requires TTY (won't work in non-interactive shell)
- `useStdout()` hook for terminal dimensions
- Mouse events via `useInput()` with mouse option

### IPC Best Practices

- Line-delimited JSON over Unix sockets
- Buffer incomplete lines before parsing
- Include timeout protection (default 5min)
- Track session IDs for pane reuse
