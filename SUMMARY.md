# ARI Competitive Uplift Summary

**Project**: Aventa Race Intelligence (ARI)
**Stack**: Electron + React + Vite + C# bridge (iRacing MMF reader)
**Completed**: 2026-04-18
**Commits**: v0.6 through v1.0 (6 phases)

---

## What Was Built

### v0.6 -- Correctness Fixes + Telemetry Foundation
**Commit**: `b92f0d8`

Fixed several bugs that were silently wrong, and expanded the telemetry data available to all overlays.

**Bug fixes:**
- Steering was being negated twice (once in `iracing.js`, once in `InputsOverlay.jsx`). Removed the second negation -- the wheel indicator and L/R label now reflect actual direction.
- `tyreCompound` was hardcoded to `'M'` for all cars. Now reads the real `PlayerTireCompound` SDK variable (raw integer).
- Active overlays were not persisted. Every restart reset all overlays to off. Fixed by writing to `app.activeOverlays` in electron-store and restoring on startup.

**Telemetry additions (per-driver fields, now in every `relative[]` and `standings[]` entry):**

| Field | Source |
|-------|--------|
| `currentLap` | `CarIdxLap` |
| `lapsCompleted` | `CarIdxLapCompleted` |
| `classPosition` | `CarIdxClassPosition` |
| `trackSurface` | `CarIdxTrackSurface` (5=on track, 2=pit lane, 3=pit stall) |
| `tyreCompoundRaw` | `CarIdxTireCompound` (raw int per car) |
| `pitStopCount` | `CarIdxPitStopCount` |
| `fastRepairsUsed` | `CarIdxFastRepairsUsed` |
| `estimatedLapTime` | `CarIdxEstTime` |
| `incidentCount` | YAML `CurDriverIncidentCount` |
| `teamName` | YAML `TeamName` |
| `qualifyPosition` | YAML `QualifyResultsInfo` |
| `gapToLeader` | Computed: seconds behind race leader |
| `intervalToNext` | Computed: gap to car directly ahead |
| `positionsGained` | Computed: qualify pos minus current pos |

**IPC infrastructure added:**
- `get-overlay-settings` / `save-overlay-settings` / `overlay-settings-changed` -- foundation for the column engine in v0.7.
- `pitSpeedLimit` now parsed from YAML `TrackPitSpeedLimit` and used dynamically in `PitboxHelperOverlay`.

---

### v0.7 -- Configurable Column Engine
**Commit**: `a0c5903`

The largest single feature. Standings and Relative overlays went from hard-coded column layouts to a fully user-configurable column system.

**New files:**
- `src/renderer/lib/columnDefs.js` -- single source of truth for all 22 driver-row column definitions. Each column has a `label`, fixed `width` (or `null` for flex), and a `renderCell(driver, data)` function.
- `src/renderer/components/ui/DriverRow.jsx` -- renders one driver row from an ordered array of column IDs.
- `src/renderer/components/ui/ColumnPicker.jsx` -- settings panel for column selection, reordering (up/down), removal, and row count. Shown inside the Control Panel (not inside the overlay window). Auto-saves on every change.

**Modified overlays:**
- `StandingsOverlay` and `RelativeOverlay` fully rewritten to use `DriverRow`.
- `DragHandle` gained an optional settings gear icon that opens the column picker for that overlay.

**Column picker features:**
- Add columns from grouped library (Identity, Gaps, Lap Times, Pit/Strategy, Progress, Status, Team).
- Reorder with up/down arrows.
- Remove individual columns.
- Row count selector [5][8][10][15][20] for Standings.
- Settings persist across restarts via `overlay.<id>.content` in electron-store.
- Live-updates: the overlay updates immediately when settings change (no restart needed).

---

### v0.8 -- Session Presets with Auto-Apply
**Commit**: `4de4a11`

Three named presets (Practice, Qualify, Race) that capture which overlays are visible and what column configuration each overlay uses. Can be applied manually or automatically when iRacing changes session type.

**How it works:**
- **SAVE**: Reads current active overlays and column settings for all configurable overlays into `app.presets.<key>` in the store.
- **LOAD**: Hides/shows overlay windows and pushes new column settings to each overlay. Overlays update live via the existing `overlay-settings-changed` event.
- **AUTO**: When `app.autoPreset` is enabled, `broadcastTelemetry()` in `main.js` detects session type changes and auto-applies the matching preset before the next frame broadcasts.

**Session type mapping:**
- `practice` preset: Practice, Offline Testing
- `qualify` preset: Qualify, Lone Qualify
- `race` preset: Race (and fallback)

**UI in Control Panel:**
- 3-card grid with SAVE and LOAD buttons per preset.
- Small green dot indicator when a preset has been saved.
- Current session type highlights the matching preset card in green.
- AUTO toggle persisted in store.

---

### v0.9 -- Proximity Improvements + Bug Sweep + Incident Overlay
**Commit**: `b168eb8`

**Proximity overlays made meaningfully more accurate:**

- **BlindSpot**: Replaced the meaningless `carIdx % 2` left/right hack with `lapDistPct` delta direction. Cars on pit road (`trackSurface !== 5`) are excluded. Threshold tightened to 1.2%. Shows car number in the indicator. Labels changed from L/R to FWD/RR (since true lateral position is unavailable from the live SDK).
- **Radar**: `trackSurface !== 5` filter added. CLOSE_PCT tightened from 5% to 4%, DANGER_PCT from 1.5% to 1.2%.
- **OvertakeAlert**: Class filtering added -- different-class cars alert at 6% threshold, same-class at 3%. 30-frame smoothed closing rate shown in seconds/second with a progress bar. Purple accent for multi-class alerts. Pitting cars excluded.

**Column engine expanded:**
- `LeaderboardOverlay` migrated to use `DriverRow` with a gear icon for column settings.
- Default columns: position, colorDot, driverName, pitStatus, bestLapTime.

**New overlay:**
- `IncidentOverlay`: Shows all drivers sorted by incident count descending. Detects freshly incremented counts and shows a NEW badge. Color coded: white (0-7), amber (8-16), red (17+). Total incident count displayed in the DragHandle.

**Strategy overlays improved:**
- `RaceScheduleOverlay`: Added 1/2/3 stop selector. Pit windows calculated as stints of equal length, each window spanning ±8% of the stint length. All windows shown as mini chips when stops > 1.
- `PitboxHelperOverlay`: Was already using dynamic pit speed limit from v0.6.

---

### v0.10 -- Network Streaming + VR Mode
**Commit**: `0cedcb1`

**Network streaming (dual-PC / phone / OBS browser source):**

- New `src/main/httpServer.js` -- HTTP + WebSocket server using the `ws` npm package. Gracefully degrades if `ws` is not installed.
- In production, serves the renderer bundle (`dist/renderer/index.html`) with `window.__ARI_WS__` injected so remote browsers auto-connect to the WebSocket without manual configuration.
- In dev mode, serves an info page with the Vite dev server URL.
- `/status` endpoint returns JSON `{ clients, version, active }`.
- `broadcastTelemetry()` in `main.js` now calls `httpServer.broadcast(data)` on every telemetry frame.
- Server auto-restores on startup if `app.networkServer.enabled` is set in the store.

**`useTelemetry` hook -- three data paths:**
1. Electron IPC (`window.ari.onTelemetry`) -- local Electron app, unchanged.
2. WebSocket (`window.__ARI_WS__` or `?ws=` query param) -- remote browser connecting to ARI server. Auto-reconnects on disconnect (2s delay).
3. Demo -- pure browser with no connection, existing behaviour.

**VR Mode:**
- Global toggle stored in `app.vrMode`. When enabled, all overlay windows use `alwaysOnTop: 'normal'` instead of `'screen-saver'`, making them visible to OVR Toolkit, SteamVR overlays, and OBS Window Capture.
- `createOverlayWindow` reads the store value on startup so windows are created with the correct level.

**Control Panel additions:**
- Network card: start/stop toggle, URL display with COPY button, live client count.
- VR card: toggle, label shows "OVR capture" or "Screen overlay".
- `ws` added to `package.json` dependencies (run `npm install` to activate).

---

### v1.0 -- Style Variants + Polish
**Commit**: `25ea142`

**Three row-style variants for Standings, Relative, and Leaderboard:**

| Variant | Padding | Gap | Row borders | Left accent |
|---------|---------|-----|-------------|-------------|
| Default | 4px 10px | 6px | Yes | Player only (red) |
| Compact | 2px 8px | 4px | Yes | Player only (red) |
| Broadcast | 7px 12px | 8px | No | All drivers (their colour) |

- `Compact` fits approximately 30% more rows in the same overlay height.
- `Broadcast` gives a TV timing tower feel: each driver's colour shows as a left accent bar, rows are taller, and there are no row separators.
- Variant is selected in the Column Picker settings panel (same gear icon flow as column selection) and persists in overlay settings.
- Reset button in the picker restores Default variant and default columns simultaneously.

**FlatMap sector markers:**
- Approximate sector boundaries at 33% and 67% of the oval with perpendicular tick marks and S2/S3 labels. Since iRacing's live SDK does not expose real sector positions, these are evenly spaced approximations.

**Fullscreen mode hint:**
- Subtle info row above the Control Panel footer: "Overlays require iRacing borderless windowed mode" with a small info icon. This is a permanent, unobtrusive reminder rather than a one-time wizard.

---

## Files Changed Across All Phases

### New files
| File | Purpose |
|------|---------|
| `src/renderer/lib/columnDefs.js` | 22 column definitions; single source of truth |
| `src/renderer/lib/overlayVariants.js` | 3 row style token presets |
| `src/renderer/components/ui/DriverRow.jsx` | Generic driver row component |
| `src/renderer/components/ui/ColumnPicker.jsx` | Column + style settings panel |
| `src/renderer/components/overlays/LeaderboardOverlay.jsx` | Rewritten with column engine |
| `src/renderer/components/overlays/IncidentOverlay.jsx` | New incident count overlay |
| `src/main/httpServer.js` | HTTP + WebSocket telemetry server |

### Significantly modified files
| File | Changes |
|------|---------|
| `src/main/iracing.js` | 9 new per-driver telemetry fields; YAML parsing for incidents, team names, qualify positions; `gapToLeader`, `intervalToNext`, `positionsGained` computed; `pitSpeedLimit` from YAML |
| `src/main/main.js` | 15+ new IPC handlers across all phases; preset system; session type detection; HTTP server integration; VR mode |
| `src/main/preload.js` | Exposes all new IPC methods to renderer |
| `src/renderer/hooks/useTelemetry.js` | WebSocket data path; `getWsUrl()` helper |
| `src/renderer/components/ControlPanel.jsx` | Preset UI; Network + VR cards; fullscreen hint |
| `src/renderer/components/overlays/StandingsOverlay.jsx` | Full column engine + variant |
| `src/renderer/components/overlays/RelativeOverlay.jsx` | Full column engine + variant |
| `src/renderer/components/overlays/BlindSpotOverlay.jsx` | trackSurface filter; lapDistPct direction split |
| `src/renderer/components/overlays/RadarOverlay.jsx` | trackSurface filter; tighter thresholds |
| `src/renderer/components/overlays/OvertakeAlertOverlay.jsx` | Class filtering; smoothed closing rate |
| `src/renderer/components/overlays/RaceScheduleOverlay.jsx` | Multi-stop selector; dynamic windows |
| `src/renderer/components/overlays/FlatMapOverlay.jsx` | Sector markers |
| `src/renderer/components/ui/DragHandle.jsx` | Optional settings gear icon |

---

## Architecture Notes

**Telemetry pipeline**: `ari_bridge.exe` (C#) reads iRacing's memory-mapped file and pipes binary to Node.js. `iracing.js` parses to JavaScript objects and calls `broadcastTelemetry()` in `main.js`. Main process sends to all renderer windows via `webContents.send('telemetry-update', data)` and to remote clients via `httpServer.broadcast(data)`.

**Settings persistence**: `electron-store` under `overlay.<id>.content = { columns, rowCount, variant }`. IPC push (`overlay-settings-changed` event) keeps overlays in sync when settings change.

**Preset system**: `app.presets.{practice,qualify,race}` in store. Applied by `applyPreset()` in `main.js` which hides/shows windows and pushes settings to each overlay via IPC. Session type detection is in `broadcastTelemetry()` to avoid modifying the C# bridge.

**Window model**: One OS `BrowserWindow` per overlay, always-on-top, transparent, focusable=false. VR mode switches `alwaysOnTop` level from `screen-saver` to `normal` for OVR Toolkit capture.

---

## Known Limitations

- `CarIdxTireCompound` returns a raw integer. The mapping from integer to compound name (Hard/Medium/Soft/Wet) is car-class-specific and undocumented. Displayed as raw number until an empirical mapping is built.
- BlindSpot FWD/RR split is based on `lapDistPct` delta direction, not true lateral position. iRacing's live SDK does not expose world X/Z coordinates for other cars.
- FlatMap sector markers are evenly spaced approximations (33%/67%). Real sector boundaries are not available from the live SDK.
- Network streaming port is fixed at 7001. No UI for port configuration yet.
- Overlays require iRacing running in borderless windowed mode. Exclusive fullscreen is not supported.
