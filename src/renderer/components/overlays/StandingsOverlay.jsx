import React, { useMemo } from 'react'
import { useTelemetry, formatGap } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { useOverlayScale } from '../../hooks/useOverlayScale'

const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

export default function StandingsOverlay() {
  const { data, connected } = useTelemetry()
  const { scale } = useOverlayScale('standings')

  const standings = useMemo(() => {
    if (!data?.standings) return []
    return data.standings.slice(0, 10)
  }, [data])

  if (!connected || !data) {
    return (
      <div className="overlay" style={{ width: 300, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  const leader = standings[0]

  return (
    <div style={{ position: 'relative', transformOrigin: 'top left', transform: `scale(${scale})`, display: 'inline-block' }}>
      <ResizeHandles overlayId="standings" />
      <div className="overlay" style={{ width: 300 }}>
        <DragHandle overlayId="standings" label="Standings">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Lap <strong style={{ color: '#fff' }}>{data.currentLap}</strong>
            {data.totalLaps ? ` / ${data.totalLaps}` : ''}
          </span>
        </DragHandle>

        {standings.map((driver, i) => {
          const colour = driver.colour || DRIVER_COLOURS[driver.carIdx % DRIVER_COLOURS.length]
          const isLeader = i === 0
          const gapToLeader = leader ? (driver.gapSeconds - leader.gapSeconds) : null

          return (
            <div key={driver.carIdx} style={{
              display: 'flex', alignItems: 'center', padding: '4px 10px', gap: 7,
              background: driver.isPlayer ? 'rgba(232,0,29,0.08)' : 'transparent',
              borderBottom: i < standings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderLeft: driver.isPlayer ? '2px solid #E8001D' : '2px solid transparent',
            }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 600, color: driver.isPlayer ? '#E8001D' : 'rgba(255,255,255,0.3)', width: 18, flexShrink: 0, textAlign: 'right' }}>
                {driver.position}
              </span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: colour, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: driver.isPlayer ? 600 : 400, color: driver.isPlayer ? '#fff' : 'rgba(255,255,255,0.72)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {driver.driverName}
              </span>
              {driver.onPitRoad && (
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>PIT</span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isLeader ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)', minWidth: 54, textAlign: 'right', flexShrink: 0 }}>
                {isLeader ? 'Leader' : gapToLeader !== null ? formatGap(gapToLeader) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
