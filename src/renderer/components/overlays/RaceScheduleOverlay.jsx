import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function RaceScheduleOverlay() {
  const { data } = useTelemetry()

  const fuel        = data?.fuel
  const currentLap  = data?.currentLap  ?? 0
  const totalLaps   = data?.totalLaps   ?? 0
  const lapsRemain  = data?.lapsRemain  ?? 0

  const fuelLevel   = fuel?.level        ?? 0
  const fuelPerLap  = fuel?.perLap       ?? 0

  // Earliest lap we MUST pit (fuel runs out)
  const lapsOfFuel  = fuelPerLap > 0 ? fuelLevel / fuelPerLap : 0
  const criticalLap = fuelPerLap > 0 ? Math.floor(currentLap + lapsOfFuel) : null

  // Pit window: 1 stop strategy — ideal mid-race
  const pitWindowOpen  = Math.floor(totalLaps * 0.45)
  const pitWindowClose = Math.floor(totalLaps * 0.60)
  const inWindow       = currentLap >= pitWindowOpen && currentLap <= pitWindowClose
  const windowPassed   = currentLap > pitWindowClose

  const rows = [
    { label: 'CURRENT LAP',   value: currentLap ? `${currentLap} / ${totalLaps || '?'}` : '—' },
    { label: 'LAPS OF FUEL',  value: fuelPerLap > 0 ? lapsOfFuel.toFixed(1) : '—' },
    { label: 'FUEL CRITICAL', value: criticalLap != null ? `Lap ${criticalLap}` : '—', color: criticalLap && criticalLap <= currentLap + 3 ? '#E8001D' : '#fff' },
    { label: 'PIT WINDOW',    value: totalLaps > 0 ? `Lap ${pitWindowOpen}–${pitWindowClose}` : '—', color: inWindow ? '#22C55E' : windowPassed ? 'rgba(255,255,255,0.3)' : '#fff' },
  ]

  return (
    <ResizeHandles overlayId="raceschedule">
      <div className="overlay" style={{ width: 288 }}>
        <DragHandle overlayId="raceschedule" label="Pit Window">
          {inWindow && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.15)', padding: '2px 5px', borderRadius: 3 }}>PIT NOW</span>
          )}
        </DragHandle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '6px 10px 8px' }}>
          {rows.map(({ label, value, color }) => (
            <div key={label} style={{ padding: '5px 4px' }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: color || '#fff' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </ResizeHandles>
  )
}
