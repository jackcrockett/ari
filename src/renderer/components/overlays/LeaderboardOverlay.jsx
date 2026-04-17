import React from 'react'
import { useTelemetry, formatGap, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function LeaderboardOverlay() {
  const { data } = useTelemetry()
  const standings = data?.standings ?? []

  return (
    <ResizeHandles overlayId="leaderboard">
      <div className="overlay" style={{ width: 268 }}>
        <DragHandle overlayId="leaderboard" label="Leaderboard">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
            {data?.sessionType || ''}
          </span>
        </DragHandle>
        <div style={{ padding: '4px 0 6px' }}>
          {standings.slice(0, 15).map((d, i) => (
            <div key={d.carIdx} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px',
              background: d.isPlayer ? 'rgba(232,0,29,0.07)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              borderLeft: d.isPlayer ? '2px solid #E8001D' : '2px solid transparent',
            }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', width: 18, textAlign: 'right' }}>
                {d.position}
              </span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.colour, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: d.isPlayer ? '#fff' : 'rgba(255,255,255,0.85)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.driverName}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: d.position === 1 ? '#F59E0B' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                {d.position === 1 ? formatLapTime(d.bestLapTime) : formatGap(d.gapSeconds)}
              </span>
              {d.onPitRoad && (
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: '#F59E0B', flexShrink: 0 }}>PIT</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </ResizeHandles>
  )
}
