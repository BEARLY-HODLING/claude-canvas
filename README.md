# Claude Canvas

A TUI toolkit that gives Claude Code its own display. Spawn interactive terminal interfaces for calendars, documents, flight tracking, weather, system monitoring, and more.

**Note:** Fork of [dvdsgl/claude-canvas](https://github.com/dvdsgl/claude-canvas) with added iTerm2/Apple Terminal support and real-time data canvases.

![Claude Canvas Screenshot](media/screenshot.png)

## Requirements

- [Bun](https://bun.sh) — runtime for canvas tools
- **One of:**
  - **iTerm2** — split panes (recommended for macOS)
  - **tmux** — split panes (cross-platform)
  - **Kitty** — split panes (GPU-accelerated)
  - **WezTerm** — split panes (cross-platform)
  - **Alacritty** — new window mode (GPU-accelerated)
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
bun run canvas/src/cli.ts spawn dashboard
bun run canvas/src/cli.ts spawn pomodoro
bun run canvas/src/cli.ts spawn notes
bun run canvas/src/cli.ts spawn crypto
bun run canvas/src/cli.ts spawn github
bun run canvas/src/cli.ts spawn docker
bun run canvas/src/cli.ts spawn network
```

## Canvas Types

| Canvas      | Description                       | Key Features                                     |
| ----------- | --------------------------------- | ------------------------------------------------ |
| `calendar`  | Weekly view, meeting picker       | Navigate weeks, select time slots                |
| `document`  | Markdown viewer/editor            | Display, edit, email preview modes               |
| `flight`    | Flight comparison UI              | Seat selection, booking interface                |
| `tracker`   | **Real-time flight tracking**     | Live positions, watchlist, ASCII world map       |
| `weather`   | **Weather conditions & forecast** | Current conditions, 7-day forecast, city search  |
| `system`    | **System monitor**                | CPU sparklines, memory, disk, top processes      |
| `dashboard` | **Unified dashboard**             | Weather, system, calendar, clock widgets         |
| `pomodoro`  | **Pomodoro timer**                | Work/break cycles, ASCII timer, session tracking |
| `notes`     | **Quick notes/scratchpad**        | Auto-save, search, timestamps                    |
| `crypto`    | **Cryptocurrency tracker**        | BTC/ETH/SOL prices, 24h change, sparklines       |
| `github`    | **GitHub PR/issue monitor**       | PR tracking, repo stats, status indicators       |
| `docker`    | **Docker container monitor**      | Container status, CPU/memory, logs               |
| `network`   | **Network ping monitor**          | Latency sparklines, packet loss, multi-host      |

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

## Dashboard Canvas (`dashboard`)

Unified dashboard combining multiple widgets in a single view.

```bash
bun run canvas/src/cli.ts spawn dashboard
```

### Features

- Weather widget with current conditions and mini forecast
- System monitor widget with CPU/memory sparklines
- Calendar widget showing today's events and upcoming schedule
- Digital clock with date display
- Responsive grid layout adapts to terminal size
- All widgets update in real-time

### Controls

| Key       | Action                      |
| --------- | --------------------------- |
| `Tab`     | Cycle focus between widgets |
| `r`       | Refresh all widgets         |
| `1-4`     | Focus specific widget       |
| `+` / `-` | Adjust refresh interval     |

---

## Pomodoro Canvas (`pomodoro`)

Pomodoro timer with work and break cycles for focused productivity.

```bash
bun run canvas/src/cli.ts spawn pomodoro
```

### Features

- Standard Pomodoro cycles: 25 min work, 5 min short break, 15 min long break
- Large ASCII timer display for visibility
- Session tracking with completed pomodoro count
- Audio/visual notifications on cycle completion
- Automatic transition between work and break periods
- Statistics view showing daily/weekly productivity

### Controls

| Key       | Action                          |
| --------- | ------------------------------- |
| `Space`   | Start/pause timer               |
| `r`       | Reset current timer             |
| `s`       | Skip to next cycle              |
| `+` / `-` | Adjust work duration (+/- 5min) |
| `Tab`     | Toggle statistics view          |

---

## Notes Canvas (`notes`)

Quick notes and scratchpad with persistent storage.

```bash
bun run canvas/src/cli.ts spawn notes
```

### Features

- Auto-save notes to local storage
- Searchable note history
- Timestamps on all entries
- Markdown preview support
- Quick capture mode for rapid note-taking
- Export notes to file

### Controls

| Key       | Action                   |
| --------- | ------------------------ |
| `n`       | Create new note          |
| `Enter`   | Edit selected note       |
| `d`       | Delete selected note     |
| `/`       | Search notes             |
| `↑` / `↓` | Navigate note list       |
| `e`       | Export notes to file     |
| `Esc`     | Cancel/exit current mode |

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

| Terminal           | Mode       | Setup                                |
| ------------------ | ---------- | ------------------------------------ |
| **iTerm2**         | Split pane | Just run in iTerm2                   |
| **tmux**           | Split pane | Start a `tmux` session               |
| **Kitty**          | Split pane | Just run in Kitty (GPU-accelerated)  |
| **WezTerm**        | Split pane | Just run in WezTerm (cross-platform) |
| **Alacritty**      | New window | Just run (GPU-accelerated)           |
| **Apple Terminal** | New window | Just run (window auto-positions)     |

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
