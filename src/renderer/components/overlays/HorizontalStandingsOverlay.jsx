import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { formatGap } from '../../hooks/useTelemetry'

export default function HorizontalStandingsOverlay() {
  const { data } = useTelemetry()
  const standings = data?.standings ?? []

  return (
    <ResizeHandles overlayId="hstandings">
      <div className="overlay" style={{ width: 940 }}>
        <DragHandle overlayId="hstandings" label="Standings" />
        <div style={{ display: 'flex', gap: 2, padding: '4px 6px 6px', overflowX: 'hidden' }}>
          {standings.slice(0, 20).map(d => (
            <div key={d.carIdx} style={{
              flex: '0 0 auto',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '4px 6px',
              background: d.isPlayer ? 'rgba(232,0,29,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${d.isPlayer ? 'rgba(232,0,29,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 4,
              minWidth: 44,
            }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                P{d.position}
              </div>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: d.colour, margin: '2px 0',
              }} />
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600, color: d.isPlayer ? '#fff' : 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.1, maxWidth: 52 }}>
                {d.driverName.split(' ').pop()}
              </div>
              {d.gapSeconds !== 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  {formatGap(d.gapSeconds)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ResizeHandles>
  )
}
