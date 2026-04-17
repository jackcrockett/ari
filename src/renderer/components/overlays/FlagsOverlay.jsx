import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

// iRacing SessionFlags bitmask values
const F = {
  CHECKERED:    0x0001,
  WHITE:        0x0002,
  GREEN:        0x0004,
  YELLOW:       0x0008,
  RED:          0x0010,
  BLUE:         0x0020,
  BLACK:        0x10000,
  CAUTION:      0x4000,
  CAUTION_WAV:  0x8000,
  YELLOW_WAV:   0x0100,
  REPAIR:       0x100000,
}

function getFlag(flags) {
  if (!flags) return { label: 'GREEN', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' }
  if (flags & F.CHECKERED) return { label: 'CHEQUERED', color: '#fff', bg: 'rgba(255,255,255,0.12)', pattern: true }
  if (flags & F.RED)       return { label: 'RED', color: '#E8001D', bg: 'rgba(232,0,29,0.2)' }
  if (flags & F.BLACK)     return { label: 'BLACK', color: '#fff', bg: 'rgba(0,0,0,0.7)' }
  if (flags & F.CAUTION || flags & F.CAUTION_WAV || flags & F.YELLOW || flags & F.YELLOW_WAV)
                           return { label: 'YELLOW', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' }
  if (flags & F.WHITE)     return { label: 'WHITE', color: '#fff', bg: 'rgba(255,255,255,0.1)' }
  if (flags & F.BLUE)      return { label: 'BLUE', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' }
  if (flags & F.REPAIR)    return { label: 'MEATBALL', color: '#F97316', bg: 'rgba(249,115,22,0.15)' }
  if (flags & F.GREEN)     return { label: 'GREEN', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' }
  return { label: 'GREEN', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' }
}

export default function FlagsOverlay() {
  const { data } = useTelemetry()
  const flags = data?.sessionFlags ?? 0x04
  const flag = getFlag(flags)

  return (
    <ResizeHandles overlayId="flags">
      <div className="overlay" style={{ width: 200 }}>
        <DragHandle overlayId="flags" label="Flag" />
        <div style={{
          margin: '8px 10px 10px',
          background: flag.bg,
          border: `2px solid ${flag.color}`,
          borderRadius: 5,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {/* Flag square */}
          <div style={{
            width: 28, height: 20, borderRadius: 2, flexShrink: 0,
            background: flag.pattern
              ? 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 10px 10px'
              : flag.color,
            border: '1px solid rgba(255,255,255,0.2)'
          }} />
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: flag.color,
          }}>
            {flag.label}
          </span>
        </div>
      </div>
    </ResizeHandles>
  )
}
