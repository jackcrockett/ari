import { useState, useEffect, useRef } from 'react'

const DEMO_DRIVERS = [
  { name: 'S. PEREZ',      iRating: 3800, pos: 1, gap: -18.2, lic: 'A' },
  { name: 'G. RUSSELL',    iRating: 4200, pos: 2, gap: -9.1,  lic: 'A' },
  { name: 'R. VERSTAPPEN', iRating: 3400, pos: 3, gap: -4.8,  lic: 'B' },
  { name: 'M. HAMILTON',   iRating: 4100, pos: 4, gap: -1.2,  lic: 'A' },
  { name: 'YOU',           iRating: 2800, pos: 5, gap: 0,     lic: 'B' },
  { name: 'C. LECLERC',    iRating: 3700, pos: 6, gap: 1.0,   lic: 'A' },
  { name: 'L. NORRIS',     iRating: 4400, pos: 7, gap: 5.6,   lic: 'A' },
  { name: 'O. PIASTRI',    iRating: 3200, pos: 8, gap: 12.3,  lic: 'B' },
]

export const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

function buildDemoData(tick) {
  const t = tick * 0.016
  const fuelLevel = Math.max(0, 42 - tick * 0.008)
  const fuelPerLap = 2.41

  // Realistic-ish pedal pattern
  const lapPhase = (t * 0.08) % (Math.PI * 2)
  const rawThrottle = Math.max(0, Math.sin(lapPhase) * 0.9 + 0.1 + Math.sin(lapPhase * 3) * 0.15)
  const rawBrake    = Math.max(0, -Math.sin(lapPhase + 0.6) * 0.8 + Math.sin(lapPhase * 2.5 + 1) * 0.3)
  const throttle    = Math.min(1, rawThrottle * (rawBrake < 0.05 ? 1 : 0))
  const brake       = Math.min(1, rawBrake)
  const clutch      = tick % 180 < 8 ? (tick % 180) / 8 : 0
  const steering    = Math.sin(lapPhase * 1.5) * 0.6  // -1 to 1

  const delta = Math.sin(t * 0.4) * 0.35 + Math.sin(t * 0.13) * 0.15

  const relative = DEMO_DRIVERS.map((d, i) => ({
    carIdx: i,
    position: d.pos,
    driverName: d.name,
    iRating: d.iRating,
    licenseString: d.lic,
    gapSeconds: d.gap + Math.sin(t * 0.3 + i) * 0.08,
    onPitRoad: i === 1 && tick % 800 < 80,
    isPlayer: d.name === 'YOU',
    colour: DRIVER_COLOURS[i],
    bestLapTime: 85.2 + i * 0.15,
    lastLapTime: 85.4 + Math.sin(t + i) * 0.4,
    lapDistPct: ((i * 0.12) + t * 0.0008) % 1,
  }))

  return {
    connected: true,
    demo: true,
    telemetry: {
      playerCarIdx: 4,
      speed: 220 + Math.sin(t * 2) * 40,
      gear: Math.floor(3 + Math.abs(Math.sin(lapPhase * 0.7)) * 4),
      rpm: 11500 + Math.sin(t * 3) * 2000,
      throttle,
      brake,
      clutch,
      steering,
      delta,
      tyreCompound: 'M',
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
      trackTemp: 34.2,
      airTemp: 22.5,
      windSpeed: 8.4,
      windDir: 215,
      skies: 'Partly Cloudy',
      relative,
      standings: [...relative].sort((a, b) => a.position - b.position)
    }
  }
}

export function useTelemetry() {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  const tickRef = useRef(0)
  const intervalRef = useRef(null)
  const hasElectron = typeof window !== 'undefined' && window.ari

  useEffect(() => {
    if (hasElectron) {
      window.ari.onTelemetry((incoming) => {
        setConnected(incoming.connected)
        if (incoming.telemetry) setData(incoming.telemetry)
      })
      return () => window.ari.removeTelemetryListener()
    } else {
      intervalRef.current = setInterval(() => {
        tickRef.current++
        const demo = buildDemoData(tickRef.current)
        setConnected(true)
        setData(demo.telemetry)
      }, 16)
      return () => clearInterval(intervalRef.current)
    }
  }, [hasElectron])

  return { data, connected }
}

export function formatGap(seconds) {
  if (seconds === 0) return '—'
  const abs = Math.abs(seconds)
  const sign = seconds > 0 ? '+' : '-'
  if (abs >= 60) {
    const m = Math.floor(abs / 60)
    const s = (abs % 60).toFixed(1)
    return `${sign}${m}:${s.padStart(4, '0')}`
  }
  return `${sign}${abs.toFixed(3)}`
}

export function formatLapTime(seconds) {
  if (!seconds || seconds < 0) return '–:––.–––'
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(3)
  return `${m}:${s.padStart(6, '0')}`
}

export function licenseColor(lic) {
  const map = { R: '#AE2012', D: '#CA6702', C: '#EE9B00', B: '#94D2BD', A: '#0A9396', P: '#005F73', WC: '#9B2226' }
  return map[lic] || '#666'
}
