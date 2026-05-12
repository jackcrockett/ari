// Shared overlay metadata — used by OverlaysPage, LayoutsPage, and ControlPanel shell

export const OVERLAY_GROUPS = [
  {
    label: 'Driving',
    overlays: [
      { id: 'relative',      label: 'Relative',        description: 'Cars ahead & behind with gap times' },
      { id: 'battle',        label: 'Battle',          description: 'Cars within 2s — closing/opening indicators' },
      { id: 'radar',         label: 'Radar',           description: 'Proximity radar — close cars around you' },
      { id: 'blindspot',     label: 'Blind Spot',      description: 'Left/right indicator when a car is alongside' },
      { id: 'flags',         label: 'Flags',           description: 'Current race flag status' },
      { id: 'delta',         label: 'Delta',           description: 'Lap time delta bar vs reference lap' },
      { id: 'inputs',        label: 'Inputs',          description: 'Throttle, brake, steering & delta' },
      { id: 'gforce',        label: 'G-Force',         description: 'Lateral & longitudinal G-force plot' },
      { id: 'sessiontimer',  label: 'Session Timer',   description: 'Time or laps remaining in session' },
    ]
  },
  {
    label: 'Standings',
    overlays: [
      { id: 'standings',     label: 'Standings',       description: 'Full race order with gaps to leader' },
      { id: 'hstandings',    label: 'H. Standings',    description: 'Horizontal standings strip' },
      { id: 'leaderboard',   label: 'Leaderboard',     description: 'Broadcast-style top N leaderboard' },
      { id: 'headtohead',    label: 'Head to Head',    description: 'Side-by-side comparison vs pinned driver' },
      { id: 'overtakealert', label: 'Overtake Alert',  description: 'Faster class car closing alert' },
    ]
  },
  {
    label: 'Timing',
    overlays: [
      { id: 'laplog',        label: 'Lap Log',         description: 'Table of every completed lap' },
      { id: 'lapgraph',      label: 'Lap Graph',       description: 'Rolling lap time chart' },
      { id: 'laptimespread', label: 'Lap Spread',      description: 'Pace distribution across field' },
    ]
  },
  {
    label: 'Car & Strategy',
    overlays: [
      { id: 'fuel',          label: 'Fuel Calc',       description: 'Fuel usage, laps remaining, pit strategy' },
      { id: 'tyres',         label: 'Tyres',           description: 'Tyre temps, wear & pressure' },
      { id: 'boostbox',      label: 'Boost / ERS',     description: 'Boost/ERS remaining and deploy' },
      { id: 'raceschedule',  label: 'Pit Window',      description: 'Optimal pit lap range calculator' },
      { id: 'pitboxhelper',  label: 'Pitbox Helper',   description: 'Pit lane delta and speed limiter' },
    ]
  },
  {
    label: 'Track & Map',
    overlays: [
      { id: 'trackmap',      label: 'Track Map',       description: 'Live car positions on track' },
      { id: 'minimap',       label: 'Minimap',         description: 'Compact corner map' },
      { id: 'flatmap',       label: 'Flat Map',        description: 'Schematic track — no GPS needed' },
    ]
  },
  {
    label: 'Environment',
    overlays: [
      { id: 'weather',       label: 'Weather',         description: 'Track/air temp, wind, track state' },
    ]
  },
  {
    label: 'Data',
    overlays: [
      { id: 'advancedpanel', label: 'Advanced Panel',  description: 'Configurable multi-stat data panel' },
      { id: 'datablocks',    label: 'Data Blocks',     description: 'Individual freeform stat widgets' },
      { id: 'incident',      label: 'Incidents',       description: 'Driver incident counts sorted by severity' },
    ]
  },
  {
    label: 'Streaming',
    overlays: [
      { id: 'digiflag',      label: 'Digiflag',        description: 'Large broadcast-style flag display' },
      { id: 'heartrate',     label: 'Heart Rate',      description: 'Driver BPM with rolling chart' },
      { id: 'garagecover',   label: 'Garage Cover',    description: 'Full-screen ARI cover while in garage' },
    ]
  },
]

// Flat list of all overlays
export const OVERLAYS = OVERLAY_GROUPS.flatMap(g => g.overlays)

// Renderer-side copy of default overlay positions (matches main.js OVERLAY_DEFAULTS).
// Used for the LayoutsPage visual canvas.
export const OVERLAY_DEFAULTS_RENDERER = {
  relative:      { x: 20,   y: 100,  width: 420,  height: 350  },
  standings:     { x: 20,   y: 470,  width: 420,  height: 434  },
  fuel:          { x: 20,   y: 930,  width: 420,  height: 308  },
  trackmap:      { x: 460,  y: 100,  width: 308,  height: 358  },
  inputs:        { x: 460,  y: 478,  width: 504,  height: 112  },
  tyres:         { x: 854,  y: 100,  width: 350,  height: 504  },
  radar:         { x: 1232, y: 100,  width: 252,  height: 280  },
  headtohead:    { x: 460,  y: 632,  width: 420,  height: 294  },
  flags:         { x: 924,  y: 588,  width: 294,  height: 154  },
  delta:         { x: 460,  y: 980,  width: 504,  height: 98   },
  lapgraph:      { x: 1232, y: 420,  width: 420,  height: 252  },
  laplog:        { x: 1232, y: 686,  width: 392,  height: 350  },
  sessiontimer:  { x: 924,  y: 434,  width: 294,  height: 154  },
  overtakealert: { x: 784,  y: 770,  width: 392,  height: 106  },
  blindspot:     { x: 812,  y: 966,  width: 224,  height: 120  },
  boostbox:      { x: 1232, y: 1050, width: 280,  height: 154  },
  weather:       { x: 924,  y: 756,  width: 280,  height: 182  },
  raceschedule:  { x: 20,   y: 1176, width: 420,  height: 210  },
  hstandings:    { x: 20,   y: 1414, width: 1344, height: 112  },
  leaderboard:   { x: 1652, y: 100,  width: 392,  height: 588  },
  flatmap:       { x: 1652, y: 742,  width: 280,  height: 280  },
  minimap:       { x: 1652, y: 1036, width: 210,  height: 210  },
  laptimespread: { x: 1232, y: 1050, width: 392,  height: 154  },
  advancedpanel: { x: 460,  y: 1008, width: 504,  height: 280  },
  datablocks:    { x: 460,  y: 1302, width: 308,  height: 140  },
  heartrate:     { x: 924,  y: 952,  width: 224,  height: 140  },
  gforce:        { x: 1498, y: 100,  width: 252,  height: 280  },
  digiflag:      { x: 784,  y: 588,  width: 448,  height: 266  },
  pitboxhelper:  { x: 784,  y: 952,  width: 364,  height: 154  },
  incident:      { x: 20,   y: 280,  width: 308,  height: 308  },
  battle:        { x: 460,  y: 100,  width: 392,  height: 308  },
  garagecover:   { x: 784,  y: 364,  width: 588,  height: 448  },
}
