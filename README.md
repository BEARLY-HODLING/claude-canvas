# Claude Canvas

A TUI toolkit that gives Claude Code its own display. Spawn interactive terminal interfaces for emails, calendars, flight bookings, and more.

**Note:** This is a proof of concept, originally unsupported. This fork adds iTerm2 support.

![Claude Canvas Screenshot](media/screenshot.png)

## Requirements

- [Bun](https://bun.sh) — used to run skill tools
- **One of:**
  - [iTerm2](https://iterm2.com) — split panes (recommended for macOS)
  - [tmux](https://github.com/tmux/tmux) — split panes (cross-platform)
  - Apple Terminal — new window mode (auto-positioned)

## Quick Start

```bash
# Check your terminal environment
bun run canvas/src/cli.ts env

# Show a demo canvas in current terminal
bun run canvas/src/cli.ts show calendar

# Spawn canvas in split pane (requires iTerm2 or tmux)
bun run canvas/src/cli.ts spawn calendar
```

## Installation

Add this repository as a marketplace in Claude Code:

```
/plugin marketplace add dvdsgl/claude-canvas
```

Then install the canvas plugin:

```
/plugin install canvas@claude-canvas
```

## Canvas Types

| Canvas     | Description                       | Scenarios                          |
| ---------- | --------------------------------- | ---------------------------------- |
| `calendar` | Weekly view, meeting picker       | `display`, `meeting-picker`        |
| `document` | Markdown viewer/editor            | `display`, `edit`, `email-preview` |
| `flight`   | Flight comparison, seat selection | `booking`                          |

## Terminal Support

| Terminal           | Mode       | Setup                            |
| ------------------ | ---------- | -------------------------------- |
| **iTerm2**         | Split pane | Just run in iTerm2               |
| **tmux**           | Split pane | Start a `tmux` session           |
| **Apple Terminal** | New window | Just run (window auto-positions) |

The canvas automatically detects your terminal and uses the appropriate method.

### Apple Terminal Mode

Since Apple Terminal doesn't support split panes, canvas opens in a **new window** that's automatically:

- Positioned on the right half of your screen
- Reused for subsequent canvas spawns
- Named "Canvas" for easy identification

```
┌─────────────────────┐  ┌─────────────────────┐
│ Your Terminal       │  │ Canvas Window       │
│ (Claude Code)       │  │ (Calendar/Doc/etc)  │
└─────────────────────┘  └─────────────────────┘
      Left half               Right half
```

## License

MIT
