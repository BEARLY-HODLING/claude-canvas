# Claude Canvas

A TUI toolkit that gives Claude Code its own display. Spawn interactive terminal interfaces for calendars, documents, flight tracking, weather, system monitoring, and more.

**Note:** Fork of [dvdsgl/claude-canvas](https://github.com/dvdsgl/claude-canvas) with added iTerm2/Apple Terminal support and real-time data canvases.

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

# Spawn a canvas
bun run canvas/src/cli.ts spawn calendar
bun run canvas/src/cli.ts spawn tracker
bun run canvas/src/cli.ts spawn weather
bun run canvas/src/cli.ts spawn system
```

## Canvas Types

| Canvas     | Description                       | Key Features                                    |
| ---------- | --------------------------------- | ----------------------------------------------- |
| `calendar` | Weekly view, meeting picker       | Navigate weeks, select time slots               |
| `document` | Markdown viewer/editor            | Display, edit, email preview modes              |
| `flight`   | Flight comparison UI              | Seat selection, booking interface               |
| `tracker`  | **Real-time flight tracking**     | Live positions, watchlist, ASCII world map      |
| `weather`  | **Weather conditions & forecast** | Current conditions, 7-day forecast, city search |
| `system`   | **System monitor**                | CPU sparklines, memory, disk, top processes     |

### Global Keybindings (v0.6)

| Key   | Action                              |
| ----- | ----------------------------------- |
| `?`   | Show help overlay with all controls |
| `Tab` | Open canvas navigator               |
| `q`   | Exit canvas                         |

---

## Flight Tracker (`tracker`)

Real-time flight tracking using the free OpenSky Network API.

```bash
bun run canvas/src/cli.ts spawn tracker
```

### Features

- Search flights by callsign (e.g., `UAL123`, `BAW456`)
- Search flights by route (origin → destination airports)
- Live position tracking with auto-refresh (5-60 second intervals)
- ASCII world map with filled continents showing flight positions
- Watchlist to track multiple flights simultaneously
- Status change alerts via IPC

### Controls

| Key       | Action                  |
| --------- | ----------------------- |
| `s`       | Search by callsign      |
| `r`       | Search by route         |
| `w`       | Add to watchlist        |
| `W`       | Remove from watchlist   |
| `↑` / `↓` | Navigate flight list    |
| `+` / `-` | Adjust refresh interval |
| `Space`   | Manual refresh          |

### Map Legend

| Symbol | Meaning |
| ------ | ------- |
| `█`    | Land    |
| `░`    | Ocean   |
| `◉`    | Airport |
| `↑↗→↘` | Flight  |

---

## Weather Canvas (`weather`)

Weather conditions and forecasts using the free Open-Meteo API (no API key required).

```bash
bun run canvas/src/cli.ts spawn weather
```

### Features

- Current conditions: temperature, feels like, humidity, wind, precipitation
- 7-day forecast with high/low temps and rain probability
- Weather icons using WMO codes (☀️ ☁️ 🌧️ ⛈️ ❄️)
- City search via geocoding
- Location watchlist for quick switching

### Controls

| Key       | Action                |
| --------- | --------------------- |
| `/`       | Search for city       |
| `w`       | Add to watchlist      |
| `W`       | Remove from watchlist |
| `↑` / `↓` | Navigate locations    |
| `Enter`   | Select location       |

---

## System Monitor (`system`)

Real-time system resource monitoring.

```bash
bun run canvas/src/cli.ts spawn system
```

### Features

- CPU usage with 40-point sparkline history
- Memory usage with progress bars
- Disk usage for all mounted volumes
- Top processes sorted by CPU usage
- Alert thresholds for CPU (80%), memory (90%), disk (95%)
- Pause/resume monitoring

### Controls

| Key       | Action                  |
| --------- | ----------------------- |
| `p`       | Pause/resume monitoring |
| `+` / `-` | Adjust refresh interval |
| `↑` / `↓` | Scroll process list     |

---

## Calendar Canvas (`calendar`)

Weekly calendar view with meeting time picker.

```bash
# Basic calendar
bun run canvas/src/cli.ts spawn calendar

# With events
bun run canvas/src/cli.ts spawn calendar --config '{"events":[{"title":"Meeting","start":"2025-01-07T10:00","end":"2025-01-07T11:00","color":"blue"}]}'

# Meeting picker mode
bun run canvas/src/cli.ts spawn calendar --scenario meeting-picker
```

### Controls

| Key       | Action             |
| --------- | ------------------ |
| `←` / `→` | Navigate weeks     |
| `t`       | Jump to today      |
| `n` / `p` | Next/previous week |

---

## Document Canvas (`document`)

Markdown viewer and editor.

```bash
bun run canvas/src/cli.ts spawn document --config '{"content":"# Hello World\n\nThis is markdown."}'
```

---

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
│ (your terminal)     │ (tracker/weather/…) │
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

Canvas tracks open panes/windows and **reuses them** for subsequent spawns instead of creating new ones.

---

## APIs Used

| API                 | Canvas    | Free Tier   | Data                            |
| ------------------- | --------- | ----------- | ------------------------------- |
| OpenSky Network     | `tracker` | Unlimited\* | Live aircraft position/velocity |
| Open-Meteo          | `weather` | Unlimited   | Weather, forecast, geocoding    |
| Node.js `os` module | `system`  | Built-in    | CPU, memory, network            |

\*Rate limited for unauthenticated requests

---

## Claude Code Plugin Installation

```bash
# Add marketplace
/plugin marketplace add BEARLY-HODLING/claude-canvas

# Install plugin
/plugin install canvas@claude-canvas
```

---

## Development

```bash
# Run CLI directly
bun run canvas/src/cli.ts [command]

# Show canvas in current terminal (for testing)
bun run canvas/src/cli.ts show tracker

# Check terminal detection
bun run canvas/src/cli.ts env

# Run tests
cd canvas && bun test
```

---

## License

MIT
