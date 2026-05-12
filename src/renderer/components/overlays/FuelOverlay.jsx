import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'

export default function FuelOverlay() {
  const { data } = useTelemetry()

  if (!data?.fuel) {
    return (
      <div className="overlay" style={{ width: '100%', padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  const { fuel } = data
  const lapsToFinish = fuel.lapsToFinish || 0
  const shortfall = fuel.needed > 0

  const calcRow = (pl) => ({
    perLap:   pl,
    lapsLeft: pl > 0 ? fuel.level / pl : 0,
    refuel:   lapsToFinish > 0 ? Math.max(0, lapsToFinish * pl - fuel.level) : 0,
    atEnd:    lapsToFinish > 0 ? fuel.level - lapsToFinish * pl : fuel.level,
  })

  const rows = [
    { label: 'Average', accent: '#C084FC', ...calcRow(fuel.perLap) },
    { label: 'Safety',  accent: '#F59E0B', ...calcRow(fuel.perLap * 1.05) },
    { label: 'Last',    accent: 'rgba(255,255,255,0.5)', ...calcRow(fuel.perLap * 1.01) },
  ]

  const estimatedCapacity = fuel.level + fuel.lapsRemaining * fuel.perLap
  const barPct = estimatedCapacity > 0 ? Math.min(1, fuel.level / estimatedCapacity) : 0
  const barColor = barPct > 0.3 ? '#22C55E' : barPct > 0.15 ? '#F59E0B' : '#E8001D'

  const HDR = {
    fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
    color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em',
    textTransform: 'uppercase', textAlign: 'right',
  }

  const NUM = (color) => ({
    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
    color: color || 'rgba(255,255,255,0.75)', textAlign: 'right',
  })

  return (
      <div className="overlay" style={{ width: '100%' }}>
        <DragHandle overlayId="fuel" label="Fuel">
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            color: shortfall ? '#E8001D' : '#22C55E',
          }}>
            {shortfall ? `SHORT ${fuel.needed.toFixed(1)}L` : 'ON TARGET'}
          </span>
        </DragHandle>

        {/* Big stats row */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 0,
          padding: '10px 14px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 3 }}>FUEL LEVEL</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: shortfall ? '#F59E0B' : '#fff', lineHeight: 1 }}>
                {fuel.level.toFixed(2)}
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>L</span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 3 }}>LAPS LEFT</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {lapsToFinish || '—'}
              </span>
            </div>
          </div>

          {shortfall && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(232,0,29,0.15)', border: '1px solid rgba(232,0,29,0.4)',
              borderRadius: 4, padding: '5px 10px', flexShrink: 0, alignSelf: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: '#E8001D', fontWeight: 800, letterSpacing: '0.14em' }}>PIT</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#E8001D', fontWeight: 800, lineHeight: 1.2 }}>
                +{fuel.needed.toFixed(1)}L
              </div>
            </div>
          )}
        </div>

        {/* Fuel bar */}
        <div style={{ margin: '0 14px' }}>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${barPct * 100}%`, background: barColor, borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Calculation table */}
        <div style={{ padding: '6px 14px 10px' }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 1fr', marginBottom: 5 }}>
            {['', 'PER LAP', 'LAPS', 'REFUEL', 'AT END'].map(h => (
              <div key={h} style={HDR}>{h}</div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map(({ label, accent, perLap, lapsLeft, refuel, atEnd }) => {
            const needsPit = refuel > 0.05
            return (
              <div key={label} style={{
                display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 1fr',
                padding: '5px 0',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.05em' }}>
                  {label}
                </div>
                <div style={NUM()}>{perLap.toFixed(2)}</div>
                <div style={NUM()}>{lapsLeft.toFixed(1)}</div>
                <div style={needsPit ? {
                  ...NUM('#E8001D'),
                  background: 'rgba(232,0,29,0.18)',
                  borderRadius: 3, padding: '1px 4px', display: 'inline-block', textAlign: 'right',
                } : NUM('#22C55E')}>
                  {needsPit ? `+${refuel.toFixed(1)}` : '—'}
                </div>
                <div style={NUM(atEnd < 0 ? '#E8001D' : atEnd < 1 ? '#F59E0B' : undefined)}>
                  {atEnd.toFixed(1)}
                </div>
              </div>
            )
          })}

        </div>
      </div>
  )
}
