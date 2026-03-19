# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts Vite dev server + Electron)
npm run dev

# Build for production (Vite build + electron-builder)
npm run build

# Renderer only (browser, port 5173)
npm run dev:renderer
```

There are no tests or linting configured in this project.

## Architecture

**ARI (Aventa Race Intelligence)** is an Electron + React + Vite desktop overlay app for iRacing sim racing.

### Process Model

The app runs multiple Electron windows:
- **Control Panel** (`src/main/main.js:createControlWindow`) — Framed window, 420×680px, loads React app at `/`
- **Overlay windows** (`createOverlayWindow`) — Frameless, transparent, always-on-top, focusable=false, mouse-events ignored. Each loads at `/#/overlay/<id>`

Routing in `App.jsx` is hash-based: `window.location.hash` determines which component renders.

### iRacing Telemetry Pipeline

`src/main/iracing.js` reads iRacing data with zero npm dependencies:
1. On first run, compiles `ari_bridge.cs` → `ari_bridge.exe` using Windows `csc.exe`
2. Spawns the C# executable as a subprocess
3. C# reads iRacing's memory-mapped file (MMF) and pipes binary telemetry to Node.js
4. JavaScript parses binary and broadcasts to all windows via `webContents.send('telemetry-update', data)`

### IPC / Context Bridge

`src/main/preload.js` exposes `window.ari` API to the renderer:
- `window.ari.onTelemetry(cb)` — subscribe to telemetry updates
- Overlay position/size save/load goes through IPC to the main process which uses `electron-store`

### Overlay Positioning

Overlay bounds defaults are defined in `OVERLAY_DEFAULTS` in `main.js`. Positions/sizes are persisted via `electron-store` under `overlay.<id>`. The renderer triggers saves through IPC calls when the user drags/resizes.

### Renderer Hooks

- `useTelemetry` (`src/renderer/hooks/useTelemetry.js`) — Connects to iRacing via `window.ari.onTelemetry()`. Falls back to demo data generator when running in a browser (no Electron context).
- `useOverlayScale` — Computes a scale factor for responsive overlay sizing.

### Track Map System

`src/main/trackmap-builder.js` scans `.ibt` (iRacing replay) files to extract GPS coordinates and build track maps. Track data is cached in electron-store. `src/main/track-database.js` holds known track metadata.

### Overlay Components

All live in `src/renderer/components/overlays/`:
- `RelativeOverlay` — drivers ahead/behind with gap times
- `StandingsOverlay` — full race order
- `FuelOverlay` — fuel consumption and pit strategy
- `TrackMapOverlay` — live car positions on track
- `InputsOverlay` — throttle/brake/steering/clutch + delta time
- `TyreOverlay` — tyre temps, wear, compound

### Legacy Python Code

The `pages/`, `telemetry/`, and `iracing_ui.py` files are a superseded Python-based UI. They are not used by the current Electron app.
