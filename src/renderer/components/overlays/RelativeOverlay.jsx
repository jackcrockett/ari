import React, { useMemo } from 'react'
import { useTelemetry, formatGap, licenseColor } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { useOverlayScale } from '../../hooks/useOverlayScale'

const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

export default function RelativeOverlay() {
  const { data, connected } = useTelemetry()
  const { scale } = useOverlayScale('relative')

  const drivers = useMemo(() => {
    if (!data?.relative) return []
    const sorted = [...data.relative].sort((a, b) => a.gapSeconds - b.gapSeconds)
    const selfIdx = sorted.findIndex(d => d.isPlayer)
    if (selfIdx === -1) return sorted.slice(0, 5)
    const start = Math.max(0, selfIdx - 2)
    return sorted.slice(start, start + 5)
  }, [data])

  if (!connected || !data) {
    return (
      <div className="overlay" style={{ width: 290, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', transformOrigin: 'top left', transform: `scale(${scale})`, display: 'inline-block' }}>
      <ResizeHandles overlayId="relative" />
      <div className="overlay" style={{ width: 290 }}>
        <DragHandle overlayId="relative" label="Relative">
          <span className="live-badge">LIVE</span>
        </DragHandle>

        {drivers.map((driver, i) => {
          const colour = driver.colour || DRIVER_COLOURS[driver.carIdx % DRIVER_COLOURS.length]
          const gap = driver.isPlayer ? null : driver.gapSeconds
          const gapStr = gap === null ? '—' : formatGap(gap)
          const isAhead = gap !== null && gap < 0

          return (
            <div key={driver.carIdx} style={{
              display: 'flex', alignItems: 'center', padding: '5px 10px', gap: 7,
              background: driver.isPlayer ? 'rgba(232,0,29,0.08)' : 'transparent',
              borderBottom: i < drivers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderLeft: driver.isPlayer ? '2px solid #E8001D' : '2px solid transparent',
            }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 600, color: driver.isPlayer ? '#E8001D' : 'rgba(255,255,255,0.3)', width: 18, flexShrink: 0 }}>
                {driver.position}
              </span>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: colour, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, background: licenseColor(driver.licenseString), color: '#fff', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>
                {driver.licenseString}
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: driver.isPlayer ? 600 : 500, color: driver.isPlayer ? '#fff' : 'rgba(255,255,255,0.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {driver.driverName}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                {driver.iRating >= 1000 ? `${(driver.iRating/1000).toFixed(1)}k` : driver.iRating}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: driver.isPlayer ? 'rgba(255,255,255,0.4)' : isAhead ? '#94D2BD' : '#F59E0B', minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                {driver.isPlayer ? '● YOU' : gapStr}
              </span>
              {driver.onPitRoad && (
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>
                  PIT
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
