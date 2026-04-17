import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

function formatTime(seconds) {
  if (seconds < 0) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function SessionTimerOverlay() {
  const { data } = useTelemetry()

  const sessionType = data?.sessionType || 'Race'
  const timeRemain  = data?.sessionTimeRemain ?? -1
  const lapsRemain  = data?.lapsRemain ?? 0
  const totalLaps   = data?.totalLaps ?? 0

  // Timed session: use time remaining; lap-count session: use laps remaining
  const isTimed  = timeRemain > 0 && totalLaps <= 0
  const isLapped = totalLaps > 0

  const primary   = isLapped ? `${lapsRemain}` : formatTime(timeRemain)
  const subLabel  = isLapped ? 'LAPS LEFT' : 'TIME LEFT'

  return (
    <ResizeHandles overlayId="sessiontimer">
      <div className="overlay" style={{ width: 200 }}>
        <DragHandle overlayId="sessiontimer" label="Session Timer">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {sessionType}
          </span>
        </DragHandle>
        <div style={{ padding: '8px 14px 10px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {primary}
          </div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginTop: 4 }}>
            {subLabel}
          </div>
          {isLapped && timeRemain > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {formatTime(timeRemain)}
            </div>
          )}
        </div>
      </div>
    </ResizeHandles>
  )
}
