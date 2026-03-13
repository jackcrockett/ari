# ARI — Aventa Race Intelligence

Premium sim racing overlays for iRacing. Dark, broadcast-quality, built for competitive racers and streamers.

## Quick Start

### 1. Install dependencies
```
npm install
```

### 2. Run in development mode
```
npm run dev
```

This opens the ARI control panel. Overlays run in **demo mode** automatically if iRacing isn't running — you'll see live animated data so you can design and test without needing to be in a session.

### 3. Toggle overlays
Click the toggle switches in the control panel to show/hide each overlay on screen.

---

## Project Structure

```
ari/
├── src/
│   ├── main/
│   │   ├── main.js          # Electron main process
│   │   ├── iracing.js       # iRacing SDK bridge + demo mode
│   │   └── preload.js       # Secure IPC bridge
│   └── renderer/
│       ├── App.jsx           # Router
│       ├── main.jsx          # React entry point
│       ├── components/
│       │   ├── ControlPanel.jsx
│       │   └── overlays/
│       │       ├── RelativeOverlay.jsx
│       │       ├── StandingsOverlay.jsx
│       │       └── FuelOverlay.jsx
│       ├── hooks/
│       │   └── useTelemetry.js   # iRacing data hook + formatters
│       └── styles/
│           └── global.css        # ARI design tokens
├── index.html
├── vite.config.js
└── package.json
```

## Overlays

| Overlay    | Description |
|------------|-------------|
| Relative   | Cars ±2 positions with gap times, iRating, license |
| Standings  | Full race order, gaps to leader, pit/fastest lap badges |
| Fuel Calc  | Remaining fuel, per-lap usage, shortfall warning |
| Track Map  | *(coming soon)* |

## iRacing Setup

Make sure iRacing is running in **Windowed** or **Borderless** mode (not exclusive fullscreen) for overlays to appear on top.

In iRacing app.ini:
```
windowedMode=1
```

## Tech Stack

- **Electron** — desktop app shell, overlay window management
- **React + Vite** — UI framework
- **node-irsdk** — iRacing shared memory SDK
- **Barlow / DM Mono** — ARI typography
