import React, { useState, useEffect, useRef } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const SHOW_THRESHOLD_PCT    = 0.06   // show when within 6% of lap behind player
const SHOW_THRESHOLD_DIFF   = 0.03   // tighter threshold for same-class cars
const DISMISS_PCT           = 0.10   // stop showing when gap grows beyond this
const CLOSING_SMOOTH_FRAMES = 30     // frames to smooth closing rate over (~0.5s)

export default function OvertakeAlertOverlay() {
  const { data } = useTelemetry()
  const [alert, setAlert] = useState(null)

  const prevPctsRef    = useRef({})
  const prevGapsRef    = useRef({})
  const closingBufRef  = useRef({})  // { carIdx: number[] } rolling buffer of gap deltas

  useEffect(() => {
    if (!data) return
    const drivers   = data.relative ?? []
    const player    = drivers.find(d => d.isPlayer)
    if (!player) return

    const playerPct     = player.lapDistPct
    const playerClassId = player.carClassId

    let closest    = null
    let closestGap = Infinity

    drivers.forEach(d => {
      if (d.isPlayer) return
      // Only cars physically on track
      if (d.trackSurface != null && d.trackSurface !== 5) return

      // How far behind the player (in lap fraction)
      let delta = playerPct - d.lapDistPct
      if (delta < 0)  delta += 1
      if (delta > DISMISS_PCT) return

      const isDifferentClass = playerClassId != null && d.carClassId != null
        && d.carClassId !== playerClassId
      // Wider alert window for multi-class; tighter for same-class
      const threshold = isDifferentClass ? SHOW_THRESHOLD_PCT : SHOW_THRESHOLD_DIFF
      if (delta > threshold) return

      // Closing rate: smooth over last CLOSING_SMOOTH_FRAMES gap deltas
      const prevGap  = prevGapsRef.current[d.carIdx] ?? d.gapSeconds
      const rawDelta = prevGap - d.gapSeconds   // positive = closing

      const buf = closingBufRef.current[d.carIdx] ?? []
      buf.push(rawDelta)
      if (buf.length > CLOSING_SMOOTH_FRAMES) buf.shift()
      closingBufRef.current[d.carIdx] = buf
      const avgDelta = buf.reduce((s, v) => s + v, 0) / buf.length
      // Convert to seconds-per-second: avgDelta is per-frame (16ms), so * 62.5
      const closingRateSps = avgDelta * 62.5

      if (delta < closestGap) {
        closestGap = delta
        closest = { ...d, gapPct: delta, closingRateSps, isDifferentClass }
      }
    })

    // Update previous state refs
    drivers.forEach(d => {
      prevPctsRef.current[d.carIdx] = d.lapDistPct
      prevGapsRef.current[d.carIdx] = d.gapSeconds
    })

    setAlert(closest)
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

  const isClosing  = alert.closingRateSps > 0.1
  const accentCol  = alert.isDifferentClass ? '#C084FC' : '#F59E0B'
  const accentBg   = alert.isDifferentClass ? 'rgba(192,132,252,0.08)' : 'rgba(245,158,11,0.08)'
  const accentBdr  = alert.isDifferentClass ? 'rgba(192,132,252,0.4)' : 'rgba(245,158,11,0.4)'

  return (
    <ResizeHandles overlayId="overtakealert">
      <div className="overlay" style={{ width: 268, borderColor: accentBdr }}>
        <DragHandle overlayId="overtakealert" label="Overtake Alert">
          {alert.isDifferentClass && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, color: '#C084FC', background: 'rgba(192,132,252,0.15)', padding: '2px 5px', borderRadius: 3 }}>
              P{alert.carClass || '2'}
            </span>
          )}
        </DragHandle>

        <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center', gap: 10, background: accentBg }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: alert.colour || accentCol, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {alert.driverName}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: accentCol, flexShrink: 0 }}>
            {Math.abs(alert.gapSeconds).toFixed(1)}s
          </span>
        </div>

        {/* Closing rate bar */}
        <div style={{ padding: '4px 10px 7px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.abs(alert.closingRateSps) * 25)}%`,
              background: isClosing ? accentCol : 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: isClosing ? accentCol : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {isClosing
              ? `${alert.closingRateSps.toFixed(1)}s/s`
              : 'STEADY'}
          </span>
        </div>
      </div>
    </ResizeHandles>
  )
}
