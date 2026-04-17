import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const F = {
  CHECKERED: 0x0001, WHITE:  0x0002, GREEN: 0x0004,
  YELLOW:    0x0008, RED:    0x0010, BLUE:  0x0020,
  BLACK:     0x10000, CAUTION: 0x4000, CAUTION_WAV: 0x8000, YELLOW_WAV: 0x0100,
}

function getFlag(flags) {
  if (!flags) return { label: 'GREEN', emoji: '🟢', color: '#22C55E', bg: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.08))' }
  if (flags & F.CHECKERED) return { label: 'CHEQUERED', emoji: '🏁', color: '#fff', bg: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(0,0,0,0.5))', pattern: true }
  if (flags & F.RED)        return { label: 'RED FLAG', emoji: '🔴', color: '#E8001D', bg: 'linear-gradient(135deg, rgba(232,0,29,0.3), rgba(232,0,29,0.1))' }
  if (flags & F.BLACK)      return { label: 'BLACK FLAG', emoji: '⬛', color: '#fff', bg: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(30,30,30,0.6))' }
  if (flags & F.CAUTION || flags & F.CAUTION_WAV || flags & F.YELLOW || flags & F.YELLOW_WAV)
    return { label: 'YELLOW', emoji: '🟡', color: '#F59E0B', bg: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.08))' }
  if (flags & F.WHITE)  return { label: 'WHITE', emoji: '⬜', color: '#fff', bg: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))' }
  if (flags & F.BLUE)   return { label: 'BLUE FLAG', emoji: '🔵', color: '#3B82F6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.08))' }
  if (flags & F.GREEN)  return { label: 'GREEN', emoji: '🟢', color: '#22C55E', bg: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.08))' }
  return { label: 'GREEN', emoji: '🟢', color: '#22C55E', bg: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.08))' }
}

export default function DigiflagOverlay() {
  const { data } = useTelemetry()
  const flags = data?.sessionFlags ?? 0x04
  const flag  = getFlag(flags)

  return (
    <ResizeHandles overlayId="digiflag">
      <div className="overlay" style={{ width: 308 }}>
        <DragHandle overlayId="digiflag" label="Digiflag" />
        <div style={{
          margin: '6px 8px 8px',
          background: flag.bg,
          border: `2px solid ${flag.color}44`,
          borderRadius: 6,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: `0 0 30px ${flag.color}22`,
        }}>
          {/* Large flag swatch */}
          <div style={{
            width: 52, height: 36, borderRadius: 3, flexShrink: 0,
            background: flag.pattern
              ? 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 12px 12px'
              : flag.color,
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: `0 0 16px ${flag.color}55`,
          }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-data)',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: flag.color,
              textShadow: `0 0 20px ${flag.color}88`,
              lineHeight: 1,
            }}>
              {flag.label}
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: '0.1em' }}>
              SESSION FLAG
            </div>
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
