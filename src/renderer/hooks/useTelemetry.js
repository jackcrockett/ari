import { useState, useEffect, useRef, useContext } from 'react'
import { OverlayPreviewContext, PreviewTelemetryContext } from '../components/OverlayPreviewContext'

// ─── Demo data (browser / no Electron) ───────────────────────────────────────
const DEMO_DRIVERS = [
  { name: 'S. PEREZ',      iRating: 3800, pos: 1, gap: -18.2, lic: 'A' },
  { name: 'G. RUSSELL',    iRating: 4200, pos: 2, gap:  -9.1, lic: 'A' },
  { name: 'R. VERSTAPPEN', iRating: 3400, pos: 3, gap:  -4.8, lic: 'B' },
  { name: 'M. HAMILTON',   iRating: 4100, pos: 4, gap:  -1.2, lic: 'A' },
  { name: 'YOU',           iRating: 2800, pos: 5, gap:   0,   lic: 'B' },
  { name: 'C. LECLERC',    iRating: 3700, pos: 6, gap:   1.0, lic: 'A' },
  { name: 'L. NORRIS',     iRating: 4400, pos: 7, gap:   5.6, lic: 'A' },
  { name: 'O. PIASTRI',    iRating: 3200, pos: 8, gap:  12.3, lic: 'B' },
]

export const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

export function buildDemoData(tick) {
  const t = tick * 0.016
  const fuelLevel  = Math.max(0, 42 - tick * 0.008)
  const fuelPerLap = 2.41
  const lapPhase   = (t * 0.08) % (Math.PI * 2)
  const rawT = Math.max(0, Math.sin(lapPhase) * 0.9 + 0.1 + Math.sin(lapPhase * 3) * 0.15)
  const rawB = Math.max(0, -Math.sin(lapPhase + 0.6) * 0.8 + Math.sin(lapPhase * 2.5 + 1) * 0.3)
  const throttle = Math.min(1, rawT * (rawB < 0.05 ? 1 : 0))
  const brake    = Math.min(1, rawB)
  const clutch   = tick % 180 < 8 ? (tick % 180) / 8 : 0
  const steering = Math.sin(lapPhase * 1.5) * 0.6
  const delta    = Math.sin(t * 0.4) * 0.35 + Math.sin(t * 0.13) * 0.15

  const relative = DEMO_DRIVERS.map((d, i) => {
    const gapToLeader = d.pos === 1 ? 0 : d.gap + 18.2
    return {
      carIdx: i, position: d.pos, driverName: d.name, iRating: d.iRating,
      licenseString: d.lic, gapSeconds: d.gap + Math.sin(t * 0.3 + i) * 0.08,
      onPitRoad: i === 1 && tick % 800 < 80, isPlayer: d.name === 'YOU',
      colour: DRIVER_COLOURS[i], bestLapTime: 85.2 + i * 0.15,
      lastLapTime: 85.4 + Math.sin(t + i) * 0.4,
      lapDistPct: ((i * 0.12) + t * 0.0008) % 1, isFastestLap: i === 2,
      currentLap: 12, lapsCompleted: 11, classPosition: d.pos, trackSurface: 5,
      tyreCompoundRaw: 1, pitStopCount: i === 1 && tick % 800 < 80 ? 1 : 0, fastRepairsUsed: 0,
      estimatedLapTime: 85.2 + i * 0.15, incidentCount: 0, teamName: '', qualifyPosition: d.pos,
      gapToLeader, intervalToNext: i === 0 ? null : 1.2 + Math.sin(t + i) * 0.3, positionsGained: 0,
    }
  })

  return {
    connected: true, demo: true,
    telemetry: {
      playerCarIdx: 4,
      speed: 220 + Math.sin(t * 2) * 40,
      gear: Math.floor(3 + Math.abs(Math.sin(lapPhase * 0.7)) * 4),
      rpm: 11500 + Math.sin(t * 3) * 2000,
      throttle, brake, clutch, steering, delta, tyreCompound: 'M',
      fuel: { level: fuelLevel, perLap: fuelPerLap, lapsRemaining: fuelLevel / fuelPerLap, lapsToFinish: 18, needed: Math.max(0, (18 * fuelPerLap) - fuelLevel) },
      fuelPct: Math.round(fuelLevel / 42 * 100),
      currentLap: 12, totalLaps: 30, sessionType: 'Race', lapsRemain: 18,
      pitSpeedLimit: 60,
      trackTemp: 34.2, airTemp: 22.5, windSpeed: 8.4, windDir: 215, skies: 'Partly Cloudy',
      sessionFlags: 0x04, sessionTimeRemain: Math.max(0, 1800 - tick * 0.5),
      latAccel: Math.sin(lapPhase * 2) * 2.8, lonAccel: Math.cos(lapPhase) * 1.5,
      ersRemaining: 0.7, ersDeployPct: 0.35,
      onPitRoad: false, isInGarage: false, isOnTrack: true,
      relative, standings: [...relative].sort((a, b) => a.position - b.position)
    }
  }
}

// ─── WebSocket URL detection ──────────────────────────────────────────────────
// Checks window.__ARI_WS__ (injected by httpServer.js) or ?ws= query param.
function getWsUrl() {
  if (typeof window === 'undefined') return null
  if (window.__ARI_WS__) return window.__ARI_WS__
  const param = new URLSearchParams(window.location.search).get('ws')
  if (!param) return null
  return param.startsWith('ws') ? param : `ws://${param}/telemetry`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTelemetry() {
  // All hooks must be called unconditionally — React rules.
  // isPreview/previewData determine whether we use the shared preview data
  // or subscribe to the real IPC telemetry channel.
  const isPreview   = useContext(OverlayPreviewContext)
  const previewData = useContext(PreviewTelemetryContext)

  const [data,      setData]      = useState(null)
  const [connected, setConnected] = useState(false)
  const [isDemo,    setIsDemo]    = useState(false)
  const tickRef     = useRef(0)
  const intervalRef = useRef(null)
  const hasElectron = typeof window !== 'undefined' && window.ari
  const wsUrl       = getWsUrl()

  useEffect(() => {
    // Preview mode: data comes from PreviewTelemetryContext — no subscription needed.
    if (isPreview) return

    if (hasElectron) {
      // Electron — receive real/demo data from main process
      window.ari.onTelemetry((incoming) => {
        const isLive = incoming.connected && !incoming.demo
        setConnected(isLive)
        setIsDemo(!isLive)
        // Always render data — show demo visuals while waiting, live data when connected
        if (incoming.telemetry) setData(incoming.telemetry)
      })
      return () => window.ari.removeTelemetryListener()
    } else if (wsUrl) {
      // Remote WebSocket mode -- browser on second PC / phone connecting to ARI server
      let ws
      let reconnectTimer

      const connect = () => {
        ws = new WebSocket(wsUrl)

        ws.onopen    = () => console.log('[ARI] WS connected:', wsUrl)
        ws.onmessage = (e) => {
          try {
            const incoming = JSON.parse(e.data)
            const isLive = incoming.connected && !incoming.demo
            setConnected(isLive)
            setIsDemo(!isLive)
            if (incoming.telemetry) setData(incoming.telemetry)
          } catch (_) {}
        }
        ws.onclose = () => {
          setConnected(false)
          // Reconnect after 2s
          reconnectTimer = setTimeout(connect, 2000)
        }
        ws.onerror = () => ws.close()
      }

      connect()
      return () => {
        clearTimeout(reconnectTimer)
        if (ws) ws.close()
      }
    } else {
      // Browser — pure demo mode
      intervalRef.current = setInterval(() => {
        tickRef.current++
        const demo = buildDemoData(tickRef.current)
        setConnected(true)
        setIsDemo(true)
        setData(demo.telemetry)
      }, 16)
      return () => clearInterval(intervalRef.current)
    }
  }, [hasElectron, isPreview, wsUrl])

  // In preview mode, return the shared context data (hooks already ran above)
  if (isPreview) return { data: previewData, connected: true, isDemo: true }

  return { data, connected, isDemo }
}

export function formatGap(seconds) {
  if (seconds === 0) return '—'
  const abs  = Math.abs(seconds)
  const sign = seconds > 0 ? '+' : '-'
  if (abs >= 60) {
    const m = Math.floor(abs / 60)
    const s = (abs % 60).toFixed(1)
    return `${sign}${m}:${s.padStart(4,'0')}`
  }
  return `${sign}${abs.toFixed(3)}`
}

export function formatLapTime(seconds) {
  if (!seconds || seconds < 0) return '–:––.–––'
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(3)
  return `${m}:${s.padStart(6,'0')}`
}

// iRacing license tier colours — background colour for the licence badge pill
// R=Rookie (red), D (orange), C (yellow), B (green), A (blue), P/WC (black)
export function licenseColor(lic) {
  const map = {
    R:  '#C11010',  // Rookie  — red
    D:  '#D46B08',  // Class D — orange
    C:  '#B8900A',  // Class C — amber/gold
    B:  '#1E8A28',  // Class B — green
    A:  '#1A5FA8',  // Class A — blue
    P:  '#2A2A2A',  // Pro     — near-black
    WC: '#2A2A2A',  // Pro WC  — near-black
  }
  return map[lic] || '#444'
}

// For Class C (yellow bg) use dark text; all others use white
export function licenseTextColor(lic) {
  return lic === 'C' ? '#1a1a00' : '#ffffff'
}
