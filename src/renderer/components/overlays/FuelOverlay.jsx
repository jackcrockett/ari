import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function FuelOverlay() {
  const { data, connected, isDemo } = useTelemetry()

  if (!connected || !data?.fuel) {
    return (
      <div className="overlay" style={{ width: 280, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  const { fuel } = data
  const shortfall = fuel.needed > 0
  const fuelBarPct = Math.min(1, fuel.lapsRemaining / Math.max(fuel.lapsToFinish, 1))

  return (
    <ResizeHandles overlayId="fuel">
      <div className="overlay" style={{ width: 280 }}>
        <DragHandle overlayId="fuel" label="Fuel">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600, color: shortfall ? '#F59E0B' : '#22C55E' }}>
            {shortfall ? `+${fuel.needed.toFixed(1)}L to finish` : 'On target'}
          </span>
        </DragHandle>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '8px 12px 4px' }}>
          {[
            { label: 'IN TANK',   value: `${fuel.level.toFixed(2)}L` },
            { label: 'PER LAP',   value: `${fuel.perLap.toFixed(2)}L` },
            { label: 'LAPS LEFT', value: fuel.lapsRemaining.toFixed(1) },
            { label: 'TO FINISH', value: fuel.lapsToFinish ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '6px 4px' }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ margin: '4px 12px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>FUEL TO FINISH</span>
            {shortfall && (
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: '#F59E0B' }}>add {fuel.needed.toFixed(1)}L at pit</span>
            )}
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Full</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${fuelBarPct * 100}%`,
              background: fuelBarPct > 0.3 ? '#22C55E' : fuelBarPct > 0.15 ? '#F59E0B' : '#E8001D',
              borderRadius: 3, transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
