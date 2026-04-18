# ARI Codebase Audit

> Phase 1 of the competitive uplift project. Read-only. No code was modified.

---

## 1. Overlay Inventory

ARI currently ships 29 overlay windows, organized into 8 groups in the control panel. Six were present at the start of the uplift project; 23 have been added since. The table below covers all of them, with extra depth on the original six.

### 1.1 Relative (`src/renderer/components/overlays/RelativeOverlay.jsx`)

**What it renders**

- Position number, car-colour dot, license badge (colored by class), driver name, iRating (abbreviated to `1k` form), gap time (ahead = teal, behind = amber), PIT badge when on pit road.
- Shows 5 drivers centered on the player: 2 ahead, player, 2 behind. Slice is re-computed every render from `data.relative` sorted by `gapSeconds`.

**Telemetry fields consumed**

`data.relative[]`: `carIdx`, `position`, `driverName`, `iRating`, `licenseString`, `gapSeconds`, `onPitRoad`, `isPlayer`, `colour`

**Hardcoded vs configurable**

Everything is hardcoded: row count (5), column set, column order, colors, font sizes, width (290px). No user-accessible settings. No per-session preset. The `DRIVER_COLOURS` array is defined locally and also in `iracing.js`; they are independent copies.

**Styling / positioning**

Inline React styles throughout. Width is a magic constant inside the JSX (`style={{ width: 290 }}`). Position and scale are managed externally by the window system.

**Settings persistence**

Position and scale only, via `electron-store` key `overlay.relative`. No content settings are persisted.

---

### 1.2 Standings (`src/renderer/components/overlays/StandingsOverlay.jsx`)

**What it renders**

- Position, car-colour dot, driver name, PIT badge, gap to leader. Top 10 only. Header shows current lap / total laps. No iRating, no license, no last lap, no best lap.

**Telemetry fields consumed**

`data.standings[]`: `carIdx`, `position`, `driverName`, `gapSeconds`, `onPitRoad`, `isPlayer`, `colour`
`data.currentLap`, `data.totalLaps`

**Hardcoded vs configurable**

Row cap (10) is hardcoded. Column set is fixed. Width 300px is a magic constant.

**Settings persistence**

Position and scale only.

---

### 1.3 Fuel (`src/renderer/components/overlays/FuelOverlay.jsx`)

**What it renders**

- Four stat tiles in a 2x2 grid: IN TANK (L), PER LAP (L), LAPS LEFT, TO FINISH.
- A fuel-to-finish progress bar (green/amber/red thresholds at 30% / 15%).
- Status label: "+X.XL to finish" or "On target".
- Only renders when `connected` is true (shows placeholder otherwise). This is the only overlay with this guard; others show demo data while disconnected.

**Telemetry fields consumed**

`data.fuel.level`, `data.fuel.perLap`, `data.fuel.lapsRemaining`, `data.fuel.lapsToFinish`, `data.fuel.needed`

**Hardcoded vs configurable**

All thresholds, labels, and units are hardcoded. No pit add suggestion (only shows shortfall, not how many laps to add).

**Settings persistence**

Position and scale only.

---

### 1.4 Track Map (`src/renderer/components/overlays/TrackMapOverlay.jsx`)

**What it renders**

- Canvas-based 202x202px track outline drawn from normalized GPS points.
- All cars from `data.relative` positioned by `lapDistPct` via linear interpolation along the stored point array.
- Player: red dot with ring. Others: colored dots with black outline. Pit road cars get a yellow ring.
- S/F line marker (white dot at index 0).
- Legend: "You" / "Others".
- Fallback text when no map is available.

**Track data source**

Loads from `electron-store` key `trackmap.<trackId>` (populated by `trackmap-builder.js` scanning `.ibt` files). Falls back to `localStorage`. The `track-database.js` file bundles known track GPS data loaded at startup via `scanIbtFiles`.

**Telemetry fields consumed**

`data.trackId`, `data.trackName`, `data.relative[].lapDistPct`, `data.relative[].isPlayer`, `data.relative[].onPitRoad`, `data.relative[].colour`, `data.relative[].carIdx`

**Known limitations**

- Live SDK does not expose X/Z coordinates for other cars; they are positioned by lap percentage only, meaning two cars at the same percentage appear at the same point.
- Track data must be pre-built from `.ibt` files or the bundled database; there is no live generation path.

**Hardcoded vs configurable**

Canvas size (202x202), padding (10px), dot sizes, track line widths are all hardcoded.

---

### 1.5 Inputs (`src/renderer/components/overlays/InputsOverlay.jsx`)

**What it renders**

- A scrolling canvas trace for throttle (green), brake (red), clutch (blue) over 300 samples (approximately 5 seconds at 60fps).
- Three vertical pedal bars (T, B, C) showing current values.
- Gear number (large amber) + speed in km/h.
- SVG steering wheel that rotates; shows direction (L/R) and angle in degrees.

**Telemetry fields consumed**

`data.throttle`, `data.brake`, `data.clutch`, `data.steering`, `data.gear`, `data.speed`

**Known data rules**

`data.brake` is already inverted in `iracing.js` (1 - raw value). The overlay uses it directly. `data.steering` is negated in `iracing.js`; the overlay additionally negates it again (see line 158: `const steering = -(data?.steering ?? 0)`). This is a double-negation: the iracing.js steering is already negated, then negated again here, so the visual direction should be verified.

**Hardcoded vs configurable**

History buffer (300), canvas height (62px), color constants, max steering angle (450 degrees), width (480px) are all hardcoded.

---

### 1.6 Tyres (`src/renderer/components/overlays/TyreOverlay.jsx`)

**What it renders**

- 2x2 grid of four tyre corners (FL, FR, RL, RR).
- Per corner: 3-zone temperature strip (L/M/R) with color mapping cold-to-hot, average temp reading, wear bar + percentage, pressure in PSI.
- Cold/optimal/hot color legend.
- Falls back to hardcoded DEMO data when `data.tyres` is null (runs in all sessions including when disconnected).

**Telemetry fields consumed**

`data.tyres.{LF,RF,LR,RR}.{tempL,tempM,tempR,wearL,wearM,wearR,pressure}`

**Hardcoded vs configurable**

Temperature thresholds (40/65/80/95/110/130 deg C), wear thresholds (0.7/0.4), PSI conversion factor, zone-zone ordering (flip for right-side tyres) are all hardcoded. Width 250px is a constant. No compound display (field exists in bridge but not rendered here).

---

### 1.7 Remaining Overlays (summary)

| ID | Label | Key fields used | Notes |
|----|-------|----------------|-------|
| `radar` | Radar | `relative[].lapDistPct`, `relative[].carIdx` | Canvas-based; approximates lateral offset from carIdx hash since X/Z are not available for other cars |
| `blindspot` | Blind Spot | `relative[].lapDistPct`, `relative[].carIdx` | Left/right split uses `carIdx % 2`, not real lateral data |
| `flags` | Flags | `data.sessionFlags` | Decodes iRacing bitmask to flag name and color |
| `delta` | Delta | `data.delta` | Bar centered on zero, vs best session lap (`LapDeltaToBestSessionLap`) |
| `headtohead` | Head to Head | `relative[]`, `standings[]` | Side-by-side stat compare vs closest-ahead car or pinned driver; `pinnedIdx` is local React state, not persisted |
| `lapgraph` | Lap Graph | `data.lastLapTime` | Rolling chart of lap times |
| `laplog` | Lap Log | `data.lastLapTime`, `data.currentLap` | Table of completed laps |
| `sessiontimer` | Session Timer | `data.sessionTimeRemain`, `data.lapsRemain` | Toggles time/lap display |
| `overtakealert` | Overtake Alert | `relative[]`, `data.sessionType` | Alerts when a faster-class car closes; uses carClassId diff |
| `boostbox` | Boost / ERS | `data.ersRemaining`, `data.ersDeployPct` | Shows "No ERS on this car" when null |
| `weather` | Weather | `data.trackTemp`, `data.airTemp`, `data.windSpeed`, `data.windDir` | |
| `raceschedule` | Pit Window | `data.currentLap`, `data.lapsRemain`, `data.fuel` | Calculates earliest/latest safe pit lap |
| `pitboxhelper` | Pitbox Helper | `data.speed`, `data.onPitRoad` | Speed vs 60 km/h hardcoded limit; actual limit not exposed by SDK |
| `hstandings` | H. Standings | `data.standings[]` | Top 20 in horizontal strip; truncates name to surname |
| `leaderboard` | Leaderboard | `data.standings[]` | Broadcast-style top 15; alternating row shading |
| `trackmap` | Track Map | (see 1.4) | |
| `flatmap` | Flat Map | `data.relative[].lapDistPct` | Schematic circular representation, no GPS required |
| `minimap` | Minimap | `data.relative[].lapDistPct`, track store | Compact version of track map canvas |
| `laptimespread` | Lap Spread | `data.standings[].lastLapTime` | Distribution chart across field |
| `advancedpanel` | Advanced Panel | 18 selectable stat blocks | Only overlay with working in-overlay config (toggle per stat block); state is local React `useState`, not persisted across restarts |
| `datablocks` | Data Blocks | Subset of advancedpanel fields | Individual free-floating stat widgets |
| `heartrate` | Heart Rate | Demo only | Generates simulated BPM; no hardware integration |
| `gforce` | G-Force | `data.latAccel`, `data.lonAccel` | G-circle canvas plot in units of G |
| `digiflag` | Digiflag | `data.sessionFlags` | Large broadcast-style flag; same flag logic as `flags` overlay |

---

## 2. C# iRacing SDK Bridge

### 2.1 Architecture

The bridge (`src/main/iracing.js`) is a two-layer system:

1. **C# subprocess (`ari_bridge.exe`)**: Compiled on first run from an inline source string using `csc.exe` (Windows .NET Framework 4.0). Opens iRacing's memory-mapped file (`IRSDKMemMapFileName`), reads the entire 1.2 MB buffer at 60 fps, prepends a 4-byte length, and writes frames to stdout.

2. **Node.js parser**: Reads the binary frames from the subprocess's stdout, parses the MMF header to build a variable map (name, type, offset), extracts the freshest data buffer (highest tick number among up to 4 rotating buffers), reads the session YAML when the version counter changes, and calls `buildTelemetry()` to produce the JavaScript telemetry object.

### 2.2 Fields Currently Exposed to the Renderer

The `buildTelemetry()` function in `iracing.js` produces the following structure sent to all windows via `webContents.send('telemetry-update', data)`:

**Scalar player fields**
| JS field | iRacing variable | Notes |
|----------|-----------------|-------|
| `speed` | `Speed` | m/s converted to km/h, rounded |
| `gear` | `Gear` | -1=R, 0=N, 1-6=gears |
| `rpm` | `RPM` | rounded integer |
| `throttle` | `Throttle` | 0-1, no transformation |
| `brake` | `Brake` | inverted: `1 - Brake` |
| `clutch` | `Clutch` | 0-1, raw pass-through |
| `steering` | `SteeringWheelAngle` | negated, normalized to +/-1 at 135 deg |
| `delta` | `LapDeltaToBestSessionLap` | seconds |
| `currentLap` | `Lap` | |
| `totalLaps` | `SessionLapsTotal` | |
| `lapsRemain` | computed | `max(0, totalLaps - currentLap)` |
| `lastLapTime` | `LapLastLapTime` | player only |
| `bestLapTime` | `LapBestLapTime` | player only |
| `sessionNum` | `SessionNum` | |
| `sessionType` | YAML sessions array | string e.g. "Race", "Practice" |
| `sessionFlags` | `SessionFlags` | bitmask |
| `sessionTimeRemain` | `SessionTimeRemain` | seconds, -1 if unavailable |
| `onPitRoad` | `OnPitRoad` | boolean |
| `isInGarage` | `IsInGarage` | boolean |
| `playerX` | `X` | world position, metres |
| `playerZ` | `Z` | world position, metres |
| `playerLapDistPct` | `CarIdxLapDistPct[playerCarIdx]` | |
| `trackTemp` | `TrackTemp` | degrees C |
| `airTemp` | `AirTemp` | degrees C |
| `windSpeed` | `WindVel` | m/s |
| `windDir` | `WindDir` | radians |
| `skies` | (hardcoded `''`) | iRacing exposes `Skies` as int enum; not mapped |
| `ersRemaining` | `EnergyERSBatteryPct` | null if variable absent |
| `ersDeployPct` | `EnergyMGU_KLapDeployPct` | null if variable absent |
| `latAccel` | `LatAccel` | divided by 9.81 to convert to G |
| `lonAccel` | `LonAccel` | divided by 9.81 |
| `tyreCompound` | `PlayerTireCompound` | hardcoded to string `'M'` -- raw int not decoded |

**Fuel sub-object** (`data.fuel`)

Computed from `FuelLevel`, `FuelUsePerHour`, `SessionLapsTotal`, `Lap`, and estimated lap time (`CarIdxEstTime[playerCarIdx]`).

**Tyres sub-object** (`data.tyres.{LF,RF,LR,RR}`)

Each corner: `tempL/M/R` (deg C), `wearL/M/R` (0-1), `pressure` (Pa).
Variables: `LFtempL/M/R`, `RFtempL/M/R`, etc.; `LFwearL/M/R`, etc.; `LFpressure`, etc.

**Per-car arrays** (64 entries each, pre-filtered into `relative` and `standings`)

Each entry in `relative` / `standings` contains:
`carIdx`, `position`, `driverName`, `carNumber`, `iRating`, `licenseString`, `carClassId`, `carClass`, `gapSeconds`, `onPitRoad`, `isPlayer`, `colour`, `bestLapTime`, `lastLapTime`, `lapDistPct`, `isFastestLap`

The `isFastestLap` boolean is computed in Node; the driver with the overall best lap gets it set to true.

**Session metadata** (from YAML)

`trackName`, `trackId`, `playerCarIdx`

### 2.3 Fields Available in the iRacing SDK but NOT Yet Exposed

The following variables exist in the iRacing SDK memory map and could be extracted with no bridge changes (only `iracing.js` changes):

**Per-car arrays (available, not read)**

| Variable | Meaning |
|----------|---------|
| `CarIdxLap` | Current lap number per car |
| `CarIdxLapCompleted` | Completed laps per car |
| `CarIdxClassPosition` | Position within class |
| `CarIdxClass` | Car class bitmask |
| `CarIdxTrackSurface` | Track surface state (0=not in world, 1=off-track, 2=pit lane, 3=pit stall, 4=approaching pit, 5=on-track) |
| `CarIdxTrackSurfaceMaterial` | Surface material |
| `CarIdxSteer` | Steering angle per car |
| `CarIdxRPM` | RPM per car |
| `CarIdxGear` | Gear per car |
| `CarIdxTireCompound` | Tyre compound per car (int) |
| `CarIdxPitStopCount` | Number of pit stops taken per car |
| `CarIdxFastRepairsUsed` | Fast repairs used per car |
| `CarIdxSessionFlags` | Per-car flag state |
| `CarIdxPaceFlags` | Pace flags per car |
| `CarIdxPaceLine` | Pace line assignment |
| `CarIdxPaceRow` | Pace row assignment |
| `CarIdxP2P_Status` | Push-to-pass status per car |
| `CarIdxP2P_Count` | Push-to-pass activations per car |

**Player-only scalar (available, not read)**

| Variable | Meaning |
|----------|---------|
| `LapCurrentLapTime` | Running lap time (current lap in progress) |
| `LapDeltaToOptimalLap` | Delta to theoretical best |
| `LapDeltaToSessionOptimalLap` | Delta to session optimal |
| `LapDistPct` | Redundant with `CarIdxLapDistPct[playerCarIdx]` but cleaner |
| `LapDist` | Distance in meters around track |
| `FuelLevelPct` | Fuel level as 0-1 percentage |
| `PlayerCarInPitStall` | Boolean |
| `PlayerCarPitSvStatus` | Pit service status flags |
| `PlayerCarWeightPenalty` | Weight penalty applied |
| `PlayerCarPowerAdjust` | Power adjustment (BOP) |
| `PlayerCarDryTireSetLimit` | Tyre set limit |
| `PitSvFlags` | Requested pit service flags |
| `PitSvLFP` / `RFP` / `LRP` / `RRP` | Requested tyre pressures |
| `PitSvFuel` | Requested fuel to add |
| `dcBrakeBias` | Brake bias (driver adjustment) |
| `dcABS` | ABS level |
| `dcTractionControl` | TC level |
| `BrakeABSactive` | ABS currently firing |
| `SteeringWheelTorque` | Force feedback torque |
| `SteeringWheelMaxTurn` | Max turn in radians (useful for normalization) |
| `VelocityX` / `VelocityY` / `VelocityZ` | Car velocity vector |
| `Yaw` / `Pitch` / `Roll` | Car orientation |
| `YawRate` | Rate of yaw change |
| `OilTemp` / `OilPress` | Engine oil |
| `WaterTemp` / `WaterLevel` | Engine water |
| `FuelPress` | Fuel pressure |
| `ManifoldPress` | Manifold pressure |
| `ShiftIndicatorPct` | Shift light indicator (0-1) |
| `ShiftPowerPct` | Power percentage available for upshift |
| `ShiftGrindRPM` | RPM for grind-free upshift |
| `EngineLimitActive` | Engine limiter active |
| `LapLastNLapSeq` / `LapLastNLapTime` | N-lap average |
| `RadioTransmitCarIdx` | Car currently transmitting on radio |
| `PushToTalk` | PTT button state |
| `PitstopActive` | Pitstop service in progress |
| `CamCarIdx` | Camera target car index |
| `CamCameraNumber` / `CamGroupNumber` | Current camera |
| `IsReplayPlaying` | Replay active |
| `ReplayFrameNum` / `ReplayFrameNumEnd` | |
| `WeatherDeclaredWet` | Track declared wet |
| `TrackTempCrew` | Track temp at crew station |

**Session YAML (partially parsed, more available)**

The YAML parser currently extracts: TrackDisplayName, TrackID, DriverUserName, session types, per-driver (UserName, CarNumber, IRating, LicString, CarClassID, CarClassShortName, IsSpectator, CarIdx).

Not yet extracted from YAML:
- `CarClassColor` (class color hex)
- `CarClassEstLapTime` (class estimated lap time for gap-to-leader in multiclass)
- `CarClassMaxFuelPct` (maximum fuel load)
- `CarClassRelSpeed` (relative speed indicator)
- `TeamName` / `TeamID`
- `CurDriverIncidentCount` / `TeamIncidentCount`
- `CarIsPaceCar` / `AiEnabled`
- `WeekendOptions` (race length type, fog level, etc.)
- `TelemetryOptions` (telemetry enabled flag)
- `QualifyResultsInfo` (qualifying times for race starts)

### 2.4 IPC Shape Between Bridge and Renderer

**Main -> Renderer** (via `webContents.send`)

```
channel: 'telemetry-update'
payload: {
  connected: boolean,   // true = iRacing MMF is open and status=1
  demo: boolean,        // true = using built-in demo data
  telemetry: { ... }    // the full telemetry object (see 2.2)
}
```

Broadcast rate: 60 fps when iRacing is running, 60 fps demo loop when not connected.

**Renderer -> Main** (via `window.ari.*` which calls `ipcRenderer.invoke`)

See `preload.js`. All handlers are synchronous request/response (no push from renderer to main except implicitly via IPC invoke). The full list of channels exposed:

- `window-minimize/maximize/close` -- control window chrome
- `show-overlay / hide-overlay` -- visibility toggle
- `set-passthrough` -- per-overlay mouse passthrough
- `overlay-drag-move` / `overlay-drag-end` -- drag positioning
- `get-overlay-scale` / `overlay-scale` (event) -- scale read/update
- `open-layout-editor` / `close-layout-editor` / `get-layout-state` / `save-layout-state`
- `reset-overlay-positions`
- `trackmap-save` / `trackmap-load`
- `telemetry-update` (event, renderer subscribes via `onTelemetry`)

There is no IPC channel for per-overlay settings (colors, column selection, session presets, etc.). All such state would need new channels.

---

## 3. Settings and Configuration System

### 3.1 Current state

**Persistence library**: `electron-store` v8.1. Single store instance, file `ari-layout.json` (via `name: 'ari-layout'`).

**What is persisted today**

| Key pattern | Type | Content |
|-------------|------|---------|
| `overlay.<id>.x` | number | Window x position (screen pixels) |
| `overlay.<id>.y` | number | Window y position |
| `overlay.<id>.scale` | number | Scale factor (0.4-3.0) |
| `overlay.<id>.inLayout` | boolean | Whether overlay appears in Layout Editor canvas |
| `trackmap.<trackId>` | array | Normalized [x,y] point array for a track |

Nothing else is persisted. Every other piece of user state (which overlays are currently visible, the `advancedpanel` block selection, `headtohead` pinned driver) is ephemeral local React state that resets every app restart.

### 3.2 What is NOT persisted but should be

- Which overlays are toggled on at startup (active overlays reset to "all off" on every launch).
- Per-overlay content configuration (e.g., which stat blocks are visible in AdvancedPanel).
- Per-overlay style preferences (if/when themes are added).
- Session-type presets (practice/qualify/race) for overlay visibility and column selection.
- Any future column/field selection for Standings and Relative.

### 3.3 Config scope model

The current model is effectively a single flat namespace: `overlay.<id>.*` and `trackmap.*`. There is no concept of:

- **Global settings** (app-level preferences, theme, units)
- **Per-overlay content settings** (beyond position/scale)
- **Named presets** (layout A vs layout B)
- **Session-scoped settings** (auto-switch on session type change)

### 3.4 Feasibility of per-session presets without a rewrite

Feasible as an additive change. The telemetry object already includes `sessionType` (a string like "Race", "Practice", "Qualify", "Lone Qualify", "Offline Testing"). The store model would grow to:

```
overlay.<id>.sessions.<sessionType>.columns   -- column selection
overlay.<id>.sessions.<sessionType>.visible   -- whether to show
overlay.<id>.sessions.<sessionType>.scale     -- optional override
overlay.<id>.positions.<sessionType>.x/y      -- optional positional override
```

The main process already receives telemetry and could broadcast a `session-type-change` event whenever `sessionNum` or `sessionType` changes. The renderer would react by re-reading config. No architectural rewrite is needed; it is a new store schema layer and a new IPC event.

---

## 4. Windowing

### 4.1 Current model

**Control panel**: One `BrowserWindow`, 420x680px, framed, non-transparent, `backgroundColor: '#0e0e10'`. Always present; closing it quits the app.

**Layout editor**: One `BrowserWindow`, 1400x860px, frameless, non-transparent, `backgroundColor: '#0a0a0c'`. Created on demand, destroyed when closed or when Save/Cancel is clicked. Loads at hash `/#/layout-editor`.

**Overlays**: Each overlay is a separate `BrowserWindow` with these properties:
- `frame: false` -- no OS window decoration
- `transparent: true` -- the window background is transparent (requires compositor support)
- `alwaysOnTop: true` -- set at creation, then reinforced to `'screen-saver'` level on `ready-to-show`
- `skipTaskbar: true` -- not shown in Windows taskbar
- `resizable: false` -- size is controlled by scale factor only
- `focusable: false` -- window cannot receive keyboard focus
- `hasShadow: false`
- `setIgnoreMouseEvents(true, { forward: true })` -- all mouse events pass through to the window underneath; mouse events are only re-enabled while the cursor is over a `DragHandle` (tracked via document-level `mousemove` listener in the renderer)

Each overlay loads its own route: `/#/overlay/<id>`. The React app renders only the matching component via hash routing. This means each overlay window has a full React + Vite runtime instance.

### 4.2 Scaling

Overlay windows are created at `naturalWidth * scale` x `naturalHeight * scale` pixels. The overlay's React component renders at natural size and uses `ResizeHandles` (which calls `useOverlayScale`) to apply a CSS `scale()` transform. Body has `overflow: hidden` so the content is clipped to window bounds. The scale factor is the only link between OS window size and rendered content size.

Scaling is a uniform factor (one number, not independent width/height). Changing scale resizes the OS window and updates the CSS transform simultaneously.

### 4.3 Does it work in iRacing fullscreen?

**With iRacing in borderless-windowed or windowed mode**: Yes, this works. Electron's `alwaysOnTop: 'screen-saver'` level is sufficient to render above the game window.

**With iRacing in exclusive fullscreen (DirectX exclusive mode)**: Typically no. Exclusive fullscreen applications own the display output at the OS level; other windows cannot render on top. iRacing's default is borderless-windowed on Windows 10/11, which means ARI overlays work with default settings. However, if a user switches iRacing to exclusive fullscreen (via iRacing graphics options: "Full Screen" toggle), overlays will not appear.

**Why this is not a crisis**: Most iRacing users on Windows 10/11 run borderless-windowed ("windowed fullscreen") by default, and iRacing recommends it. The Kapps documentation for "Open in iRacing" addressed DX hook injection or overlay-level rendering specifically for the minority who run exclusive fullscreen. This requires either:
1. A DirectX overlay (hooking Present, similar to RTSS/MSI Afterburner) -- complex, requires a native DLL, flagged as suspicious by antivirus.
2. Windows Magnification API -- can capture and re-render the desktop.
3. Doing nothing and documenting the limitation (borderless-windowed is the majority case).

**VR users**: The current approach does not work for VR headsets. VR rendering bypasses the Windows desktop compositor entirely. Supporting VR overlays requires SteamVR overlay API integration or OVR Toolkit, which is a separate product.

### 4.4 One window per overlay vs. all-in-one

The current model is **one OS window per overlay**. There is no shared rendering host. Each window runs an independent Electron renderer process, which means:

- Approximately 60-100 MB of RAM per window (Chrome renderer overhead), multiplied by the number of active overlays.
- Telemetry is broadcast to all windows simultaneously via `webContents.send`, duplicating the serialization for every active window.
- The approach has the advantage that each overlay can be independently shown, hidden, positioned, and in principle moved to a different monitor without affecting others.

### 4.5 Click-through mechanism

Mouse passthrough is controlled per-window by `setIgnoreMouseEvents(true, { forward: true })`. The `{ forward: true }` flag means mouse events are forwarded to the window behind ARI while still allowing ARI's renderer to receive `mousemove` events. This is how the `DragHandle` hover detection works: the renderer listens for global `mousemove`, checks whether the cursor is over the drag handle element, and toggles passthrough off when it is (so the user can click the handle to drag) and on when it is not.

This mechanism has a known edge case: if the renderer crashes or freezes while passthrough is disabled, the overlay becomes an opaque click-blocker. The `dragEnd` IPC re-enables passthrough at the end of each drag.

### 4.6 `alwaysOnTop` level

The `'screen-saver'` level used in `once('ready-to-show')` is the highest available on Windows via Electron. On Windows this maps to `HWND_TOPMOST` with a high z-order class. It renders above most application windows but below the Windows lock screen and UAC dialogs. This level is sufficient for iRacing borderless-windowed.

---

## 5. Summary of Key Gaps and Risks

| Area | Gap | Severity |
|------|-----|----------|
| Columns | Standings and Relative have zero user-configurable columns | Critical |
| Column engine | No shared column definition; each overlay hard-codes its layout | Critical |
| Session presets | No concept of practice/qualify/race preset switching | High |
| Settings persistence | Active overlays, column selections, feature state reset on restart | High |
| Proximity / spotter | Radar/BlindSpot use lapDistPct approximation, not real X/Z lateral data | High |
| `tyreCompound` | `PlayerTireCompound` is read but decoded to hardcoded `'M'` string | Medium |
| Double-negation in InputsOverlay | Steering is negated in iracing.js AND in the overlay | Medium |
| Fullscreen exclusive | Not supported without DX injection | Medium |
| Memory per window | ~60-100 MB/window; 29 windows visible simultaneously would be ~2 GB | Medium |
| YAML fields missing | `CarClassColor`, team data, incident counts, qualifying results not parsed | Medium |
| `CarIdxTrackSurface` | More accurate pit detection than `CarIdxOnPitRoad`; not used | Low |
| `skies` | iRacing `Skies` int not decoded; field is empty string | Low |
| Settings scope | All settings flat; no global, no per-overlay content, no per-session | High |
