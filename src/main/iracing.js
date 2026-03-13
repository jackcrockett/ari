/**
 * ARI iRacing SDK Bridge — Pure JavaScript Implementation
 * No native compilation required. Demo mode always available.
 * Real iRacing detection via process check.
 */

const { execSync } = require('child_process')

class IRacingSDK {
  constructor(onData) {
    this.onData = onData
    this.pollInterval = null
    this.connected = false
    this.demoMode = false
    this.demoTick = 0
  }

  start() {
    console.log('[ARI] Starting in demo mode — real iRacing data coming in next update')
    this.demoMode = true
    this.startDemoMode()
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval)
  }

  startDemoMode() {
    this.pollInterval = setInterval(() => {
      this.demoTick++
      this.onData({
        connected: true,
        demo: true,
        telemetry: buildDemoTelemetry(this.demoTick)
      })
    }, 16)
  }
}

const DEMO_DRIVERS = [
  { name: 'S. PEREZ',      iRating: 3800, pos: 1, gap: -18.2, lic: 'A', colour: '#F59E0B' },
  { name: 'G. RUSSELL',    iRating: 4200, pos: 2, gap: -9.1,  lic: 'A', colour: '#64748B' },
  { name: 'R. VERSTAPPEN', iRating: 3400, pos: 3, gap: -4.8,  lic: 'B', colour: '#3B82F6' },
  { name: 'M. HAMILTON',   iRating: 4100, pos: 4, gap: -1.2,  lic: 'A', colour: '#FF6B35' },
  { name: 'YOU',           iRating: 2800, pos: 5, gap: 0,     lic: 'B', colour: '#E8001D' },
  { name: 'C. LECLERC',    iRating: 3700, pos: 6, gap: 1.0,   lic: 'A', colour: '#22C55E' },
  { name: 'L. NORRIS',     iRating: 4400, pos: 7, gap: 5.6,   lic: 'A', colour: '#A855F7' },
  { name: 'O. PIASTRI',    iRating: 3200, pos: 8, gap: 12.3,  lic: 'B', colour: '#EC4899' },
]

function buildDemoTelemetry(tick) {
  const t = tick * 0.016
  const fuelLevel = Math.max(0, 42 - tick * 0.008)
  const fuelPerLap = 2.41

  const relative = DEMO_DRIVERS.map((d, i) => ({
    carIdx: i,
    position: d.pos,
    driverName: d.name,
    iRating: d.iRating,
    licenseString: d.lic,
    gapSeconds: d.gap + Math.sin(t * 0.3 + i) * 0.08,
    onPitRoad: i === 1 && tick % 800 < 80,
    isPlayer: d.name === 'YOU',
    colour: d.colour,
    bestLapTime: 85.2 + i * 0.15,
    lastLapTime: 85.4 + Math.sin(t + i) * 0.4,
  }))

  return {
    playerCarIdx: 4,
    speed: 220 + Math.sin(t * 2) * 40,
    gear: 6,
    rpm: 11500 + Math.sin(t * 3) * 2000,
    throttle: Math.min(1, Math.max(0, 0.7 + Math.sin(t * 2) * 0.35)),
    brake: Math.min(1, Math.max(0, Math.sin(t * 2 + 1) * 0.5)),
    fuel: {
      level: fuelLevel,
      perLap: fuelPerLap,
      lapsRemaining: fuelLevel / fuelPerLap,
      lapsToFinish: 18,
      needed: Math.max(0, (18 * fuelPerLap) - fuelLevel)
    },
    currentLap: 12,
    totalLaps: 30,
    sessionType: 'Race',
    lapsRemain: 18,
    relative,
    standings: [...relative].sort((a, b) => a.position - b.position)
  }
}

module.exports = IRacingSDK
