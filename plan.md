# Canvas Project Plan

## Overview

Transform claude-canvas from a demo TUI toolkit into a practical tool with real functionality, including real-time flight tracking, weather monitoring, and system monitoring.

## Goals

- [x] Make flight canvas useful with real-time flight data
- [x] Add new canvas types for practical use cases
- [x] Improve existing canvas components

## Milestones

### v0.2 - Real-Time Flight Tracking (COMPLETE)

- [x] Research flight data APIs (FlightAware, AviationStack, OpenSky, etc.)
- [x] Create flight data service with OpenSky API integration
- [x] Implement flight lookup by flight number (callsign)
- [x] Display real-time status (on-ground, in-air)
- [x] Show live position tracking (lat/lon, altitude, speed, heading)
- [x] Add flight path visualization (ASCII map)

### v0.3 - Flight Canvas Enhancements (COMPLETE)

- [x] Search flights by route (origin/destination)
- [x] Multi-flight tracking (watch list) - w/W keys, ★ indicator
- [x] Auto-refresh with configurable interval (+/- keys, 5-60s)
- [x] Push notifications for status changes (via IPC sendAlert)
- [x] Improved ASCII map with detailed continent outlines

### v0.4 - Weather Canvas (COMPLETE)

- [x] Create weather service with free API (Open-Meteo)
- [x] Current conditions display (temp, humidity, wind, conditions)
- [x] 7-day forecast visualization
- [x] ASCII weather icons (☀ ☁ 🌧 ⛈ ❄ etc.)
- [x] Location search by city name (geocoding)
- [x] Multi-location watchlist

### v0.5 - System Monitor Canvas (COMPLETE)

- [x] Real-time CPU, memory, disk usage
- [x] Process list with sorting (by CPU)
- [x] ASCII bar charts and sparklines
- [x] Alert thresholds for resource warnings (CPU/memory/disk)
- [x] Pause/resume and adjustable refresh interval

### v0.6 - Canvas Polish & Integration (COMPLETE)

- [x] Unified keybindings across all canvases (? for help)
- [x] HelpOverlay component with categorized keybindings
- [x] Canvas-to-canvas navigation (Tab key, CanvasNavigator)
- [x] Consistent status bars with keybinding hints

### v0.7 - Extended Canvas Suite (COMPLETE)

- [x] Crypto canvas - CoinGecko API prices and watchlist
- [x] Pomodoro timer canvas
- [x] Docker container monitor canvas
- [x] GitHub PR/issue tracking canvas
- [x] Network ping monitor canvas
- [x] RSS feed reader canvas
- [x] Log file viewer canvas
- [x] Process manager (htop-like) canvas
- [x] Database (SQLite) viewer canvas
- [x] Music player control canvas (Spotify/Apple Music)
- [x] File browser canvas
- [x] Clipboard history manager canvas
- [x] AI Chat interface canvas

### v1.0 - Utility Canvas Suite (COMPLETE)

- [x] Bookmarks manager canvas
- [x] Calculator canvas (scientific)
- [x] Colors picker/palette canvas
- [x] Habits tracker canvas
- [x] JSON viewer/explorer canvas
- [x] Kanban board canvas
- [x] Markdown viewer canvas
- [x] Password generator canvas
- [x] Regex tester canvas
- [x] Timer/stopwatch canvas
- [x] Units converter canvas
- [x] World clock canvas
- [x] Shared FilePicker component extracted

### Backlog

- [ ] Git status canvas
- [ ] Calendar canvas improvements (event creation)
- [ ] Add secondary API for flight status/delays (AviationStack)
- [ ] Convert test scripts to proper bun test assertions

## Current Focus

**v1.0 COMPLETE!** 33 canvas types now available.

Available canvases:

- **bookmarks** - Browser bookmark manager
- **calculator** - Scientific calculator
- **calendar** - Date and time picker
- **chat** - AI chat interface
- **clipboard** - Clipboard history manager
- **colors** - Color picker and palette generator
- **crypto** - Cryptocurrency prices
- **dashboard** - Unified multi-widget dashboard
- **database** - SQLite database viewer
- **docker** - Docker container management
- **document** - Document viewer/editor
- **files** - File browser with preview
- **flight** - Flight booking UI
- **tracker** - Real-time flight tracking
- **github** - GitHub PR/issue tracking
- **habits** - Habit tracker with streaks
- **json** - JSON file viewer/explorer
- **kanban** - Kanban board task management
- **logs** - Log file viewer
- **markdown** - Markdown file viewer
- **music** - Music player control
- **network** - Network ping monitor
- **notes** - Quick notes scratchpad
- **password** - Password generator
- **pomodoro** - Pomodoro timer
- **process** - Process manager
- **regex** - Regex tester
- **rss** - RSS/Atom feed reader
- **system** - System monitor
- **timer** - Countdown/stopwatch
- **units** - Unit converter
- **weather** - Weather forecast
- **worldclock** - World clock

## API Summary

| API          | Canvas     | Free Tier                | Data                            |
| ------------ | ---------- | ------------------------ | ------------------------------- |
| OpenSky      | tracker    | Unlimited (rate limited) | Live aircraft position/velocity |
| Open-Meteo   | weather    | Unlimited                | Weather, forecast, geocoding    |
| CoinGecko    | crypto     | Unlimited (rate limited) | Cryptocurrency prices           |
| GitHub API   | github     | 60 req/hour (unauth)     | PRs, issues, repos              |
| Node.js os   | system     | Built-in                 | CPU, memory, network            |
| ps command   | system     | Built-in                 | Process list                    |
| Docker CLI   | docker     | Built-in                 | Container management            |
| AppleScript  | music      | Built-in                 | Spotify/Apple Music control     |
| bun:sqlite   | database   | Built-in                 | SQLite database access          |
| ping command | network    | Built-in                 | Network latency                 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Canvas Framework                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐   │
│  │  Services   │────▶│   Canvases   │────▶│    CLI      │   │
│  │ (API/data)  │     │  (Ink/React) │     │ (commander) │   │
│  └─────────────┘     └──────────────┘     └─────────────┘   │
│                              │                               │
│  Services:                   │              ┌─────────────┐  │
│  - opensky.ts (flights)      └─────────────▶│ IPC Server  │  │
│  - weather.ts (weather)                     │ (Unix sock) │  │
│  - system.ts (system)                       └─────────────┘  │
│  - flight-service.ts                                         │
│                                                              │
│  Components:                                                 │
│  - HelpOverlay (unified keybindings)                        │
│  - CanvasNavigator (switch between canvases)                │
│  - CanvasErrorBoundary (error handling)                     │
│  - FilePicker (shared file selection)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### v0.4 (Weather)

- `src/services/weather.ts` - Open-Meteo API integration
- `src/services/weather.test.ts` - Service tests
- `src/canvases/weather.tsx` - Weather TUI component
- `src/canvases/weather/types.ts` - Type definitions

### v0.5 (System Monitor)

- `src/services/system.ts` - CPU/memory/disk/process monitoring
- `src/services/system.test.ts` - Service tests
- `src/canvases/system.tsx` - System monitor TUI component
- `src/canvases/system/types.ts` - Type definitions

### v0.6 (Polish)

- `src/components/help-overlay.tsx` - Unified help overlay
- `src/components/canvas-navigator.tsx` - Canvas switching

### v0.7 (Extended Suite)

- `src/canvases/crypto.tsx` + `src/services/crypto.ts`
- `src/canvases/pomodoro.tsx`
- `src/canvases/docker.tsx` + `src/services/docker.ts`
- `src/canvases/github.tsx` + `src/services/github.ts`
- `src/canvases/network.tsx` + `src/services/network.ts`
- `src/canvases/rss.tsx` + `src/services/rss.ts`
- `src/canvases/logs.tsx` + `src/services/logs.ts`
- `src/canvases/process.tsx` + `src/services/process.ts`
- `src/canvases/database.tsx` + `src/services/database.ts`
- `src/canvases/music.tsx` + `src/services/music.ts`
- `src/canvases/files.tsx` + `src/services/files.ts`
- `src/canvases/clipboard.tsx` + `src/services/clipboard.ts`
- `src/canvases/chat.tsx` + `src/services/chat.ts`
- `src/canvases/notes.tsx`
- `src/canvases/dashboard.tsx`

### v1.0 (Utility Suite)

- `src/canvases/bookmarks.tsx` + `src/services/bookmarks.ts`
- `src/canvases/calculator.tsx` + `src/services/calculator.ts`
- `src/canvases/colors.tsx` + `src/services/colors.ts`
- `src/canvases/habits.tsx` + `src/services/habits.ts`
- `src/canvases/json.tsx` + `src/services/json.ts`
- `src/canvases/kanban.tsx` + `src/services/kanban.ts`
- `src/canvases/markdown.tsx` + `src/services/markdown.ts`
- `src/canvases/password.tsx` + `src/services/password.ts`
- `src/canvases/regex.tsx` + `src/services/regex.ts`
- `src/canvases/timer.tsx` + `src/services/timer.ts`
- `src/canvases/units.tsx` + `src/services/units.ts`
- `src/canvases/worldclock.tsx` + `src/services/worldclock.ts`
- `src/components/file-picker.tsx` - Shared file picker component
- `src/themes/` - Theme system
