import React, { useState } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

function pitWindows(totalLaps, stops) {
  const stintLen = totalLaps / (stops + 1)
  const windows = []
  for (let i = 1; i <= stops; i++) {
    const mid   = Math.round(stintLen * i)
    const open  = Math.max(1, Math.floor(stintLen * i - stintLen * 0.08))
    const close = Math.min(totalLaps - 1, Math.ceil(stintLen * i + stintLen * 0.08))
    windows.push({ stop: i, open, mid, close })
  }
  return windows
}

export default function RaceScheduleOverlay() {
  const { data } = useTelemetry()
  const [stops, setStops] = useState(1)

  const fuel       = data?.fuel
  const currentLap = data?.currentLap  ?? 0
  const totalLaps  = data?.totalLaps   ?? 0
  const fuelLevel  = fuel?.level       ?? 0
  const fuelPerLap = fuel?.perLap      ?? 0

  const lapsOfFuel  = fuelPerLap > 0 ? fuelLevel / fuelPerLap : 0
  const criticalLap = fuelPerLap > 0 ? Math.floor(currentLap + lapsOfFuel) : null

  const windows = totalLaps > 0 ? pitWindows(totalLaps, stops) : []
  // Next pit window = first window not yet passed
  const nextWindow = windows.find(w => w.close >= currentLap)
  const inWindow   = nextWindow && currentLap >= nextWindow.open && currentLap <= nextWindow.close

  return (
    <ResizeHandles overlayId="raceschedule">
      <div className="overlay" style={{ width: 288 }}>
        <DragHandle overlayId="raceschedule" label="Pit Window">
          {inWindow && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.15)', padding: '2px 5px', borderRadius: 3 }}>
              PIT NOW
            </span>
          )}
        </DragHandle>

        {/* Stop count selector */}
        <div style={{ padding: '6px 10px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginRight: 4 }}>STOPS</span>
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setStops(n)}
              style={{
                width: 26, height: 20, borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700,
                background: stops === n ? '#E8001D' : 'rgba(255,255,255,0.06)',
                color:      stops === n ? '#fff' : 'rgba(255,255,255,0.4)',
                border:     stops === n ? '1px solid rgba(232,0,29,0.4)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '4px 10px 8px' }}>
          {[
            { label: 'CURRENT LAP',   value: currentLap ? `${currentLap} / ${totalLaps || '?'}` : '—' },
            { label: 'LAPS OF FUEL',  value: fuelPerLap > 0 ? lapsOfFuel.toFixed(1) : '—' },
            {
              label: 'FUEL CRITICAL',
              value: criticalLap != null ? `Lap ${criticalLap}` : '—',
              color: criticalLap && criticalLap <= currentLap + 3 ? '#E8001D' : '#fff',
            },
            {
              label: nextWindow ? `PIT ${nextWindow.stop} WINDOW` : 'PIT WINDOW',
              value: nextWindow ? `Lap ${nextWindow.open}–${nextWindow.close}` : totalLaps > 0 ? 'Done' : '—',
              color: inWindow ? '#22C55E' : !nextWindow && totalLaps > 0 ? 'rgba(255,255,255,0.3)' : '#fff',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '5px 4px' }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: color || '#fff' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* All upcoming windows */}
        {windows.length > 1 && (
          <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6 }}>
            {windows.map(w => {
              const isPast    = currentLap > w.close
              const isActive  = currentLap >= w.open && currentLap <= w.close
              return (
                <div key={w.stop} style={{
                  flex: 1, padding: '3px 4px', borderRadius: 4, textAlign: 'center',
                  background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: isActive ? '#22C55E' : 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
                    S{w.stop}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isPast ? 'rgba(255,255,255,0.2)' : isActive ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>
                    {w.open}–{w.close}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ResizeHandles>
  )
}
