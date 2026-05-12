/**
 * ARI iRacing Bridge — PowerShell MMF reader + pure JS telemetry parser
 * Zero npm dependencies. Uses powershell.exe (built into Windows) to read
 * iRacing's memory-mapped file directly via .NET APIs — no exe compiled,
 * no files written to disk, nothing for Windows Defender to flag.
 */

const { spawn } = require('child_process')

// Builds a base64-encoded PowerShell -EncodedCommand that reads the iRacing MMF
// and pipes binary frames to stdout. Pure PowerShell .NET API calls — no Add-Type,
// no temp files, no compiled assemblies.
function buildPsEncodedCommand() {
  const lines = [
    '$out = [Console]::OpenStandardOutput()',
    'function wz { try { $out.Write([byte[]]@(0,0,0,0),0,4); $out.Flush() } catch {} }',
    '$buf = New-Object byte[] 1200000',
    'while ($true) {',
    '  try {',
    '    $mmf = [System.IO.MemoryMappedFiles.MemoryMappedFile]::OpenExisting("IRSDKMemMapFileName")',
    '    while ($true) {',
    '      try {',
    '        $view = $mmf.CreateViewStream()',
    '        $n = $view.Read($buf, 0, $buf.Length)',
    '        $view.Dispose()',
    '        if ($n -lt 112) { wz; Start-Sleep -Milliseconds 500; break }',
    '        $st = [BitConverter]::ToInt32($buf, 4)',
    '        if ($st -ne 1) { wz; Start-Sleep -Milliseconds 500; break }',
    '        $out.Write([BitConverter]::GetBytes([int32]$n), 0, 4)',
    '        $out.Write($buf, 0, $n)',
    '        $out.Flush()',
    '        Start-Sleep -Milliseconds 16',
    '      } catch { break }',
    '    }',
    '    $mmf.Dispose()',
    '  } catch { wz; Start-Sleep -Milliseconds 2000 }',
    '}',
  ]
  const script = lines.join('\n')
  return Buffer.from(script, 'utf16le').toString('base64')
}

// ─── iRacing memory map constants ─────────────────────────────────────────────
const OFF_SESSION_INFO_UPDATE = 12
const OFF_SESSION_INFO_LEN    = 16
const OFF_SESSION_INFO_OFFSET = 20
const OFF_NUM_VARS            = 24
const OFF_VAR_HEADER          = 28
const OFF_BUF_COUNT           = 32
const OFF_VAR_BUF             = 48
const VAR_BUF_STRIDE          = 16
const VAR_HEADER_STRIDE       = 144
const OFF_VH_TYPE             = 0
const OFF_VH_OFFSET           = 4
const OFF_VH_NAME             = 16
const TYPE_SIZE               = [1, 1, 4, 4, 4, 8]

function buildVarMap(buf) {
  const numVars   = buf.readInt32LE(OFF_NUM_VARS)
  const varHeader = buf.readInt32LE(OFF_VAR_HEADER)
  const map = {}
  for (let i = 0; i < numVars; i++) {
    const base = varHeader + i * VAR_HEADER_STRIDE
    if (base + VAR_HEADER_STRIDE > buf.length) break
    const type   = buf.readInt32LE(base + OFF_VH_TYPE)
    const offset = buf.readInt32LE(base + OFF_VH_OFFSET)
    const name   = buf.slice(base + OFF_VH_NAME, base + OFF_VH_NAME + 32)
                      .toString('utf8').replace(/\0[\s\S]*$/, '').trim()
    if (name) map[name] = { type, offset }
  }
  const bufCount = Math.min(4, buf.readInt32LE(OFF_BUF_COUNT))
  let bestTick = -1, dataOffset = 0
  for (let i = 0; i < bufCount; i++) {
    const base = OFF_VAR_BUF + i * VAR_BUF_STRIDE
    if (base + 8 > buf.length) break
    const tick   = buf.readInt32LE(base)
    const offset = buf.readInt32LE(base + 4)
    if (tick > bestTick) { bestTick = tick; dataOffset = offset }
  }
  return { map, dataOffset }
}

function rv(buf, map, dataOffset, name, idx) {
  idx = idx || 0
  const v = map[name]
  if (!v) return undefined
  const sz  = TYPE_SIZE[v.type]
  const pos = dataOffset + v.offset + idx * sz
  if (pos + sz > buf.length) return undefined
  switch (v.type) {
    case 0: return buf.readUInt8(pos)
    case 1: return buf.readUInt8(pos) !== 0
    case 2: return buf.readInt32LE(pos)
    case 3: return buf.readUInt32LE(pos)
    case 4: return buf.readFloatLE(pos)
    case 5: return buf.readDoubleLE(pos)
  }
}

function ra(buf, map, dataOffset, name, len) {
  const out = []
  for (let i = 0; i < len; i++) out.push(rv(buf, map, dataOffset, name, i))
  return out
}

function parseSessionYaml(yaml) {
  const result = { drivers: [], sessions: [], trackName: '', trackId: '', qualifyPositions: {}, pitSpeedLimit: 0 }
  result.trackName = (yaml.match(/TrackDisplayName:\s*(.+)/) || [])[1] || ''
  result.trackName = result.trackName.trim().replace(/^'|'$/g, '')
  result.trackId           = (yaml.match(/TrackID:\s*(\d+)/) || [])[1] || ''
  result.trackInternalName = ((yaml.match(/\n\s*TrackName:\s*([^\n\r]+)/) || [])[1] || '').trim().replace(/^'|'$/g, '')
  result.trackConfigName   = ((yaml.match(/\n\s*TrackConfigName:\s*([^\n\r]*)/) || [])[1] || '').trim().replace(/^'|'$/g, '')
  // DriverUserName is always present and is the current player's name
  result.playerUserName = (yaml.match(/DriverUserName:\s*(.+)/) || [])[1] || ''
  result.playerUserName = result.playerUserName.trim().replace(/^'|'$/g, '')
  const sessMatches = [...yaml.matchAll(/SessionNum:\s*(\d+)[\s\S]*?SessionType:\s*(\S+)/g)]
  sessMatches.forEach(m => { result.sessions[parseInt(m[1])] = m[2].trim() })

  // Pit speed limit from TrackInfo section (value is in kph)
  const pitSpeedMatch = yaml.match(/TrackPitSpeedLimit:\s*([\d.]+)\s*kph/)
  result.pitSpeedLimit = pitSpeedMatch ? parseFloat(pitSpeedMatch[1]) : 0

  // Qualify starting positions: { carIdx -> 1-indexed start position }
  const qualifyPositions = {}
  const qSection = (yaml.match(/QualifyResultsInfo:[\s\S]*?Results:\s*([\s\S]*?)(?=\n[A-Z]|\s*$)/) || [])[1]
  if (qSection) {
    qSection.split(/\n\s*- /).slice(1).forEach(function(block) {
      const posVal    = parseInt((block.match(/Position:\s*(\d+)/) || [])[1])
      const carIdxVal = parseInt((block.match(/CarIdx:\s*(\d+)/)   || [])[1])
      if (!isNaN(posVal) && !isNaN(carIdxVal)) qualifyPositions[carIdxVal] = posVal + 1
    })
  }
  result.qualifyPositions = qualifyPositions

  // Split on each driver entry — handles both first entry and subsequent entries
  const driversSection = (yaml.match(/Drivers:\s*\n([\s\S]*?)(?:\n\w|$)/) || [])[1] || ''
  // Each driver block starts with " - CarIdx:" or "   CarIdx:" for first entry
  const blocks = yaml.split('- CarIdx:').slice(1)
  blocks.forEach(block => {
    const g = k => {
      const match = block.match(new RegExp(k + ':\\s*([^\\n]+)'))
      return match ? match[1].trim().replace(/^'|'$/g, '') : ''
    }
    const idx = parseInt(g('CarIdx'))
    if (!isNaN(idx) && idx >= 0 && idx < 64) {
      result.drivers[idx] = {
        carIdx:        idx,
        userName:      g('UserName'),
        carNumber:     g('CarNumber'),
        iRating:       parseInt(g('IRating')) || 1500,
        licString:     g('LicString'),
        carClassId:    parseInt(g('CarClassID')) || 0,
        carClass:      g('CarClassShortName') || '',
        isSpectator:   g('IsSpectator') === '1',
        incidentCount: parseInt(g('CurDriverIncidentCount')) || 0,
        teamName:      g('TeamName'),
      }
    }
  })
  return result
}

const CAR_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899','#06B6D4','#84CC16','#F97316','#8B5CF6']

function buildTelemetry(buf, session) {
  const vm = buildVarMap(buf)
  const m  = vm.map, d = vm.dataOffset
  const r  = (n, i) => rv(buf, m, d, n, i)
  const arr = (n, l) => ra(buf, m, d, n, l)

  const MAX = 64
  const playerCarIdx = r('PlayerCarIdx') || 0
  const lapDistPct   = arr('CarIdxLapDistPct',  MAX)
  const carPos       = arr('CarIdxPosition',    MAX)
  const onPit        = arr('CarIdxOnPitRoad',   MAX)
  const f2Time       = arr('CarIdxF2Time',      MAX)
  const estTime      = arr('CarIdxEstTime',     MAX)
  const lastLap      = arr('CarIdxLastLapTime', MAX)
  const bestLap      = arr('CarIdxBestLapTime', MAX)
  const playerF2     = f2Time[playerCarIdx] || 0
  const playerEst    = estTime[playerCarIdx] || 90

  const carLap         = arr('CarIdxLap',            MAX)
  const carLapComplete = arr('CarIdxLapCompleted',    MAX)
  const classPos       = arr('CarIdxClassPosition',   MAX)
  const carTrackSurf   = arr('CarIdxTrackSurface',    MAX)
  const carTyreComp    = arr('CarIdxTireCompound',    MAX)
  const carPitStops    = arr('CarIdxPitStopCount',    MAX)
  const carFastRepairs = arr('CarIdxFastRepairsUsed', MAX)

  const driverList = []
  const drivers = (session && session.drivers) ? session.drivers : []

  // If YAML parse missed the player entry, create one using DriverUserName from session YAML
  // Debug: log track ID once so we can add it to the shape database
  if (!buildTelemetry._trackLogged && session) {
    buildTelemetry._trackLogged = true
      }

  if (!drivers[playerCarIdx] || !drivers[playerCarIdx].userName) {
    const playerName = (session && session.playerUserName) || 'You'
    drivers[playerCarIdx] = {
      carIdx:      playerCarIdx,
      userName:    playerName,
      iRating:     1500,
      licString:   'B',
      isSpectator: false,
    }
  }

  for (let i = 0; i < MAX; i++) {
    const info = drivers[i]
    if (!info || info.isSpectator || !info.userName) continue
    const pos = carPos[i]
    const isPlayer = i === playerCarIdx
    // In practice CarIdxPosition is 0 for all cars — include any car that is
    // in-world (trackSurface != -1) or has posted at least one lap.
    // Only skip cars that have no position AND no presence in the session.
    // Include all registered drivers (those with userName from YAML).
    // Empty/phantom slots are already excluded by the !info.userName check above.
    driverList.push({
      carIdx:           i,
      position:         pos || 1,
      driverName:       info.userName,
      carNumber:        info.carNumber || String(i),
      iRating:          info.iRating,
      licenseString:    ((info.licString || 'D').match(/[A-Z]+/) || ['D'])[0],
      safetyRating:     parseFloat((info.licString || '').match(/[\d.]+/) || [null]) || null,
      carClassId:       info.carClassId || 0,
      carClass:         info.carClass || '',
      gapSeconds:       (f2Time[i] || 0) - playerF2,
      onPitRoad:        onPit[i] || false,
      isPlayer:         isPlayer,
      colour:           isPlayer ? '#E8001D' : CAR_COLOURS[i % CAR_COLOURS.length],
      bestLapTime:      bestLap[i] || 0,
      lastLapTime:      lastLap[i] || 0,
      lapDistPct:       lapDistPct[i] || 0,
      isFastestLap:     false,
      // new fields added in v0.6
      currentLap:       carLap[i]          != null ? carLap[i]          : 0,
      lapsCompleted:    carLapComplete[i]   != null ? carLapComplete[i]  : 0,
      classPosition:    classPos[i]         != null ? classPos[i]        : 0,
      trackSurface:     carTrackSurf[i]     != null ? carTrackSurf[i]    : -1,
      tyreCompoundRaw:  carTyreComp[i]      || 0,
      pitStopCount:     carPitStops[i]      || 0,
      fastRepairsUsed:  carFastRepairs[i]   || 0,
      estimatedLapTime: estTime[i]          || 0,
      incidentCount:    info.incidentCount   || 0,
      teamName:         info.teamName        || '',
      qualifyPosition:  (session && session.qualifyPositions && session.qualifyPositions[i]) || null,
      // computed after standings sort (set below)
      gapToLeader:      0,
      intervalToNext:   null,
      positionsGained:  null,
    })
  }

  const withBest = driverList.filter(function(x) { return x.bestLapTime > 0 })
  if (withBest.length) {
    withBest.reduce(function(a, b) { return a.bestLapTime < b.bestLapTime ? a : b }).isFastestLap = true
  }

  const standings = driverList.slice().sort(function(a, b) {
    if (a.position !== b.position) return a.position - b.position
    // Practice: all positions are 0 — sort by best lap time (faster first, no-lap last)
    if (a.bestLapTime > 0 && b.bestLapTime > 0) return a.bestLapTime - b.bestLapTime
    if (a.bestLapTime > 0) return -1
    if (b.bestLapTime > 0) return 1
    return a.carIdx - b.carIdx
  })
  // In practice (all pos 0), assign sequential positions so overlays display correctly
  const allPosZero = standings.length > 0 && standings.every(function(d) { return !d.position || d.position <= 0 })
  if (allPosZero) standings.forEach(function(d, i) { d.position = i + 1 })
  const byGap     = driverList.slice().sort(function(a, b) { return a.gapSeconds - b.gapSeconds })

  // Compute gapToLeader and intervalToNext (mutates shared driver objects; visible in relative too)
  const leaderF2 = standings.length > 0 ? (f2Time[standings[0].carIdx] || 0) : 0
  standings.forEach(function(driver, i) {
    driver.gapToLeader    = (f2Time[driver.carIdx] || 0) - leaderF2
    driver.intervalToNext = i === 0 ? null : driver.gapToLeader - standings[i - 1].gapToLeader
  })
  // positionsGained: qualify start position minus current race position (positive = moved forward)
  const qPos = (session && session.qualifyPositions) || {}
  standings.forEach(function(driver) {
    const startPos = qPos[driver.carIdx]
    driver.positionsGained = startPos != null ? startPos - driver.position : null
  })

  // In solo sessions, driverList may only contain the player — ensure relative always includes them
  let relative
  const pIdx = byGap.findIndex(function(x) { return x.isPlayer })
  if (pIdx === -1) {
    // Player not in byGap — solo session, just show player
    const playerEntry = driverList.find(function(x) { return x.isPlayer })
    relative = playerEntry ? [playerEntry] : []
  } else {
    relative = byGap.slice(Math.max(0, pIdx - 2), pIdx + 3)
  }
  // Safety: if relative is empty but player exists, add them
  const playerEntry = driverList.find(function(x) { return x.isPlayer })
  if (relative.length === 0 && playerEntry) relative = [playerEntry]
  if (standings.length === 0 && playerEntry) standings.push(playerEntry)

  // Player world position — iRacing exposes X/Y/Z only for the player car
  // Debug: log once to confirm variables exist
  const playerX          = r('X')   // world X position in metres
  const playerZ          = r('Z')   // world Z position in metres (horizontal plane)
  const playerLapDistPct = lapDistPct[playerCarIdx] || 0
  if (!buildTelemetry._xzLogged) {
    buildTelemetry._xzLogged = true
    }

  // Single position sample for track map building
  const carPositions = (playerX != null && playerZ != null && playerX !== 0)
    ? [{ carIdx: playerCarIdx, pct: playerLapDistPct, x: playerX, z: playerZ }]
    : []

  // ─── Tyre Data ────────────────────────────────────────────────────────────
  const tyreCompound = r('PlayerTireCompound') || 0

  // Temperature: L/M/R zones across tread (°C)
  const tyres = {
    LF: {
      tempL: r('LFtempL'), tempM: r('LFtempM'), tempR: r('LFtempR'),
      wearL: r('LFwearL'), wearM: r('LFwearM'), wearR: r('LFwearR'),
      pressure: r('LFpressure'),
    },
    RF: {
      tempL: r('RFtempL'), tempM: r('RFtempM'), tempR: r('RFtempR'),
      wearL: r('RFwearL'), wearM: r('RFwearM'), wearR: r('RFwearR'),
      pressure: r('RFpressure'),
    },
    LR: {
      tempL: r('LRtempL'), tempM: r('LRtempM'), tempR: r('LRtempR'),
      wearL: r('LRwearL'), wearM: r('LRwearM'), wearR: r('LRwearR'),
      pressure: r('LRpressure'),
    },
    RR: {
      tempL: r('RRtempL'), tempM: r('RRtempM'), tempR: r('RRtempR'),
      wearL: r('RRwearL'), wearM: r('RRwearM'), wearR: r('RRwearR'),
      pressure: r('RRpressure'),
    },
  }

  const lastLapTime  = r('LapLastLapTime')  || 0
  const bestLapTime  = r('LapBestLapTime')  || 0

  const fuelLevel   = r('FuelLevel')      || 0
  const fuelPct     = Math.round((r('FuelLevelPct') || 0) * 100)
  const fuelPerHour = r('FuelUsePerHour') || 0
  const fuelPerLap  = fuelPerHour > 0 ? (fuelPerHour / 3600) * playerEst : 0
  const totalLaps   = r('SessionLapsTotal') || 0
  const currentLap  = r('Lap') || 0
  const lapsRemain  = Math.max(0, totalLaps - currentLap)
  const sessionNum  = r('SessionNum') || 0
  const steerRad    = r('SteeringWheelAngle') || 0
  const sessionType = (session && session.sessions && session.sessions[sessionNum]) || 'Race'

  return {
    playerCarIdx,
    speed:    Math.round((r('Speed') || 0) * 3.6),
    gear:     r('Gear')  || 0,
    rpm:      Math.round(r('RPM') || 0),
    throttle: Math.min(1, Math.max(0, r('Throttle') || 0)),
    brake:    Math.min(1, Math.max(0, r('Brake')  !== undefined ? r('Brake')  : 0)),
    clutch:   Math.min(1, Math.max(0,      r('Clutch') !== undefined ? r('Clutch') : 0)),
    steering: Math.max(-1, Math.min(1, -steerRad / (Math.PI * 0.75))),  // negated: iRacing positive=left
    delta:    r('LapDeltaToBestLap_OK') ? (r('LapDeltaToBestLap') || 0) : 0,
    tyreCompound: r('PlayerTireCompound') != null ? r('PlayerTireCompound') : 0,
    fuelPct,
    fuel: {
      level:         fuelLevel,
      perLap:        fuelPerLap,
      lapsRemaining: fuelPerLap > 0 ? fuelLevel / fuelPerLap : 0,
      lapsToFinish:  lapsRemain,
      needed:        fuelPerLap > 0 ? Math.max(0, lapsRemain * fuelPerLap - fuelLevel) : 0,
    },
    currentLap,
    totalLaps,
    sessionType,
    lapsRemain,
    playerX:    playerX,
    lastLapTime: lastLapTime,
    bestLapTime: bestLapTime,
    tyres:      tyres,
    carPositions: carPositions,
    playerZ:    playerZ,
    playerLapDistPct: playerLapDistPct,
    trackName:          (session && session.trackName)         || '',
    trackId:            (session && session.trackId)           || '',
    trackInternalName:  (session && session.trackInternalName) || '',
    trackConfigName:    (session && session.trackConfigName)   || '',
    pitSpeedLimit: (session && session.pitSpeedLimit) || 0,
    trackTemp:  r('TrackTemp') || 0,
    airTemp:    r('AirTemp')   || 0,
    windSpeed:  r('WindVel')   || 0,
    windDir:    r('WindDir')   || 0,
    skies:      '',
    sessionFlags:      r('SessionFlags') || 0,
    sessionTimeRemain: r('SessionTimeRemain') != null ? r('SessionTimeRemain') : -1,
    latAccel:    (r('LatAccel') || 0) / 9.81,
    lonAccel:    (r('LonAccel') || 0) / 9.81,
    ersRemaining:  r('EnergyERSBatteryPct') != null ? r('EnergyERSBatteryPct') : null,
    ersDeployPct:  r('EnergyMGU_KLapDeployPct') != null ? r('EnergyMGU_KLapDeployPct') : null,
    onPitRoad:     r('OnPitRoad') || false,
    isInGarage:    r('IsInGarage') || false,
    isOnTrack:     r('IsOnTrack') || false,
    relative,
    standings,
  }
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_DRIVERS = [
  {name:'S. PEREZ',      iRating:3800, pos:1, gap:-18.2, lic:'A', colour:'#F59E0B'},
  {name:'G. RUSSELL',    iRating:4200, pos:2, gap:-9.1,  lic:'A', colour:'#64748B'},
  {name:'R. VERSTAPPEN', iRating:3400, pos:3, gap:-4.8,  lic:'B', colour:'#3B82F6'},
  {name:'M. HAMILTON',   iRating:4100, pos:4, gap:-1.2,  lic:'A', colour:'#FF6B35'},
  {name:'YOU',           iRating:2800, pos:5, gap:0,     lic:'B', colour:'#E8001D'},
  {name:'C. LECLERC',    iRating:3700, pos:6, gap:1.0,   lic:'A', colour:'#22C55E'},
  {name:'L. NORRIS',     iRating:4400, pos:7, gap:5.6,   lic:'A', colour:'#A855F7'},
  {name:'O. PIASTRI',    iRating:3200, pos:8, gap:12.3,  lic:'B', colour:'#EC4899'},
]

function buildDemoTelemetry(tick) {
  const t  = tick * 0.016
  const fl = Math.max(0, 42 - tick * 0.008)
  const fp = 2.41
  const lp = (t * 0.08) % (Math.PI * 2)
  const rT = Math.max(0, Math.sin(lp)*0.9 + 0.1 + Math.sin(lp*3)*0.15)
  const rB = Math.max(0, -Math.sin(lp+0.6)*0.8 + Math.sin(lp*2.5+1)*0.3)
  const relative = DEMO_DRIVERS.map(function(d, i) {
    const gapToLeader = d.pos === 1 ? 0 : d.gap + 18.2
    return {carIdx:i, position:d.pos, driverName:d.name, iRating:d.iRating, licenseString:d.lic, safetyRating:3.5+i*0.2,
      gapSeconds:d.gap+Math.sin(t*0.3+i)*0.08, onPitRoad:i===1&&tick%800<80,
      isPlayer:d.name==='YOU', colour:d.colour, bestLapTime:85.2+i*0.15,
      lastLapTime:85.4+Math.sin(t+i)*0.4, lapDistPct:((i*0.12)+t*0.0008)%1, isFastestLap:i===2,
      currentLap:12, lapsCompleted:11, classPosition:d.pos, trackSurface:5,
      tyreCompoundRaw:1, pitStopCount:i===1&&tick%800<80?1:0, fastRepairsUsed:0,
      estimatedLapTime:85.2+i*0.15, incidentCount:0, teamName:'', qualifyPosition:d.pos,
      gapToLeader:gapToLeader, intervalToNext:i===0?null:1.2+Math.sin(t+i)*0.3, positionsGained:0}
  })
  return {
    playerCarIdx:4, speed:220+Math.sin(t*2)*40,
    gear:Math.floor(3+Math.abs(Math.sin(lp*0.7))*4), rpm:11500+Math.sin(t*3)*2000,
    throttle:Math.min(1,rT*(rB<0.05?1:0)), brake:Math.min(1,rB),
    clutch:tick%180<8?(tick%180)/8:0, steering:Math.sin(lp*1.5)*0.6,
    delta:Math.sin(t*0.4)*0.35+Math.sin(t*0.13)*0.15, tyreCompound:'M',
    fuelPct:Math.round(fl/42*100),
    fuel:{level:fl,perLap:fp,lapsRemaining:fl/fp,lapsToFinish:18,needed:Math.max(0,(18*fp)-fl)},
    currentLap:12, totalLaps:30, sessionType:'Race', lapsRemain:18,
    pitSpeedLimit:60, trackTemp:34.2, airTemp:22.5, windSpeed:8.4, windDir:215, skies:'Partly Cloudy',
    sessionFlags:0x04, sessionTimeRemain:Math.max(0,1800-tick*0.5),
    latAccel:Math.sin(lp*2)*2.8, lonAccel:Math.cos(lp)*1.5,
    ersRemaining:0.7, ersDeployPct:0.35,
    onPitRoad:false, isInGarage:false,
    relative:relative, standings:relative.slice().sort(function(a,b){return a.position-b.position})
  }
}

// ─── SDK class ────────────────────────────────────────────────────────────────
class IRacingSDK {
  constructor(onData, opts = {}) {
    this.onData          = onData
    this.onBridgeStatus  = opts.onBridgeStatus || null
    this.demoMode        = true
    this.demoTick        = 0
    this.bridge          = null
    this.readBuf         = Buffer.alloc(0)
    this.sessionYaml     = ''
    this.sessionParsed   = null
    this.lastSessionVer  = -1
    this.pollInterval    = null
    this.bridgeStatus    = 'starting'
    this._bridgeStartMs  = 0
  }

  _setStatus(status) {
    this.bridgeStatus = status
    if (this.onBridgeStatus) this.onBridgeStatus(status)
  }

  start() {
    // Start demo ticker immediately — never blocks main process
    this.pollInterval = setInterval(() => {
      if (this.demoMode) {
        this.demoTick++
        this.onData({ connected: false, demo: true, telemetry: buildDemoTelemetry(this.demoTick) })
      }
    }, 16)

    // Start PowerShell bridge asynchronously so Electron IPC is never blocked
    setTimeout(() => this._startBridge(), 100)
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval)
    if (this.bridge) { try { this.bridge.kill() } catch(_) {} }
  }

  _startBridge() {
    if (this.bridge && !this.bridge.killed) return

    try {
      this._bridgeStartMs = Date.now()
      const encoded = buildPsEncodedCommand()
      this.bridge  = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
        windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      })
      this.readBuf = Buffer.alloc(0)
      this._setStatus('running')

      this.bridge.stdout.on('data', chunk => {
        this.readBuf = Buffer.concat([this.readBuf, chunk])
        this._processFrames()
      })

      this.bridge.stderr.on('data', chunk => {
        const msg = chunk.toString().trim()
        if (msg) console.log('[ARI bridge]', msg)
      })

      this.bridge.on('exit', code => {
        this.bridge   = null
        this.demoMode = true
        this._setStatus('disconnected')
        setTimeout(() => this._startBridge(), 2000)
      })

    } catch(e) {
      console.warn('[ARI] Bridge spawn failed:', e.message)
      this.bridge = null
      this.demoMode = true
      this._setStatus('disconnected')
      setTimeout(() => this._startBridge(), 5000)
    }
  }

  _processFrames() {
    while (this.readBuf.length >= 4) {
      const frameLen = this.readBuf.readUInt32LE(0)

      if (frameLen === 0) {
        this.demoMode = true
        this.readBuf  = this.readBuf.slice(4)
        continue
      }

      if (this.readBuf.length < 4 + frameLen) break

      const frame  = this.readBuf.slice(4, 4 + frameLen)
      this.readBuf = this.readBuf.slice(4 + frameLen)

      if (this.demoMode) {
              this.demoMode = false
      }

      // Refresh session YAML if version changed
      const sessionVer = frame.readInt32LE(OFF_SESSION_INFO_UPDATE)
      if (sessionVer !== this.lastSessionVer) {
        this.lastSessionVer = sessionVer
        const off = frame.readInt32LE(OFF_SESSION_INFO_OFFSET)
        const len = frame.readInt32LE(OFF_SESSION_INFO_LEN)
        if (off > 0 && len > 0 && off + len <= frame.length) {
          this.sessionYaml   = frame.slice(off, off + len).toString('utf8').replace(/\0[\s\S]*$/, '')
          this.sessionParsed = parseSessionYaml(this.sessionYaml)
          console.log('[ARI] Track: ' + this.sessionParsed.trackName)
        }
      }

      try {
        const telemetry = buildTelemetry(frame, this.sessionParsed)
        this.onData({ connected: true, demo: false, telemetry: telemetry })
      } catch(e) {
        console.error('[ARI] Parse error:', e.message)
      }
    }
  }
}

module.exports = IRacingSDK
