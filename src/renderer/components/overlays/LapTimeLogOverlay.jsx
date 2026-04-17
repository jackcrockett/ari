import React, { useRef, useEffect, useState } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function LapTimeLogOverlay() {
  const { data } = useTelemetry()
  const prevLapRef = useRef(null)
  const [laps, setLaps] = useState([])
  const fuelRef = useRef(null)

  useEffect(() => {
    if (!data) return
    const lapNum = data.currentLap
    const lapTime = data.lastLapTime
    if (!lapNum || !lapTime || lapTime <= 0) return
    if (lapNum === prevLapRef.current) return
    prevLapRef.current = lapNum

    setLaps(prev => {
      const fuelUsed = fuelRef.current != null ? fuelRef.current - data.fuel?.level : null
      fuelRef.current = data.fuel?.level ?? null
      const entry = { lap: lapNum, time: lapTime, fuel: fuelUsed }
      const next = [...prev, entry].slice(-30)
      return next
    })
  }, [data?.currentLap])

  useEffect(() => {
    if (data?.fuel?.level != null && prevLapRef.current == null) {
      fuelRef.current = data.fuel.level
    }
  }, [data])

  const bestTime = laps.length ? Math.min(...laps.map(l => l.time)) : 0

  return (
    <ResizeHandles overlayId="laplog">
      <div className="overlay" style={{ width: 268 }}>
        <DragHandle overlayId="laplog" label="Lap Log">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            {laps.length} laps
          </span>
        </DragHandle>
        {/* Header */}
        <div style={{ display: 'flex', padding: '4px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {['LAP','TIME','DELTA','FUEL'].map(h => (
            <span key={h} style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', flex: h === 'TIME' ? 2 : 1 }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {laps.length === 0 ? (
            <div style={{ padding: '12px 10px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              Waiting for completed laps...
            </div>
          ) : (
            [...laps].reverse().map((l) => {
              const isBest = l.time === bestTime
              const delta  = l.time - bestTime
              return (
                <div key={l.lap} style={{
                  display: 'flex', padding: '4px 10px',
                  background: isBest ? 'rgba(168,85,247,0.08)' : 'transparent',
                  borderLeft: isBest ? '2px solid #A855F7' : '2px solid transparent',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)', flex: 1 }}>{l.lap}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isBest ? '#A855F7' : '#fff', flex: 2 }}>{formatLapTime(l.time)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isBest ? '#A855F7' : delta > 0 ? '#E8001D' : '#22C55E', flex: 1 }}>
                    {isBest ? 'BEST' : `+${delta.toFixed(3)}`}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.3)', flex: 1 }}>
                    {l.fuel != null ? `${l.fuel.toFixed(2)}L` : '—'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </ResizeHandles>
  )
}
