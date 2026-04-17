import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const PIT_SPEED_LIMIT = 60  // km/h — standard limit; iRacing varies by track

export default function PitboxHelperOverlay() {
  const { data } = useTelemetry()

  const speed      = data?.speed    ?? 0
  const onPitRoad  = data?.onPitRoad ?? false

  const overLimit = onPitRoad && speed > PIT_SPEED_LIMIT
  const delta     = speed - PIT_SPEED_LIMIT
  const pct       = Math.min(1, speed / PIT_SPEED_LIMIT)
  const barColor  = overLimit ? '#E8001D' : pct > 0.9 ? '#F59E0B' : '#22C55E'

  return (
    <ResizeHandles overlayId="pitboxhelper">
      <div className="overlay" style={{ width: 248, borderColor: onPitRoad ? 'rgba(245,158,11,0.3)' : undefined }}>
        <DragHandle overlayId="pitboxhelper" label="Pitbox Helper">
          {onPitRoad && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 5px', borderRadius: 3 }}>
              PIT LANE
            </span>
          )}
          {!onPitRoad && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              NOT IN PITS
            </span>
          )}
        </DragHandle>

        <div style={{ padding: '6px 10px 8px' }}>
          {/* Speed display */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: barColor, lineHeight: 1 }}>
              {speed}
            </span>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>km/h</span>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
              limit {PIT_SPEED_LIMIT}
            </span>
            {overLimit && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E8001D', fontWeight: 700 }}>
                +{delta.toFixed(0)}
              </span>
            )}
          </div>

          {/* Speed bar */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${pct * 100}%`,
              background: barColor, borderRadius: 3,
              transition: 'width 0.08s linear, background 0.2s',
            }} />
            {/* Limit marker */}
            <div style={{ position: 'absolute', top: 0, left: '100%', width: 2, height: '100%', background: 'rgba(255,255,255,0.3)', transform: 'translateX(-2px)' }} />
          </div>

          {/* Stop/Go indicator */}
          {onPitRoad && (
            <div style={{ marginTop: 6, textAlign: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                color: overLimit ? '#E8001D' : '#22C55E',
                background: overLimit ? 'rgba(232,0,29,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${overLimit ? 'rgba(232,0,29,0.3)' : 'rgba(34,197,94,0.3)'}`,
                padding: '3px 16px', borderRadius: 4,
              }}>
                {overLimit ? 'OVER LIMIT' : speed > 0 ? 'GOOD SPEED' : 'STOPPED'}
              </span>
            </div>
          )}
        </div>
      </div>
    </ResizeHandles>
  )
}
