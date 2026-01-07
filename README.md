# Claude Canvas

A TUI toolkit that gives Claude Code its own display. Spawn interactive terminal interfaces for calendars, documents, flight bookings, and more.

**Note:** Fork of [dvdsgl/claude-canvas](https://github.com/dvdsgl/claude-canvas) with added iTerm2 and Apple Terminal support.

![Claude Canvas Screenshot](media/screenshot.png)

## Requirements

- [Bun](https://bun.sh) — runtime for canvas tools
- **One of:**
  - **iTerm2** — split panes (recommended for macOS)
  - **tmux** — split panes (cross-platform)
  - **Apple Terminal** — new window mode (auto-positioned)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/BEARLY-HODLING/claude-canvas.git
cd claude-canvas

# Install dependencies
bun install
cd canvas && bun install && cd ..

# Check your terminal environment
bun run canvas/src/cli.ts env

# Spawn calendar canvas
bun run canvas/src/cli.ts spawn calendar
```

## Canvas Types

| Canvas     | Description                       | Scenarios                          |
| ---------- | --------------------------------- | ---------------------------------- |
| `calendar` | Weekly view, meeting picker       | `display`, `meeting-picker`        |
| `document` | Markdown viewer/editor            | `display`, `edit`, `email-preview` |
| `flight`   | Flight comparison, seat selection | `booking`                          |

### Calendar Controls

| Key            | Action             |
| -------------- | ------------------ |
| `←` / `→`      | Navigate weeks     |
| `t`            | Jump to today      |
| `n` / `p`      | Next/previous week |
| `q` / `Ctrl+C` | Exit               |

### Usage Examples

```bash
# Calendar with custom events
bun run canvas/src/cli.ts spawn calendar --config '{"events":[{"title":"Meeting","start":"2025-01-07T10:00","end":"2025-01-07T11:00","color":"blue"}]}'

# Meeting picker mode
bun run canvas/src/cli.ts spawn calendar --scenario meeting-picker

# Document viewer
bun run canvas/src/cli.ts spawn document --config '{"content":"# Hello World\n\nThis is markdown."}'

# Flight booking
bun run canvas/src/cli.ts spawn flight
```

## Terminal Support

| Terminal           | Mode       | Setup                            |
| ------------------ | ---------- | -------------------------------- |
| **iTerm2**         | Split pane | Just run in iTerm2               |
| **tmux**           | Split pane | Start a `tmux` session           |
| **Apple Terminal** | New window | Just run (window auto-positions) |

The canvas **automatically detects** your terminal and uses the appropriate method.

### How It Works

**iTerm2 / tmux:** Creates a side-by-side split pane

```
┌─────────────────────┬─────────────────────┐
│ Claude Code         │ Canvas              │
│ (your terminal)     │ (calendar/doc/etc)  │
└─────────────────────┴─────────────────────┘
```

**Apple Terminal:** Opens a new window (no native split support)

```
┌─────────────────────┐  ┌─────────────────────┐
│ Your Terminal       │  │ Canvas Window       │
│ (Claude Code)       │  │ (auto-positioned)   │
└─────────────────────┘  └─────────────────────┘
      Left half               Right half
```

### Session Reuse

Canvas tracks open panes/windows and **reuses them** for subsequent spawns instead of creating new ones. Tracking files:

- `/tmp/claude-canvas-iterm2-session`
- `/tmp/claude-canvas-pane-id` (tmux)
- `/tmp/claude-canvas-terminal-window` (Apple Terminal)

## Claude Code Plugin Installation

```bash
# Add marketplace
/plugin marketplace add BEARLY-HODLING/claude-canvas

# Install plugin
/plugin install canvas@claude-canvas
```

## Development

```bash
# Run CLI directly
bun run canvas/src/cli.ts [command]

# Show canvas in current terminal (for testing)
bun run canvas/src/cli.ts show calendar

# Check terminal detection
bun run canvas/src/cli.ts env
```

## License

MIT
