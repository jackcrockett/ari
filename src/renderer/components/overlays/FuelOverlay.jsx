import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function FuelOverlay() {
  const { data } = useTelemetry()

  // Guard on data.fuel only -- not on connected, so demo mode works in Electron
  if (!data?.fuel) {
    return (
      <div className="overlay" style={{ width: 300, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  const { fuel } = data
  const lapsToFinish = fuel.lapsToFinish || 0
  const shortfall = fuel.needed > 0

  // Calculate per-row values for a given per-lap consumption estimate
  const calcRow = (pl) => ({
    perLap:   pl,
    lapsLeft: pl > 0 ? fuel.level / pl : 0,
    refuel:   lapsToFinish > 0 ? Math.max(0, lapsToFinish * pl - fuel.level) : 0,
    atEnd:    lapsToFinish > 0 ? fuel.level - lapsToFinish * pl : fuel.level,
  })

  // Three calculation rows: average / safety margin (+5%) / last lap (+1% variation for demo)
  const rows = [
    { label: 'Average', accent: '#C084FC', ...calcRow(fuel.perLap) },
    { label: 'Safety',  accent: '#F59E0B', ...calcRow(fuel.perLap * 1.05) },
    { label: 'Last',    accent: 'rgba(255,255,255,0.45)', ...calcRow(fuel.perLap * 1.01) },
  ]

  // Fuel bar: fraction of estimated full tank remaining
  const estimatedCapacity = fuel.level + fuel.lapsRemaining * fuel.perLap
  const barPct = estimatedCapacity > 0 ? Math.min(1, fuel.level / estimatedCapacity) : 0
  const barColor = barPct > 0.3 ? '#22C55E' : barPct > 0.15 ? '#F59E0B' : '#E8001D'

  const HDR = {
    fontFamily: 'var(--font-data)', fontSize: 8,
    color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em',
    textTransform: 'uppercase', textAlign: 'right',
  }
  const NUM = (color) => ({
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: color || 'rgba(255,255,255,0.65)', textAlign: 'right',
  })

  return (
    <ResizeHandles overlayId="fuel">
      <div className="overlay" style={{ width: 300 }}>
        <DragHandle overlayId="fuel" label="Fuel">
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            color: shortfall ? '#E8001D' : '#22C55E',
          }}>
            {shortfall ? `SHORT ${fuel.needed.toFixed(1)}L` : 'ON TARGET'}
          </span>
        </DragHandle>

        {/* Big stats row */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6,
          padding: '8px 14px 7px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 2 }}>FUEL LEVEL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: shortfall ? '#F59E0B' : '#fff', lineHeight: 1 }}>
              {fuel.level.toFixed(2)}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: 3 }}>L</span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 2 }}>LAPS TO FINISH</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
              {lapsToFinish || '—'}
            </div>
          </div>

          {shortfall && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(232,0,29,0.12)', border: '1px solid rgba(232,0,29,0.35)',
              borderRadius: 4, padding: '4px 8px', flexShrink: 0,
            }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 7, color: '#E8001D', fontWeight: 700, letterSpacing: '0.12em' }}>PIT</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E8001D', fontWeight: 700, lineHeight: 1.2 }}>
                +{fuel.needed.toFixed(1)}L
              </div>
            </div>
          )}
        </div>

        {/* Calculation table */}
        <div style={{ padding: '5px 14px 8px' }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr 1fr 1fr 1fr', marginBottom: 4 }}>
            {['', 'PER LAP', 'LAPS', 'REFUEL', 'AT END'].map(h => (
              <div key={h} style={HDR}>{h}</div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map(({ label, accent, perLap, lapsLeft, refuel, atEnd }) => {
            const needsPit = refuel > 0.05
            return (
              <div key={label} style={{
                display: 'grid', gridTemplateColumns: '54px 1fr 1fr 1fr 1fr',
                padding: '4px 0',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600, color: accent, letterSpacing: '0.05em' }}>
                  {label}
                </div>
                <div style={NUM()}>{perLap.toFixed(2)}</div>
                <div style={NUM()}>{lapsLeft.toFixed(1)}</div>
                <div style={NUM(needsPit ? '#E8001D' : '#22C55E')}>
                  {needsPit ? `+${refuel.toFixed(1)}` : '—'}
                </div>
                <div style={NUM(atEnd < 0 ? '#E8001D' : atEnd < 1 ? '#F59E0B' : undefined)}>
                  {atEnd.toFixed(1)}
                </div>
              </div>
            )
          })}

        </div>

        {/* Fuel bar */}
        <div style={{ margin: '-2px 14px 10px' }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${barPct * 100}%`, background: barColor, borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>

      </div>
    </ResizeHandles>
  )
}
