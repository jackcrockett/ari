import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function DeltaOverlay() {
  const { data } = useTelemetry()
  const delta = data?.delta ?? 0

  const clamped = Math.max(-2, Math.min(2, delta))
  const pct = (clamped / 2) * 50  // -50% to +50% from center
  const color = delta <= 0 ? '#22C55E' : '#E8001D'
  const sign  = delta > 0 ? '+' : ''

  return (
    <ResizeHandles overlayId="delta">
      <div className="overlay" style={{ width: 340 }}>
        <DragHandle overlayId="delta" label="Delta">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
            VS BEST LAP
          </span>
        </DragHandle>
        <div style={{ padding: '6px 10px 8px' }}>
          {/* Bar */}
          <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'visible', margin: '0 4px' }}>
            {/* Center marker */}
            <div style={{ position: 'absolute', left: '50%', top: -2, width: 2, height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
            {/* Delta bar */}
            <div style={{
              position: 'absolute',
              height: '100%',
              borderRadius: 4,
              background: color,
              opacity: 0.85,
              left: pct < 0 ? `${50 + pct}%` : '50%',
              width: `${Math.abs(pct)}%`,
              transition: 'all 0.1s linear',
            }} />
          </div>
          {/* Value */}
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 700,
              color,
              letterSpacing: '-0.01em',
            }}>
              {sign}{delta.toFixed(3)}s
            </span>
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
