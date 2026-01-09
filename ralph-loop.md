# Ralph Loop - Canvas v0.4-v0.6 Implementation

## Problem Statement

Extend the canvas toolkit with new practical canvas types: Weather (v0.4), System Monitor (v0.5), and polish existing canvases (v0.6).

## Constraints

- Must use free APIs (no API keys required for core functionality)
- Must work within existing Ink/React TUI framework
- Must maintain existing IPC architecture
- Must follow cyberpunk TUI aesthetic
- Must be useful for developers/power users

## Current Understanding

- v0.2-v0.3 complete: Flight tracker with real-time data, watchlist, alerts
- Existing canvases: calendar, document, flight, flight-tracker, weather, system
- IPC supports: ready, selected, cancelled, error, alert messages
- Pattern established: service layer → React hooks → Ink components

## Hypotheses - v0.4 (Weather Canvas) ✅ COMPLETE

1. [x] H1: Open-Meteo API provides free weather data without API key
2. [x] H2: Can display current conditions with ASCII weather icons
3. [x] H3: Can show 7-day forecast in compact TUI format
4. [x] H4: Can search locations by city name (geocoding)
5. [x] H5: Can implement location watchlist similar to flight tracker

## Hypotheses - v0.5 (System Monitor) ✅ COMPLETE

1. [x] H6: Can read CPU/memory/disk via Node.js os module + Bun APIs
2. [x] H7: Can list processes using ps command on Unix
3. [x] H8: Can display ASCII bar charts and sparklines
4. [x] H9: Can set alert thresholds with IPC notifications

## Hypotheses - v0.6 (Polish) ✅ COMPLETE

1. [x] H10: Can add unified keybindings (help overlay with ? key)
2. [x] H12: Can add canvas navigation (Tab key, CanvasNavigator component)
3. [ ] H11: Calendar event creation (moved to backlog)

## Experiments

| #   | Hypothesis | Test                        | Result | Learning                                     |
| --- | ---------- | --------------------------- | ------ | -------------------------------------------- |
| 11  | H1         | Fetch Open-Meteo API        | PASS   | Free, no key needed, good WMO weather codes  |
| 12  | H2         | ASCII weather icons display | PASS   | Unicode emojis work well in terminal         |
| 13  | H3         | 7-day forecast TUI          | PASS   | Compact layout with temp high/low + precip % |
| 14  | H4         | Geocoding city search       | PASS   | Open-Meteo has free geocoding endpoint       |
| 15  | H5         | Location watchlist          | PASS   | Same pattern as flight tracker works well    |
| 16  | H6         | CPU/memory via os module    | PASS   | os.cpus(), os.freemem(), os.totalmem() work  |
| 17  | H7         | Process list via ps         | PASS   | `ps -axo pid,pcpu,pmem,state,user,comm -r`   |
| 18  | H8         | ASCII bar charts/sparklines | PASS   | ▁▂▃▄▅▆▇█ chars for sparklines, █░ for bars   |
| 19  | H9         | IPC alert thresholds        | PASS   | Uses existing sendAlert pattern              |
| 20  | H10        | Help overlay with ? key     | PASS   | HelpOverlay component with categorized keys  |

## v0.2-v0.3 Summary (COMPLETE)

- OpenSky API integration (free, no auth)
- Flight search by callsign and route
- Real-time position tracking with auto-refresh
- Watchlist with ★ indicators
- IPC alerts for status changes
- Improved ASCII world map

## v0.4 Summary (COMPLETE)

- Open-Meteo API integration (free, no key)
- WMO weather codes with emoji icons (☀ ☁ 🌧 ⛈ ❄ etc.)
- Current conditions: temp, feels like, humidity, wind, precipitation
- 7-day forecast with high/low temps and rain probability
- City search via geocoding API
- Location watchlist with quick switching

## v0.5 Summary (COMPLETE)

- System overview: hostname, platform, uptime, load average
- CPU monitoring with user/system/idle breakdown
- Sparkline history visualization (40-point rolling)
- Memory usage with free/used/total
- Disk usage for mounted volumes
- Top processes by CPU (sorted, configurable limit)
- Alert thresholds for CPU/memory/disk
- Pause/resume, adjustable refresh interval

## v0.6 Summary (COMPLETE)

- Created HelpOverlay component with categorized keybindings
- Added ? key to toggle help overlay (System canvas demo)
- Defined keybinding presets for all canvas types
- Created CanvasNavigator component for switching canvases
- Added Tab key to show canvas navigator overlay
- Unified status bars with keybinding hints

## All Milestones Complete! 🎉

Canvas toolkit now includes:

- **6 canvas types**: calendar, document, flight, tracker, weather, system
- **3 external APIs**: OpenSky (flights), Open-Meteo (weather), Node.js os (system)
- **Unified UX**: Help overlay (? key), Canvas navigator (Tab key), consistent keybindings
- **Real-time monitoring**: Live flight tracking, weather updates, system stats
