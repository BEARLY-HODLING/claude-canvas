# Canvas Plugin

Interactive terminal TUI components for Claude Code. Build rich terminal experiences with real-time data and IPC communication.

## Overview

Canvas provides spawnable terminal displays (calendars, dashboards, network monitors, and more) with real-time IPC communication. Claude can spawn these TUIs in terminal split panes and receive user selections.

## Canvas Types (33 total)

| Type         | Description                                 |
| ------------ | ------------------------------------------- |
| `bookmarks`  | Browser bookmark manager with folders       |
| `calculator` | Scientific calculator with history          |
| `calendar`   | Display events, pick meeting times          |
| `chat`       | AI chat interface                           |
| `clipboard`  | Clipboard history manager                   |
| `colors`     | Color picker and palette generator          |
| `crypto`     | Cryptocurrency prices and watchlist         |
| `dashboard`  | Unified dashboard with multiple widgets     |
| `database`   | SQLite database viewer                      |
| `docker`     | Docker container management                 |
| `document`   | View/edit markdown documents                |
| `files`      | File browser with preview                   |
| `flight`     | Compare flights and select seats            |
| `tracker`    | Real-time flight tracking with map          |
| `github`     | GitHub PR/issue tracking                    |
| `habits`     | Habit tracker with streaks                  |
| `json`       | Interactive JSON file viewer/explorer       |
| `kanban`     | Kanban board task management                |
| `logs`       | Log file viewer with tailing and filtering  |
| `markdown`   | Markdown file viewer with syntax highlight  |
| `music`      | Music player control (Spotify/Apple Music)  |
| `network`    | Network ping monitor with latency graphs    |
| `notes`      | Quick notes scratchpad with auto-save       |
| `password`   | Password generator with strength analysis   |
| `pomodoro`   | Pomodoro timer with ASCII countdown         |
| `process`    | Process manager (htop-like)                 |
| `regex`      | Regex tester with live matching             |
| `rss`        | RSS/Atom feed reader                        |
| `system`     | System monitor (CPU, memory, disk, network) |
| `timer`      | Countdown/stopwatch timer                   |
| `units`      | Unit converter (length, weight, temp, etc.) |
| `weather`    | Weather forecast with ASCII art             |
| `worldclock` | World clock with multiple timezones         |

## Installation

```bash
# Add as Claude Code plugin
claude --plugin-dir /path/to/claude-canvas/canvas

# Or via marketplace
/plugin marketplace add djsiegel/claude-canvas
/plugin install claude-canvas@canvas
```

## Usage

```bash
# Show canvas in current terminal
bun run src/cli.ts show <canvas-type>

# Examples
bun run src/cli.ts show calendar
bun run src/cli.ts show dashboard
bun run src/cli.ts show system
bun run src/cli.ts show crypto
bun run src/cli.ts show network

# Spawn canvas in split pane
bun run src/cli.ts spawn calendar --scenario meeting-picker
bun run src/cli.ts spawn document --config '{"content": "# Hello"}'
bun run src/cli.ts spawn pomodoro
bun run src/cli.ts spawn notes
```

## Canvas Features

### Dashboard Canvas

Unified view with multiple widgets:

- Clock with date display
- Weather widget with current conditions
- System monitor (CPU/memory)
- Calendar with upcoming events
- Toggle widgets with 1-4 keys

### System Monitor

- Real-time CPU usage per core
- Memory and swap usage
- Disk space overview
- Network I/O stats
- Process count and uptime

### Crypto Canvas

- Real-time prices from CoinGecko API
- 24h change percentages
- Sparkline price graphs
- Customizable watchlist
- Auto-refresh every 30 seconds

### Network Monitor

- Multi-host ping monitoring
- Latency sparkline graphs
- Packet loss tracking
- DNS resolution checks
- Network interface info

### RSS Feed Reader

- Multiple feed support
- Article preview
- Time-ago display
- Feed tabs for organization
- Open articles in browser

### Log Viewer

- Real-time log tailing
- Pattern filtering
- Log level highlighting (ERROR, WARN, INFO, DEBUG)
- Line numbers and timestamps
- Follow mode for live logs

### Process Manager

- Process list with CPU/memory usage
- Tree view mode
- Search/filter processes
- Kill signals (TERM, KILL)
- Sort by CPU, memory, PID, name

### Database Viewer

- SQLite file browser
- Table list with row counts
- Schema inspection
- SQL query execution (read-only)
- Result pagination

### Music Player

- Control Spotify or Apple Music via AppleScript
- Play/pause, next/previous track
- Volume control
- Current track display with progress bar
- Shuffle and repeat toggles

### File Browser

- Two-pane file explorer
- Directory navigation with history
- Text file preview
- File info (size, permissions, dates)
- Search and hidden file toggle

### Clipboard History

- Track clipboard history (last 50 items)
- Preview selected entry
- Copy from history
- Search/filter entries
- Clear individual or all entries

### AI Chat

- Chat interface for AI conversations
- Message history with scroll
- Input area at bottom
- Loading indicator for responses
- Clear history option

### Bookmarks Manager

- Import from Chrome/Firefox/Safari
- Folder organization
- Search and filter
- Quick open in browser
- Add/edit/delete bookmarks

### Calculator

- Scientific calculator mode
- Expression history
- Keyboard number input
- Common functions (sin, cos, sqrt, etc.)
- Copy results to clipboard

### Colors

- Color picker with hex/rgb/hsl
- Palette generation (complementary, analogous, triadic)
- Color blindness simulation
- Copy color codes
- Save favorite colors

### Habits Tracker

- Daily habit tracking
- Streak visualization
- Weekly/monthly views
- Progress statistics
- Habit categories

### JSON Viewer

- Tree view with expand/collapse
- Search keys and values
- Copy values or paths
- Syntax highlighting by type
- File picker for .json files

### Kanban Board

- Three columns (Todo, In Progress, Done)
- Drag cards between columns
- Priority levels (low, medium, high, urgent)
- Multiple boards support
- Persistent storage

### Markdown Viewer

- Syntax highlighted rendering
- Heading navigation
- Code block formatting
- Link detection
- File picker for .md files

### Password Generator

- Configurable length and complexity
- Character type toggles (upper, lower, numbers, symbols)
- Password strength meter
- Pronounceable password option
- Bulk generation

### Regex Tester

- Live pattern matching
- Match highlighting
- Capture group display
- Common pattern presets
- Flag toggles (g, i, m, etc.)

### Timer

- Countdown timer mode
- Stopwatch mode
- Lap times
- Preset durations
- Sound notification

### Units Converter

- Length, weight, temperature, volume
- Currency conversion
- Quick swap units
- Conversion history
- Common unit presets

### World Clock

- Multiple timezone display
- Add/remove cities
- Current time with date
- Time difference from local
- Day/night indicator

## Themes

Canvas supports multiple themes. Press `T` in most canvases to cycle themes:

| Theme       | Description                     |
| ----------- | ------------------------------- |
| `cyberpunk` | Neon colors on dark (default)   |
| `dark`      | Muted grays with blue accents   |
| `light`     | Light background with dark text |
| `minimal`   | Black and white only            |
| `matrix`    | Green on black                  |

## Terminal Support

Canvas works with multiple terminal emulators:

| Terminal           | Support Level     | Notes                             |
| ------------------ | ----------------- | --------------------------------- |
| **tmux**           | Full (split pane) | Recommended for best experience   |
| **iTerm2**         | Full (split pane) | Native AppleScript integration    |
| **Kitty**          | Full (split pane) | Requires remote control enabled   |
| **WezTerm**        | Full (split pane) | CLI-based pane creation           |
| **VS Code**        | Partial           | Use Cmd+Shift+5 to split manually |
| **Alacritty**      | New window        | No split pane support             |
| **Apple Terminal** | New window        | Position-based window placement   |

### Terminal Detection

Canvas automatically detects your terminal and uses the best available spawn method:

```typescript
// Priority order for spawning
1. iTerm2 (if running) → vertical split pane
2. tmux (if in session) → horizontal split with 67% width
3. Kitty (if running) → new OS window with command
4. WezTerm (if running) → CLI pane spawn
5. VS Code (if running) → new terminal process
6. Alacritty (if running) → new window
7. Apple Terminal → new window with positioning
```

## Keyboard Controls

Common controls across canvases:

| Key       | Action                |
| --------- | --------------------- |
| `?`       | Toggle help overlay   |
| `Tab`     | Open canvas navigator |
| `T`       | Cycle themes          |
| `q`/`Esc` | Quit                  |
| `↑/↓`     | Navigate              |
| `Enter`   | Select/Confirm        |

Canvas-specific controls are shown in the help overlay (`?`).

## Commands

- `/canvas` - Interactive canvas spawning

## Skills

- `canvas` - Main skill with overview and IPC details
- `calendar` - Calendar display and meeting picker
- `document` - Markdown rendering and text selection
- `flight` - Flight comparison and seatmaps

## Architecture

```
canvas/
├── src/
│   ├── cli.ts           # CLI entry point
│   ├── terminal.ts      # Terminal detection + spawning
│   ├── canvases/        # React/Ink canvas components
│   │   ├── calendar.tsx
│   │   ├── dashboard.tsx
│   │   ├── system.tsx
│   │   ├── crypto.tsx
│   │   ├── network.tsx
│   │   └── ...
│   ├── services/        # Data services (APIs, system commands)
│   │   ├── weather.ts
│   │   ├── system.ts
│   │   ├── crypto.ts
│   │   ├── network.ts
│   │   └── ...
│   ├── themes/          # Theme system
│   ├── components/      # Shared components
│   └── ipc/             # Unix socket server/client
└── package.json
```

## Requirements

- **Bun** - Runtime for CLI commands
- **Supported Terminal** - See terminal support section
- **Terminal with mouse support** - For interactive scenarios (optional)

## License

MIT
