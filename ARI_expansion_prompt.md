# ARI Overlay Expansion - Claude Code Prompt

---

## CONTEXT: DO NOT BREAK EXISTING WORK

You are working on **Aventa Race Intelligence (ARI)** - an iRacing sim racing overlay application built with:
- **Frontend**: Electron + React + Vite
- **Data bridge**: C# application reading iRacing shared memory (iRacing SDK)
- **IPC**: C# bridge sends data to Electron via stdio/named pipe
- **Project path**: `C:\Projects\ari`
- **GitHub**: https://github.com/jackcrockett/ari

### EXISTING OVERLAYS (already built - do not modify their core logic):
1. **Relative** - proximity timing board showing cars ahead/behind
2. **Standings** - full race/class standings
3. **Fuel Calculator** - lap fuel usage, laps remaining, refuel required
4. **Track Map** - GPS-based track layout with car positions (parsed from .ibt telemetry files)
5. **Input Telemetry** - throttle, brake, steering, clutch inputs visualisation

### RULES FOR THIS TASK:
- **Read the existing codebase structure first** before writing any new files
- **Do not refactor or reorganise** existing overlay files
- **Do not change** existing data bindings, IPC contracts, or C# bridge outputs unless explicitly adding new data fields
- **Add new overlays as new files** following the exact same component pattern as existing overlays
- **Add new data fields** to the C# bridge incrementally - do not remove or rename existing fields
- **Use the existing overlay registry/router** pattern - just register new overlays into it
- **Match the existing styling system** exactly (CSS variables, fonts, colour scheme)

---

## TASK: ADD ALL MISSING OVERLAYS

Below is the full target overlay list for ARI. Items marked [EXISTS] are already built. Items marked [NEW] need to be added. Build all [NEW] overlays.

### DRIVING OVERLAYS

| Overlay | Status | Description |
|---|---|---|
| Relative | [EXISTS] | Proximity timing - cars ahead/behind with gap times |
| Standings | [EXISTS] | Full session standings, class-aware |
| Fuel Calculator | [EXISTS] | Fuel usage per lap, laps remaining, pit refuel amount |
| Track Map | [EXISTS] | Real GPS track layout with live car positions |
| Input Telemetry | [EXISTS] | Throttle, brake, steering, clutch bars/trace |
| **Radar** | [NEW] | Proximity radar (Helicorsa-style) - shows cars left/right/front/rear as coloured blobs on a circular/oval proximity map. Uses car positions relative to player. Warns of close contact. |
| **Head to Head** | [NEW] | Side-by-side comparison vs one target driver. Shows: gap delta, relative lap time delta, tyre age, pit stops, iRating. User can pin any driver from relative/standings. |
| **Flags** | [NEW] | Current race flag status displayed prominently. Supports: Green, Yellow (with sector), Full Course Yellow, Red, Blue, White, Chequered, Black (with car number). Uses iRacing session flag data. |
| **Delta** | [NEW] | Lap time delta bar vs a reference. Reference options: best lap (session), best lap (personal), last lap, optimal lap. Shows +/- gap as a horizontal bar that grows left (behind) or right (ahead). |
| **Lap Time Graph** | [NEW] | Rolling chart of lap times across the stint. X axis = lap number, Y axis = lap time in seconds. Highlights best lap. Optional overlay of target lap time line. |
| **Lap Time Log** | [NEW] | Scrollable table of every completed lap: lap number, lap time, delta to best, fuel used, tyre compound if available. |
| **Session Timer** | [NEW] | Large display of: time remaining in session OR laps remaining. Switches automatically based on session type (timed vs lap-count). Shows session type label. |
| **Overtake Alert** | [NEW] | Multiclass-specific overlay that pops up when a faster-class car is closing from behind. Shows approaching car's number, class, gap, and closing rate. Auto-dismisses when gap exceeds threshold. |
| **Blind Spot Indicator** | [NEW] | Minimal left/right indicator strips that illuminate when a car is alongside in the blind spot zone. Simpler and lower screen real estate than full radar. Uses same proximity data as Radar. |
| **Boost Box** | [NEW] | For cars with boost/push-to-pass/ERS systems. Shows: boost remaining %, boost deployed this lap, boost activation indicator, recharge rate. Falls back to hidden/disabled if car has no boost telemetry. |
| **Weather Monitor** | [NEW] | Track and air temperature, wind speed and direction, track state (dry/damp/wet), grip level. Updates live from iRacing weather data. |
| **Race Schedule** | [NEW] | Upcoming pit window calculator. Based on current fuel load, current lap, and race laps remaining: shows optimal pit lap range, laps until fuel critical, stint length. |

### STANDINGS VARIANTS

| Overlay | Status | Description |
|---|---|---|
| Standings | [EXISTS] | Vertical standings list |
| **Horizontal Standings** | [NEW] | Same data as Standings but laid out as a horizontal strip - suited for top or bottom of screen. Condensed per-car pill showing position, car number, driver name, gap. |
| **Leaderboard** | [NEW] | Broadcast-style full leaderboard. Larger text, cleaner for streaming. Shows top N cars (configurable). Designed to look good on stream, not just in cockpit. |

### TRACK & MAP VARIANTS

| Overlay | Status | Description |
|---|---|---|
| Track Map | [EXISTS] | Full detailed GPS track map |
| **Flat Map** | [NEW] | Simplified non-GPS schematic track layout (rectangle/circuit shape approximation). Lighter weight than full track map - useful when .ibt data is not yet parsed for a track. Shows car positions as dots. |
| **Minimap** | [NEW] | Compact version of the Track Map. Small, corner-positioned, semi-transparent. Fewer labels. Just car dots on the track outline. |

### TIMING & ANALYSIS

| Overlay | Status | Description |
|---|---|---|
| Lap Time Graph | [NEW - see above] | Rolling lap chart |
| Lap Time Log | [NEW - see above] | Lap history table |
| **Laptime Spread** | [NEW] | Shows the distribution of lap times across all drivers in a histogram or range bar. Highlights where the player sits in the field's pace distribution. |
| **Advanced Panel** | [NEW] | Configurable data panel. User selects which data blocks to display in a grid. Acts as a universal "pick any stat" overlay. Data blocks pull from the full available iRacing telemetry set. Minimum initial data blocks: gear, speed, RPM, lap number, position, iRating, safety rating, incident count, air temp, track temp, session time, fuel remaining, tyre age. |
| **Data Blocks** | [NEW] | Individual draggable/positionable data block widgets. Each block shows a single data value. User can place multiple blocks freely on screen. Same data source as Advanced Panel but freeform layout. |

### STREAMING / BROADCAST OVERLAYS

| Overlay | Status | Description |
|---|---|---|
| **Heart Rate** | [NEW] | Displays driver heart rate BPM if a compatible heart rate monitor is connected (Garmin/Polar via SDK or manual BPM input). Shows current BPM and a small rolling chart. If no HRM connected, shows placeholder/disabled state gracefully. |
| **G-Force Meter** | [NEW] | Real-time lateral and longitudinal G-force display. Circular plot with a dot showing current G vector. Shows peak G markers. Uses iRacing lateral/longitudinal acceleration data. |
| **Digiflag** | [NEW] | Large, stylised flag display designed for streaming and content. Bigger and more visual than the standard Flags overlay. Fills more screen area. Suited for broadcast graphics. |
| **Pitbox Helper** | [NEW] | Pit lane delta timer and pit box entry guide. Shows: delta to speed limiter engage point, current pit lane speed, pit speed limit, lollipop-style stop/go indicator. |

---

## IMPLEMENTATION APPROACH

### Step 1: Audit existing structure
Before writing anything, read and map:
- The existing overlay component file structure
- How overlays are registered/routed
- The IPC data schema (what fields C# currently sends)
- The overlay window management system (how overlays open/close/position)

### Step 2: Extend the C# data bridge
Add the following new data fields to the iRacing shared memory reader. **Do not remove any existing fields.** New fields needed (group by priority):

**Priority 1 - most overlays need these:**
- Session flags (full flag enum)
- All car radar proximity data (relative positions, angles)
- Weather: air temp, track temp, wind speed, wind direction, track surface condition
- Session type (race/qualify/practice), time remaining, laps remaining
- Per-lap history array (lap times, fuel used per lap)
- Delta to best lap (session best, personal best, last lap)

**Priority 2 - specific overlays:**
- Boost/ERS remaining and recharge (already in iRacing SDK - `dcBrakeBias`, `EnergyERSBatteryPct`, `EnergyMGU_KLapDeployPct`)
- G-force lateral and longitudinal (`LatAccel`, `LonAccel`)
- Pit road speed, speed limiter active, in pit lane flag
- Class-based car data for multiclass (already partially available)

**Priority 3 - streaming specific:**
- Heart rate: external input only (no SDK source) - build as manual input or ANT+ hook

### Step 3: Build each new overlay
For each [NEW] overlay:
- Create a new React component file following the exact naming pattern of existing overlays
- Use only data fields that exist in the bridge schema (after Step 2)
- Build with the existing CSS variable system for theming
- Register into the overlay list/router
- Include a settings panel matching the existing settings UI pattern

### Step 4: Do not build a layout system yet
Do not build layout management (Racelab's "Layouts vs Overlays" feature) in this task. Overlays can be individually opened/positioned. Layout system is a future feature.

---

## QUALITY BAR

Each overlay must:
- Work correctly when iRacing is not running (show placeholder/demo state, not crash)
- Handle missing data fields gracefully (null checks on all telemetry values)
- Be draggable/repositionable using the existing overlay drag system
- Support the existing lock/unlock mechanism
- Respect the existing opacity/transparency controls if the system has them

---

## DO NOT DO

- Do not generate placeholder "lorem ipsum" overlays with hardcoded fake data as the final product
- Do not restructure the Vite/Electron build config
- Do not touch iRacing .ibt telemetry parsing (track map data) - that system is working
- Do not add a new state management library - use whatever pattern existing overlays use
- Do not add a new styling system - match existing CSS exactly
- Do not build the subscription/paywall system in this task
