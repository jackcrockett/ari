import React, { useState, useEffect, useRef } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const CLOSING_PCT_PER_TICK = 0.0005  // faster class car closing at this rate
const SHOW_THRESHOLD_PCT   = 0.06    // show when within 6% behind player
const DISMISS_PCT          = 0.10    // dismiss when gap grows beyond this

export default function OvertakeAlertOverlay() {
  const { data } = useTelemetry()
  const [alert, setAlert] = useState(null)
  const prevPctsRef = useRef({})

  useEffect(() => {
    if (!data) return
    const drivers   = data.relative ?? []
    const player    = drivers.find(d => d.isPlayer)
    if (!player) return
    const playerPct = player.lapDistPct

    // Find faster-class cars closing from behind
    let closest = null
    let closestGap = Infinity

    drivers.forEach(d => {
      if (d.isPlayer) return
      // Skip same class (basic: different carClassId, or just use gapSeconds > 0 = behind)
      if (d.gapSeconds < -2) return // well ahead of player, not a threat

      let delta = playerPct - d.lapDistPct
      if (delta < 0) delta += 1
      if (delta > DISMISS_PCT) return // too far behind

      const prevPct  = prevPctsRef.current[d.carIdx] ?? d.lapDistPct
      const closing  = (d.lapDistPct - prevPct + 1) % 1 - (playerPct - prevPct + 1) % 1

      if (delta < SHOW_THRESHOLD_PCT && delta < closestGap) {
        closestGap = delta
        closest = { ...d, gapPct: delta, gapSeconds: d.gapSeconds }
      }
    })

    drivers.forEach(d => { prevPctsRef.current[d.carIdx] = d.lapDistPct })

    if (closest) {
      setAlert(closest)
    } else {
      setAlert(null)
    }
  }, [data])

  if (!alert) {
    return (
      <ResizeHandles overlayId="overtakealert">
        <div className="overlay" style={{ width: 268 }}>
          <DragHandle overlayId="overtakealert" label="Overtake Alert" />
          <div style={{ padding: '6px 10px 8px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            No cars closing
          </div>
        </div>
      </ResizeHandles>
    )
  }

  return (
    <ResizeHandles overlayId="overtakealert">
      <div className="overlay" style={{ width: 268, borderColor: 'rgba(245,158,11,0.4)' }}>
        <DragHandle overlayId="overtakealert" label="Overtake Alert" />
        <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.08)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: alert.colour, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>
            {alert.driverName}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F59E0B' }}>
            {Math.abs(alert.gapSeconds).toFixed(1)}s behind
          </span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 5px', borderRadius: 3 }}>
            CLOSING
          </span>
        </div>
      </div>
    </ResizeHandles>
  )
}
