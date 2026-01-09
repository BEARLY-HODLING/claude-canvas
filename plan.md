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

### Backlog

- [ ] Stock/crypto ticker canvas
- [ ] Pomodoro timer canvas
- [ ] Git status canvas
- [ ] Docker container monitor canvas
- [ ] Calendar canvas improvements (event creation)
- [ ] Document canvas enhancements (syntax highlighting)
- [ ] Add secondary API for flight status/delays (AviationStack)

## Current Focus

**v0.6 COMPLETE!** All planned milestones achieved.

Available canvases:

- **calendar** - Date and time picker
- **document** - Document viewer/editor
- **flight** - Flight booking UI
- **tracker** - Real-time flight tracking with watchlist
- **weather** - Weather conditions and 7-day forecast
- **system** - CPU, memory, disk, process monitoring

## API Summary

| API        | Canvas  | Free Tier                | Data                            |
| ---------- | ------- | ------------------------ | ------------------------------- |
| OpenSky    | tracker | Unlimited (rate limited) | Live aircraft position/velocity |
| Open-Meteo | weather | Unlimited                | Weather, forecast, geocoding    |
| Node.js os | system  | Built-in                 | CPU, memory, network            |
| ps command | system  | Built-in                 | Process list                    |

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
