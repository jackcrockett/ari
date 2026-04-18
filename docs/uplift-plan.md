# ARI Competitive Uplift Plan

> Phase 2 of the uplift project. Produced after the Phase 1 audit.
> Status: v0.6-v0.9 shipped 2026-04-18. v0.10 next.

---

## Competitive Context

Kapps development is suspended. iOverlay is active and strong on UI polish. RaceLab is strong on web/streaming angles and coaching features. Our differentiation is:

- Native Electron exe with zero cloud dependency
- Already ships more overlay types than Kapps did at suspension
- The column engine (below) would leap-frog both Kapps and iOverlay on Standings/Relative configurability

The gaps to close in priority order: configurable columns, session presets, improved proximity detection, network streaming, style variants.

---

## Tier 1 Feature Analysis

### T1-A: Configurable Driver-Data Columns for Standings and Relative

**Current state in ARI**

Both overlays hard-code their column sets in JSX. Relative shows: position, color dot, license badge, driver name, iRating, gap. Standings shows: position, color dot, driver name, PIT badge, gap to leader. Row count is hardcoded (5 for Relative, 10 for Standings). Nothing persists except position and scale.

**Target behavior**

User picks from a superset of 28 driver-row columns and re-orders them. Each overlay (Relative and Standings) has an independent column selection. Both overlays also support user-configurable header and footer bands that draw from session-level fields (time remaining, track name, weather, etc.). Column selections persist across restarts and can be overridden per session type.

**Full column superset**

Driver-row columns (28):

| ID | Label | Source | Bridge change? |
|----|-------|--------|----------------|
| `position` | Pos | `driver.position` | No |
| `classPosition` | Class Pos | `CarIdxClassPosition` | Yes |
| `colorDot` | (color indicator) | `driver.colour` | No |
| `carNumber` | Car # | `driver.carNumber` | No |
| `driverName` | Driver | `driver.driverName` | No |
| `license` | Lic | `driver.licenseString` | No |
| `iRating` | iR | `driver.iRating` | No |
| `carClass` | Class | `driver.carClass` | No |
| `gap` | Gap | `driver.gapSeconds` (relative to player) | No |
| `gapToLeader` | Gap Lead | computed from `f2Time` vs leader | No (f2Time already read) |
| `intervalToNext` | Interval | gap to car directly ahead in standings | No (computed) |
| `lastLapTime` | Last Lap | `driver.lastLapTime` | No |
| `bestLapTime` | Best Lap | `driver.bestLapTime` | No |
| `estimatedLapTime` | Est Lap | `CarIdxEstTime` | No (read, not exposed per-driver) |
| `pitStatus` | Pit | `driver.onPitRoad` | No |
| `pitStopCount` | Pit Ct | `CarIdxPitStopCount` | Yes |
| `fastRepairs` | FR | `CarIdxFastRepairsUsed` | Yes |
| `currentLap` | Lap | `CarIdxLap` | Yes |
| `lapsCompleted` | Laps Done | `CarIdxLapCompleted` | Yes |
| `tyreCompound` | Tyre | `CarIdxTireCompound` (decoded) | Yes |
| `trackSurface` | Surface | `CarIdxTrackSurface` | Yes |
| `incidentCount` | Inc | YAML `CurDriverIncidentCount` | Yes (YAML parser) |
| `isFastestLap` | (purple indicator) | computed in bridge | No |
| `positionsGained` | +/- | computed at race start | No (main process state) |
| `speed` | Speed | `CarIdxRPM` / `CarIdxGear` (gear as proxy) | Yes |
| `teamName` | Team | YAML `TeamName` | Yes (YAML parser) |
| `deltaToPlayer` | Dt | lap delta approximation | Computed |
| `onTrack` | (off-track indicator) | `CarIdxTrackSurface` | Yes |

Session-level header/footer band fields (14):

`sessionType`, `currentLap/totalLaps`, `sessionTimeRemain`, `trackName`, `trackTemp`, `airTemp`, `windSpeed`, `windDir`, `sessionFlags` (flag name), `playerPosition`, `playerBestLap`, `playerLastLap`, `fuelLevel`, `fuelLapsRemaining`

**Files and modules that will change**

New files:
- `src/renderer/lib/columnDefs.js` -- single source of truth for all column and band definitions (see Architectural Decisions)
- `src/renderer/components/ui/DriverRow.jsx` -- renders one driver row from an ordered column array
- `src/renderer/components/ui/ColumnPicker.jsx` -- drag-and-drop column selector panel; shown via a settings icon in the overlay's DragHandle slot
- `src/renderer/components/ui/BandPicker.jsx` -- selector for header/footer band fields

Modified files:
- `src/main/iracing.js` -- add missing per-car fields to driver objects (see bridge additions below)
- `src/main/main.js` -- add `get-overlay-settings` and `save-overlay-settings` IPC handlers
- `src/main/preload.js` -- expose `getOverlaySettings`, `saveOverlaySettings`, `onOverlaySettingsChanged`
- `src/renderer/components/overlays/StandingsOverlay.jsx` -- replace hard-coded rows with DriverRow
- `src/renderer/components/overlays/RelativeOverlay.jsx` -- replace hard-coded rows with DriverRow
- `src/renderer/components/ui/DragHandle.jsx` -- add optional settings icon slot

The `LeaderboardOverlay` and `HorizontalStandingsOverlay` components will be migrated in a follow-up phase, not in the first column engine pass. Constraint says additive introduction.

**Bridge changes required**

Add to driver objects built in `buildTelemetry()` in `iracing.js`:
- `CarIdxLap[i]` -> `currentLap`
- `CarIdxLapCompleted[i]` -> `lapsCompleted`
- `CarIdxClassPosition[i]` -> `classPosition`
- `CarIdxTireCompound[i]` -> `tyreCompound` (raw int; decode via a lookup once we have compound data)
- `CarIdxPitStopCount[i]` -> `pitStopCount`
- `CarIdxFastRepairsUsed[i]` -> `fastRepairsUsed`
- `CarIdxTrackSurface[i]` -> `trackSurface` (0-5 int; surface=3 is pit stall, surface=2 is pit lane)
- `CarIdxEstTime[i]` -> `estimatedLapTime`
- `CarIdxF2Time[i]` -> `f2Time` (already read; currently used only for `gapSeconds` calculation, not exposed per-driver)

YAML parser additions in `parseSessionYaml()`:
- `CurDriverIncidentCount` per driver -> `incidentCount`
- `TeamName` per driver -> `teamName`
- `QualifyResultsInfo` section -> `qualifyPosition` per driver (for positions gained computation)

New scalar fields computed in `buildTelemetry()`:
- `gapToLeader` per driver: `f2Time[i] - f2Time[leaderCarIdx]`
- `intervalToNext` per driver: gap to the car at `position - 1` in standings order
- `positionsGained`: `qualifyPosition - currentPosition` if qualify data available, else null

**Complexity**

L. The column definitions module and DriverRow component are straightforward, but the full column picker UI with drag-to-reorder, the settings IPC plumbing, and the initial bridge additions together make this the largest single effort in the plan. Plan for 8-12 focused development sessions across the full feature.

**Ordering dependencies**

None. Can start immediately. Bridge additions (listed above) are a prerequisite for the columns that need them, but the column engine itself can be built with a subset of columns and the bridge additions added incrementally.

**Risks and open questions**

- `CarIdxTireCompound` returns an integer; the mapping from int to compound name (Hard/Medium/Soft/Wet) is car-class-specific and not documented in the iRacing SDK. Need to empirically map these values or display as raw integers with a tooltip.
- Column widths: the current overlay widths (290px for Relative, 300px for Standings) need to grow if more columns are added. The overlay should auto-size to fit the selected column set, or the user should control width via scale + a "max columns" setting.
- The drag-to-reorder column picker UI in an overlay window (transparent, always-on-top) is technically complex because mouse passthrough must be disabled during picker interaction. The picker should be shown as a non-transparent settings panel, not inside the overlay window itself. Recommendation: open a small settings popup attached to the control panel, or add a gear icon to the DragHandle that opens the control panel settings tab for that overlay.

---

### T1-B: Per-Session Config Presets

**Current state in ARI**

No concept of presets. `sessionType` is exposed in telemetry (string: "Race", "Practice", "Qualify", "Lone Qualify", "Offline Testing"). Active overlays reset to "all off" on every app restart.

**Target behavior**

Three named presets: Practice, Qualify, Race. Each preset stores:
- Which overlays are visible
- Column selection for Standings and Relative (and any other overlay with configurable columns)
- Optionally: scale overrides per overlay

When iRacing changes session type (e.g., qualifying ends and race starts), ARI detects the change and auto-applies the matching preset. User can also switch presets manually from the control panel. Presets are created by configuring the current layout and clicking "Save as [Practice/Qualify/Race]".

**Files and modules that will change**

New files:
- `src/renderer/components/PresetPanel.jsx` -- preset management UI (create, switch, auto-switch toggle)

Modified files:
- `src/main/main.js` -- store `app.activeOverlays` and `app.autoPreset` flag; add `session-type-change` IPC broadcast; add `get-presets` / `save-preset` / `apply-preset` handlers
- `src/main/preload.js` -- expose preset IPC methods; expose `onSessionTypeChange`
- `src/main/iracing.js` -- detect session type changes (compare `sessionNum` and `sessionType` between frames); call a callback when changed
- `src/renderer/components/ControlPanel.jsx` -- add preset switcher UI; show current session type; persist active overlays on toggle change
- Electron-store schema addition (see Config Scope Model below)

**Bridge changes required**

None. Session type is already in telemetry. The change is in how main.js responds to it.

**Complexity**

M. The session type detection is simple. The IPC plumbing is straightforward. The main complexity is the preset UI and deciding what exactly a preset saves (visibility only vs. visibility + columns). Recommendation: v1 of presets saves visibility only (which overlays are on). Column presets are a v2 addition after the column engine is proven.

**Ordering dependencies**

Depends on T1-A being complete (or at least on the settings store model being established) if column selections are included in presets. Can ship visibility-only presets before T1-A ships.

**Risks and open questions**

- Session type strings from iRacing are not fully documented. The YAML sessions array uses values like "Race", "Practice", "Qualify", "Lone Qualify", "Offline Testing", "Open Practice". The auto-switch logic should map these to the three user-facing preset names.
- Auto-switch should be opt-in (disabled by default) so users aren't surprised by their layout changing mid-session.

---

### T1-C: Spotter / Proximity Overlay

**Current state in ARI**

Two related overlays exist:

- `RadarOverlay`: Canvas-based. Approximates lateral position using a hash of `carIdx` as a jitter value. Detects proximity by `lapDistPct` delta within 5%. The "lateral" axis is entirely synthetic.
- `BlindSpotOverlay`: Left/right detection using `carIdx % 2` parity. This is not meaningful; it does not reflect actual track position.
- `OvertakeAlertOverlay`: Detects faster cars closing from behind using `lapDistPct` and a frame-to-frame delta. Works reasonably for the purpose (alerting, not precision). Currently alerts on any car closing, not just different-class cars.

The fundamental constraint: iRacing's live SDK exposes `X` and `Z` world coordinates only for the player car. Other cars' world positions are not available in the live telemetry interface.

**Target behavior**

1. **BlindSpot**: Replace the carIdx-parity hack with `CarIdxTrackSurface` + `lapDistPct` delta. A car is "alongside" if its `lapDistPct` is within 0.8% of the player's (approximately 1-2 car lengths) AND its `CarIdxTrackSurface` value is 5 (on-track). Left/right detection is still approximate without real X/Z; best available heuristic is whether the car was behind or ahead when it entered the alongside zone (approach direction).

2. **Radar**: Keep the existing visual but replace the jitter with a directional heuristic. Mark cars as a "danger zone" ring when within 0.5% `lapDistPct`. Document the limitation (this is not a real bird's-eye radar; it is a proximity indicator).

3. **OvertakeAlert**: Add class-filtering so the alert only fires for different-class cars (use `carClassId`). Add a "time to reach" estimation using `gapSeconds` and closing rate. iOverlay calls this "Blue Flag Warning" mode.

4. **Spotter audio** (stretch goal, explicitly flagged): A voice spotter (left/right/clear/mid) requires real lateral data. This is blocked by the SDK limitation. The only path is to use iRacing's in-game spotter via the SDK's broadcast message interface (`BroadcastMsg_ChatComand` is available; a custom spotter would need a separate tool). Flag this as out of scope for v1.

**Files and modules that will change**

Modified files:
- `src/main/iracing.js` -- add `CarIdxTrackSurface` per driver object
- `src/renderer/components/overlays/BlindSpotOverlay.jsx` -- replace carIdx parity with trackSurface + lapDistPct logic
- `src/renderer/components/overlays/RadarOverlay.jsx` -- tighten danger zone threshold; use trackSurface
- `src/renderer/components/overlays/OvertakeAlertOverlay.jsx` -- add class filtering via carClassId comparison

**Bridge changes required**

`CarIdxTrackSurface` per driver object (also needed for T1-A column). One addition, shared benefit.

**Complexity**

S. The logic changes are small. The hard part (real lateral position) is explicitly not attempted.

**Ordering dependencies**

None. Can ship before or after T1-A.

**Risks and open questions**

- Without real lateral data, BlindSpot will have false positives (same lapDistPct but on opposite sides of a wide track, e.g. in a draft). The UI should make the approximation obvious ("proximity" not "radar").
- Voice spotter: do not attempt without real lateral data. A "car clear / car left / car right" voice call based on parity heuristics would be actively harmful.

---

### T1-D: Fullscreen iRacing Rendering

**Current state in ARI**

Electron overlays use `alwaysOnTop: 'screen-saver'` level, which maps to `HWND_TOPMOST` on Windows. This works when iRacing runs in borderless-windowed (windowed fullscreen) mode, which is the Windows 10/11 default and iRacing's recommendation. It does not work when iRacing is in exclusive DirectX fullscreen mode.

**Analysis of approaches**

| Approach | Works | Complexity | Risk |
|----------|-------|------------|------|
| Current (HWND_TOPMOST) | Borderless-windowed only | None | None |
| DirectX hook (inject DLL into iRacing process) | Exclusive fullscreen | Very High | Antivirus flagging, game ban risk, maintenance per iRacing update |
| Windows Magnification API | Exclusive fullscreen | High | Deprecated path; limited to capture/redisplay, not transparent overlay |
| Xbox Game Bar SDK (Windows.Gaming.Capture) | Exclusive fullscreen on GDK-enabled games | High | iRacing must be registered with GDK; not in our control |
| DXGI Desktop Duplication + transparent window | May work on some setups | High | Complex; race condition with compositor |

**Decision: do not implement exclusive fullscreen support for v1.x**

iRacing on Windows 10/11 defaults to borderless-windowed. The Steam Survey shows >90% of Windows gaming PCs run Windows 10 or 11. The majority of iRacing users on these OSes run borderless-windowed by default. The effort/risk of DX injection far exceeds the user benefit for this edge case.

**What we do instead**

1. Add a one-time setup hint in the control panel that detects whether the user may be running exclusive fullscreen (by checking if the ARI window loses topmost status) and surfaces a link to iRacing graphics settings.
2. Document clearly in the README and an in-app help tooltip: "ARI requires iRacing to run in Windowed or Borderless-Windowed mode."

**Files and modules that will change**

- `src/renderer/components/ControlPanel.jsx` -- add a status indicator that shows whether overlays are confirmed visible (a future feature; for now just add the help tooltip)
- README / docs

**Bridge changes required**

None.

**Complexity**

S (documentation + tooltip only).

---

## Tier 2 Feature Analysis

### T2-A: Individual Overlays as Separate Windows (VR / Multi-Monitor)

**Current state in ARI**

Already implemented: each overlay is an independent OS `BrowserWindow`. Multi-monitor repositioning works today via drag. The gap is that the windows are `transparent: true`, `skipTaskbar: true`, and `focusable: false`, which makes them invisible to OVR Toolkit's window capture and to tools like StreamLabs that want to capture individual game overlays.

**Target behavior**

A "VR Mode" toggle per overlay (or globally). When enabled, the overlay window switches to: `transparent: false`, `backgroundColor: '#000000'`, `skipTaskbar: false`, `focusable: true`. This makes it a normal capturable window that OVR Toolkit, StreamLabs, and OBS Window Capture can see. The overlay content renders normally; the background is black. When VR mode is off, behavior is unchanged.

**Files and modules that will change**

- `src/main/main.js` -- add `set-overlay-vr-mode(id, enabled)` IPC handler; recreate or modify window properties
- `src/main/preload.js` -- expose `setOverlayVrMode`
- `src/renderer/components/ControlPanel.jsx` -- per-overlay VR mode toggle (an icon next to each overlay toggle)

**Bridge changes required**

None.

**Complexity**

M. Electron does not allow changing `transparent` or `focusable` after window creation; a VR-mode window must be created with different options than a passthrough overlay window. The cleanest approach is to destroy the existing window and recreate it with the new properties (saving position first). This means `createOverlayWindow` needs a `vrMode` parameter.

**Ordering dependencies**

None. Independent.

---

### T2-B: Dual-PC / Network Streaming Mode

**Current state in ARI**

No HTTP server. All rendering is local. The `useTelemetry` hook already has a browser-fallback path (demo data when `window.ari` is absent) -- this is the foundation needed.

**Target behavior**

ARI main process runs a local HTTP server (configurable port, default 6172). The server:
1. Serves the Vite-built renderer bundle (`dist/renderer/`)
2. Streams live telemetry via WebSocket (`ws://localhost:6172/telemetry`)
3. Exposes individual overlay routes at `http://localhost:6172/#/overlay/<id>`

A second PC, phone, tablet, or OBS browser source can load any overlay URL. The overlay connects to the WebSocket and receives the same telemetry the local Electron app receives. No special configuration on the streaming side; just open the URL.

The control panel shows a "Network Mode" section with the server URL and a QR code for quick phone access.

**Files and modules that will change**

New files:
- `src/main/httpServer.js` -- Express server + `ws` WebSocket server; reads from the telemetry broadcast path

Modified files:
- `src/main/main.js` -- start HTTP server on app ready; integrate with `broadcastTelemetry()`
- `src/main/preload.js` -- expose `getNetworkServerUrl`
- `src/renderer/hooks/useTelemetry.js` -- detect if running in a browser context with a `?ws=` query param or a known localhost URL, and subscribe to the WebSocket instead of `window.ari.onTelemetry`
- `src/renderer/components/ControlPanel.jsx` -- Network Mode section with URL display and QR code
- `package.json` -- add `express` and `ws` dependencies

**Bridge changes required**

None.

**Complexity**

M. The server itself is simple. The main complexity is making `useTelemetry` work in three modes: Electron IPC (current), WebSocket (network), and demo (browser without WS). The existing demo-fallback structure makes this straightforward to extend.

**Ordering dependencies**

None. Independent. Ideally ships before or alongside the column engine so remote clients get the full column feature set.

**Risks and open questions**

- Security: the HTTP server listens on localhost only by default (not `0.0.0.0`). An opt-in "LAN mode" setting would expose it on the local network for tablet/phone use. Do not expose to the internet.
- Port conflicts: default 6172 should be configurable.
- Latency: WebSocket on localhost is effectively zero-latency. On LAN (~1-2ms), telemetry at 60fps is 60 * ~1KB = 60 KB/s. Fine.

---

### T2-C: Classic Standings / Compact Variants

**Current state in ARI**

One hardcoded visual style per overlay. `AdvancedPanelOverlay` has a primitive block-toggle (lost on restart). No theme system.

**Target behavior**

Standings, Relative, and Leaderboard each offer three built-in style variants:

- **Default** (current dark style, refactored to use the column engine)
- **Compact** (reduced padding, smaller font, tighter rows -- fit more cars in the same space)
- **Broadcast** (larger driver names, colored class bands, bold position number -- visually closer to TV timing towers)

Variant is selected via the overlay's settings panel (the same panel used for column selection). Persisted in `overlay.<id>.content.variant`.

**Files and modules that will change**

New files:
- `src/renderer/lib/overlayVariants.js` -- exports style preset objects (`compact`, `broadcast`, `default`) with spacing, font size, and layout tokens

Modified files:
- `src/renderer/components/overlays/StandingsOverlay.jsx` -- read `variant` from settings, pass style tokens to DriverRow
- `src/renderer/components/overlays/RelativeOverlay.jsx` -- same
- `src/renderer/components/overlays/LeaderboardOverlay.jsx` -- same
- `src/renderer/components/ui/DriverRow.jsx` -- accept `variant` or `styleTokens` prop

**Bridge changes required**

None.

**Complexity**

S (after T1-A is complete; building on the column engine).

**Ordering dependencies**

Requires T1-A (column engine) to be complete first.

---

### T2-D: Incident / Race Control Panel

**Current state in ARI**

`FlagsOverlay` and `DigiflagOverlay` display the current flag state. No incident tracking. YAML-based incident counts are not parsed.

**Target behavior**

A new `IncidentOverlay` that shows:
- A scrolling log of race control messages (yellow flag sectors, black flags, drive-throughs)
- Per-driver incident counts pulled from YAML
- The total race incident count

Race control messages are available in iRacing's session YAML under `RadioInfo.Messages` and are updated when the YAML version changes. Camera control (click a driver to jump to their camera) requires sending a broadcast message to iRacing via a separate SDK mechanism -- see risks below.

**Files and modules that will change**

New files:
- `src/renderer/components/overlays/IncidentOverlay.jsx`
- `src/main/main.js` -- add `OVERLAY_DEFAULTS.incident` entry

Modified files:
- `src/main/iracing.js` -- parse `RadioInfo.Messages` from YAML; parse per-driver `CurDriverIncidentCount` from YAML (adds to existing driver objects)
- `src/renderer/App.jsx` -- add incident route
- `src/renderer/components/ControlPanel.jsx` -- add incident overlay to Standings group

**Bridge changes required**

Incident counts: YAML-only, no MMF change needed. Radio/race control messages: YAML `RadioInfo` section.

Camera control: iRacing accepts camera commands via a second shared memory area (`IRSDKBroadcastMsg`). This would require the C# bridge to also write commands TO iRacing, not just read from it. Significant bridge change. Recommended scope: parse and display incident data in v2; defer camera control to v3.

**Complexity**

M (display only). L (with camera control).

**Ordering dependencies**

None for display-only version. Camera control depends on a bridge command path, which is a separate architectural effort.

---

### T2-E: Flat Map and Minimap (already exists, enhance)

**Current state in ARI**

`FlatMapOverlay` exists (circular schematic layout). `MinimapOverlay` exists (compact canvas map using same GPS data as TrackMap). Both functional.

**Target behavior**

No new overlays needed here. Improvements:
- FlatMap: show sector markers; show class indicators per car (color by class, not just by carIdx)
- Minimap: expose as an optional sub-view within TrackMap (so user doesn't need two separate map overlays)
- Both: use `CarIdxTrackSurface` for more accurate "is on track" detection vs "is in pits"

**Complexity**

S. Incremental improvements to existing overlays.

---

### T2-F: Pit Entry/Exit Helper (already exists, enhance)

**Current state in ARI**

`PitboxHelperOverlay` shows current speed vs a hardcoded 60 km/h limit. Does not use the actual track pit speed limit. `RaceScheduleOverlay` shows a 45-60% of race distance pit window (hardcoded ratio).

**Target behavior**

- PitboxHelper: read the actual pit speed limit from the iRacing session YAML (field: `WeekendOptions.PitSpeedLimit`, in m/s). Display in either km/h or mph based on a global units setting.
- RaceSchedule: add pit stop count selector (1 stop vs 2 stops) and calculate optimal pit window for each strategy. Show fuel delta if user changes strategy.

**Files and modules that will change**

- `src/main/iracing.js` -- parse `WeekendOptions.PitSpeedLimit` from YAML; add to telemetry output
- `src/renderer/components/overlays/PitboxHelperOverlay.jsx` -- use dynamic pit speed limit
- `src/renderer/components/overlays/RaceScheduleOverlay.jsx` -- add stop count selector; improve window calculation

**Bridge changes required**

YAML parser addition: `WeekendOptions.PitSpeedLimit`.

**Complexity**

S.

---

## Tier 3 (later, not planned for current cycle)

- Twitch chat overlay -- requires Twitch OAuth, an external service dependency. Flag to user first.
- Garage/setup cover -- straightforward overlay showing "SETUP COVERED" when in garage. Simple to add.
- Custom user-supplied overlay URLs (iframe) -- feasible but needs sandboxing/CSP consideration.
- BTTV emote support -- depends on Twitch overlay; out of scope.

---

## Architectural Decisions

### Decision 1: Columns Engine Design

**The load-bearing decision for the whole plan.**

**Single source of truth: `src/renderer/lib/columnDefs.js`**

This module is pure JavaScript (no React imports) and exports two things:

```js
// Driver-row column definitions
export const DRIVER_COL_DEFS = {
  position: {
    id: 'position',
    label: 'Pos',
    headerLabel: 'P',
    width: 22,          // fixed px; null means use flex
    flex: 0,
    align: 'right',
    getValue: (driver, _session) => driver.position,
  },
  driverName: {
    id: 'driverName',
    label: 'Driver',
    headerLabel: 'Driver',
    width: null,
    flex: 1,
    align: 'left',
    getValue: (driver, _session) => driver.driverName,
  },
  gap: {
    id: 'gap',
    label: 'Gap',
    headerLabel: 'Gap',
    width: 56,
    flex: 0,
    align: 'right',
    getValue: (driver, _session) => driver.gapSeconds,
    format: (val, driver) => driver.isPlayer ? '-- YOU --' : formatGap(val),
    colorFn: (val, driver) => driver.isPlayer ? 'rgba(255,255,255,0.4)' : val < 0 ? '#94D2BD' : '#F59E0B',
  },
  // ... all 28 definitions
}

// Session-level header/footer band definitions
export const BAND_DEFS = {
  lapCount: { id: 'lapCount', label: 'Lap', getValue: (_d, s) => `${s.currentLap} / ${s.totalLaps}` },
  timeRemain: { id: 'timeRemain', label: 'Time', getValue: (_d, s) => formatTime(s.sessionTimeRemain) },
  // ... 14 definitions
}

export const DEFAULT_RELATIVE_COLS  = ['position', 'colorDot', 'license', 'driverName', 'iRating', 'gap']
export const DEFAULT_STANDINGS_COLS = ['position', 'colorDot', 'driverName', 'pitStatus', 'gapToLeader']
```

`getValue` returns raw values. Optional `format` and `colorFn` receive the raw value and driver for display transformation. This keeps the definition pure and testable.

**`DriverRow` component (`src/renderer/components/ui/DriverRow.jsx`)**

```jsx
export default function DriverRow({ driver, sessionData, columns, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', ... }}>
      {columns.map(colId => {
        const def = DRIVER_COL_DEFS[colId]
        if (!def) return null
        const raw = def.getValue(driver, sessionData)
        const display = def.format ? def.format(raw, driver) : raw
        const color = def.colorFn ? def.colorFn(raw, driver) : 'rgba(255,255,255,0.75)'
        return (
          <span key={colId} style={{
            width: def.width ?? undefined,
            flex: def.flex ?? undefined,
            textAlign: def.align,
            color,
            ...fontStyle,
          }}>
            {display}
          </span>
        )
      })}
    </div>
  )
}
```

**User selections stored in `electron-store`**

```
overlay.relative.content = {
  columns: ['position', 'colorDot', 'license', 'driverName', 'iRating', 'gap'],
  rowCount: 5,
  headerBands: ['lapCount'],
  footerBands: [],
}
overlay.standings.content = {
  columns: ['position', 'colorDot', 'driverName', 'pitStatus', 'gapToLeader'],
  rowCount: 10,
  headerBands: ['lapCount', 'timeRemain'],
  footerBands: [],
}
```

**IPC for settings**

Three new handlers in `main.js`:
- `get-overlay-settings(id)` -- returns `store.get('overlay.' + id + '.content') ?? DEFAULT`
- `save-overlay-settings(id, content)` -- writes to store; sends `overlay-settings-changed` to the overlay's BrowserWindow
- (event) `overlay-settings-changed` -- received by overlay, triggers re-read of settings

**Column picker UI**

Opening a full drag-and-drop column reorderer inside a transparent always-on-top overlay window is fragile (mouse passthrough, z-order conflicts). The recommended approach: the settings icon in the DragHandle opens a settings sheet inside the control panel window (not in the overlay). The overlay receives the `overlay-settings-changed` event and re-renders with the new column list.

**Why this design**

- The `columnDefs.js` module has no React dependency, so it can be imported by the HTTP server (for network mode metadata), by tests, and by any future overlay without coupling.
- `getValue` / `format` / `colorFn` separation means the renderer can swap display logic (e.g., show absolute lap time vs delta) without touching the data layer.
- Stored as a plain array of IDs, so it survives overlay code refactors -- IDs are stable contracts.
- Adding a new column is one new entry in `columnDefs.js` and a bridge addition if needed; no changes to the renderer architecture.

---

### Decision 2: Config Scope Model

**Current state**: Single flat `electron-store` namespace. Only `overlay.<id>.x/y/scale/inLayout` and `trackmap.*` are persisted.

**New schema (fully additive -- existing keys untouched)**

```
app.activeOverlays        = ['relative', 'standings', 'fuel']   // restored on startup
app.autoPreset            = true                                  // auto-switch by session type
app.units                 = 'metric'                             // 'metric' | 'imperial'
app.networkServer.enabled = false
app.networkServer.port    = 6172

overlay.<id>.x            = (unchanged)
overlay.<id>.y            = (unchanged)
overlay.<id>.scale        = (unchanged)
overlay.<id>.inLayout     = (unchanged)
overlay.<id>.content      = { columns, rowCount, headerBands, footerBands, variant }
overlay.<id>.sessions     = {
  Practice: { visible: true, content: { columns: [...] } },
  Qualify:  { visible: true, content: { columns: [...] } },
  Race:     { visible: true, content: { columns: [...] } },
}

trackmap.<id>             = (unchanged)
```

**Migration**: No migration code needed. Missing keys fall back to hardcoded defaults in the application. Existing user installations are unaffected on upgrade.

**Scope hierarchy** (in priority order for any given setting):
1. Per-session override (`overlay.<id>.sessions.<type>.content.columns`)
2. Per-overlay content setting (`overlay.<id>.content.columns`)
3. Hardcoded default in `columnDefs.js`

---

### Decision 3: Window Model

**Recommendation: keep one OS window per overlay.**

The alternative (a single shared "overlay host" window with absolutely-positioned divs for each overlay) would require:
- Rebuilding the drag-to-reposition mechanism (currently IPC-based, moves the OS window; would need to move a DOM element and then sync back to IPC for persistence)
- Rebuilding the show/hide logic (currently `win.show()` / `win.hide()`)
- Rebuilding per-overlay z-ordering (currently free via OS)
- Breaking VR mode (T2-A), which relies on per-overlay window properties

The memory cost of one process per overlay is real (~60-100 MB each). On a modern sim racing PC (typically 16-32 GB RAM), 10 active overlays costs ~600 MB to 1 GB -- noticeable but acceptable. The RAM cost should be documented as a known limitation, not fixed by a painful architectural rewrite.

If memory becomes a blocking issue for users in a future version, the right fix is to move from Electron's multi-process renderer model to a single renderer process with multiple `BrowserView` instances (Electron v28 supports this), not to flatten the window model.

---

### Decision 4: Fullscreen Rendering Approach

**Decision: do not implement DirectX injection or any kernel-level hook.**

Full reasoning in T1-D above. Short version: DX hooking is complex, antivirus-flagged, and requires maintenance per iRacing update. The majority use case (borderless-windowed) is already supported. The right response to this limitation is clear documentation, not risky code.

**What ships instead**: A control panel status indicator that confirms overlays are rendering above iRacing. A one-time "Setup" prompt (shown on first launch) that explains the borderless-windowed requirement with a step-by-step screenshot. A link to iRacing's graphics settings.

---

## Bug Fixes to Ship Before Phase 3 Begins

These are correctness issues identified in the audit. They should ship as a v0.6 prep commit before any feature work.

1. **Steering double-negation in `InputsOverlay.jsx` line 158**: `data.steering` is already negated in `iracing.js` (line 356: `-steerRad / ...`). The overlay negates it again (`const steering = -(data?.steering ?? 0)`). Net effect: the wheel and "L/R" indicator show the correct direction (two negations cancel), but the code is wrong-by-accident and will bite the next person who reads it. Fix: remove the negation in the overlay. Confirm visually that L/R still matches physical steering direction.

2. **`tyreCompound` hardcoded to `'M'`**: `iracing.js` line 358 sets `tyreCompound: 'M'` unconditionally. `PlayerTireCompound` is a valid SDK variable returning an integer. The integer-to-string mapping is car-class-specific and undocumented; short-term fix is to expose the raw integer and label it as such, or display "Compound X" until a mapping table is built.

3. **Active overlays not persisted**: Every app restart resets all overlays to "off". Fix: on toggle-on/toggle-off in the control panel, write to `app.activeOverlays` in the store. On app ready, after creating the control window, read `app.activeOverlays` and call `createOverlayWindow` for each.

---

## Phased Rollout

Each phase is independently shippable. All existing overlays must work after every phase.

---

### v0.6 -- Quick Fixes + Foundation
**Goal**: Ship correctness fixes and lay the groundwork for the column engine.
**Status**: SHIPPED 2026-04-18

| Item | Status | Notes |
|------|--------|-------|
| Fix steering double-negation | Done | `InputsOverlay.jsx`: removed second negation |
| Fix tyreCompound decoding | Done | `iracing.js`: raw int from `PlayerTireCompound`; per-car `tyreCompoundRaw` |
| Persist active overlays across restarts | Done | `main.js` + `ControlPanel.jsx` + store `app.activeOverlays` |
| Add `get-overlay-settings` / `save-overlay-settings` IPC | Done | `main.js` + `preload.js` |
| Bridge additions: `CarIdxLap`, `CarIdxLapCompleted`, `CarIdxClassPosition`, `CarIdxTrackSurface`, `CarIdxTireCompound`, `CarIdxPitStopCount`, `CarIdxFastRepairsUsed`, `CarIdxEstTime` per-driver | Done | All added to `driverList.push()` in `iracing.js` |
| YAML additions: `CurDriverIncidentCount`, `TeamName`, `QualifyResultsInfo` | Done | `parseSessionYaml()` in `iracing.js` |
| Compute `gapToLeader`, `intervalToNext`, `positionsGained` per driver | Done | Post-sort pass in `buildTelemetry()` |
| Parse `TrackPitSpeedLimit` from YAML | Done | Found in `TrackInfo` block, format `55.96 kph`; exposed as `pitSpeedLimit`; `PitboxHelperOverlay` uses it dynamically |

**Deviations from plan**: `PitSpeedLimit` was in `TrackInfo` YAML block (not `WeekendOptions` as originally noted). Per-car tyre compound field named `tyreCompoundRaw` to distinguish from `tyreCompound` (scalar player field).

---

### v0.7 -- Columns Engine (Tier 1-A)
**Goal**: Ship configurable columns for Standings and Relative. This is the most impactful single feature.

| Item | Work |
|------|------|
| `columnDefs.js` -- full 28-column + 14-band definitions | New file |
| `DriverRow.jsx` -- renders a row from column array | New component |
| `ColumnPicker.jsx` -- settings panel (shown in control panel, not in overlay window) | New component |
| `BandPicker.jsx` -- header/footer band selector | New component |
| Refactor `StandingsOverlay.jsx` to use DriverRow | Modified |
| Refactor `RelativeOverlay.jsx` to use DriverRow | Modified |
| `DragHandle.jsx` -- add settings icon that opens ColumnPicker | Modified |
| Store integration: read/write `overlay.<id>.content` | `main.js` |
| Settings panel tab in `ControlPanel.jsx` | Modified |

**Complexity**: L. Plan for this to be the largest phase. Old hardcoded rendering in `LeaderboardOverlay` and `HorizontalStandingsOverlay` is left alone until v0.8+.

---

### v0.8 -- Session Presets (Tier 1-B)
**Goal**: Auto-switch layout and column selection based on session type.
**Status**: SHIPPED 2026-04-18

| Item | Status | Notes |
|------|--------|-------|
| Session type change detection | Done | In `broadcastTelemetry` (main.js), not iracing.js -- cleaner |
| `session-type-change` IPC broadcast | Done | main.js -> controlWindow only (overlays do not need it) |
| Preset data model in store | Done | `app.presets.{practice,qualify,race}` + `app.autoPreset` |
| Preset management UI | Done | 3-card grid in ControlPanel with SAVE/LOAD buttons per preset |
| Auto-apply on session type change | Done | `app.autoPreset` toggle; applies in main.js before telemetry broadcast |
| Preset applies visibility + column selection | Done | `applyPreset()` in main.js hides/shows windows + pushes overlay-settings-changed |
| Auto toggle in ControlPanel | Done | Mini toggle labeled AUTO; state persisted |

**Deviations**: Session type change detection placed in `broadcastTelemetry` in main.js rather than iracing.js -- avoids modifying the bridge and gets the data from the already-parsed telemetry. Change is detected on first frame difference (not on first frame to avoid false trigger at startup). Preset keys: `practice` (Practice, Offline Testing), `qualify` (Qualify, Lone Qualify), `race` (Race + fallback).

---

### v0.9 -- Proximity Improvements + Bug Sweep (Tier 1-C)
**Goal**: Make BlindSpot, Radar, and OvertakeAlert meaningfully more accurate.
**Status**: SHIPPED 2026-04-18

| Item | Status | Notes |
|------|--------|-------|
| BlindSpot: trackSurface filter + lapDistPct split | Done | Filters pitting cars (trackSurface != 5); delta sign determines FWD/RR split; shows car number; threshold tightened to 1.2% |
| Radar: trackSurface filter + tighter thresholds | Done | CLOSE_PCT 5%->4%, DANGER_PCT 1.5%->1.2%; skips pitting cars |
| OvertakeAlert: class filtering + closing rate | Done | Different-class cars alerted at 6% threshold, same-class at 3%; smoothed closing rate (s/s) shown; pitting cars excluded; rate progress bar |
| PitboxHelper: dynamic pit speed limit | Already done in v0.6 | |
| RaceSchedule: stop count selector | Done | 1/2/3 stop buttons; pit windows update dynamically; all windows shown as mini chips |
| Migrate LeaderboardOverlay to column engine | Done | Full DriverRow + settings IPC; default: position, colorDot, driverName, pitStatus, bestLapTime; settings icon |
| Migrate HorizontalStandingsOverlay | Deferred | Format is cards-in-a-row, not compatible with DriverRow; migrate in v1.0 |
| Incident overlay (display-only) | Done | New IncidentOverlay; sorted by incident count; NEW badge on freshly incremented counts; color coded 0/8+/17+ thresholds |

---

### v0.10 -- Network Streaming (Tier 2-B) + VR Mode (Tier 2-A)
**Goal**: Ship the dual-PC use case and OVR Toolkit compatibility.

| Item | Work |
|------|------|
| `httpServer.js` -- Express + WebSocket server | New file |
| `useTelemetry.js` -- WebSocket data source mode | Modified |
| Network Mode UI in ControlPanel | Modified |
| QR code for phone access (use a pure-JS QR library) | Modified |
| VR Mode per-overlay toggle | `main.js` + `ControlPanel.jsx` |
| `createOverlayWindow` refactor to support vrMode flag | `main.js` |

**Complexity**: M. The WebSocket telemetry path reuses the existing `buildTelemetry` output unchanged.

---

### v1.0 -- Style Variants + Polish (Tier 2-C)
**Goal**: Multiple visual styles for key overlays; fullscreen documentation; general polish.

| Item | Work |
|------|------|
| `overlayVariants.js` -- compact, default, broadcast style tokens | New file |
| Variant selector in column picker panel | Modified |
| Apply variants to Standings, Relative, Leaderboard | Modified |
| Fullscreen setup wizard / detection in ControlPanel | Modified |
| Fullscreen documentation in README | Docs |
| Flat map sector markers and class colors | `FlatMapOverlay.jsx` |

**Complexity**: S-M for variants; S for documentation.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `CarIdxTireCompound` int-to-string mapping undocumented | High | Low | Display raw int with "Compound N" label until empirical mapping built |
| Column engine DriverRow performance at 60fps (29 overlays, each rendering rows) | Medium | Medium | Memoize `DriverRow` with `React.memo`; `useMemo` for column value arrays |
| Settings IPC added latency on mount | Low | Low | Cache column config in renderer state; re-read only on `overlay-settings-changed` event |
| Network WebSocket telemetry at 60fps saturates LAN | Low | Low | Throttle WebSocket to 30fps; Electron IPC path stays at 60fps |
| Column picker UI (in control panel) out of sync with overlay | Low | Medium | Use push-based `overlay-settings-changed` event; overlay always reads from store on event |
| VR mode window recreation causes brief flash | Medium | Low | Hide window before destroy/recreate; show after ready-to-show |
| Exclusive fullscreen not supported | High (edge case) | Medium | Documented prominently; setup wizard on first launch |
| Steering negation fix breaks existing user expectation | Low | Low | A/B test visually; the current double-negation happens to produce correct output |
