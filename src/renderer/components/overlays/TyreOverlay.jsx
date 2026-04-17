import React, { useEffect, useRef } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

// Temperature colour: blue (cold) → green (optimal) → red (hot)
// Optimal GT3 range roughly 80–100°C
function tempColour(t) {
  if (t == null || isNaN(t)) return 'rgba(255,255,255,0.15)'
  if (t < 40)  return '#3B82F6'   // cold blue
  if (t < 65)  return '#60A5FA'   // warming blue
  if (t < 80)  return '#34D399'   // building green
  if (t < 95)  return '#22C55E'   // optimal green
  if (t < 110) return '#FACC15'   // hot yellow
  if (t < 130) return '#F97316'   // very hot orange
  return '#EF4444'                 // overheating red
}

function wearColour(w) {
  if (w == null || isNaN(w)) return 'rgba(255,255,255,0.15)'
  if (w > 0.7) return '#22C55E'
  if (w > 0.4) return '#FACC15'
  return '#EF4444'
}

function avgTemp(tyre) {
  const vals = [tyre.tempL, tyre.tempM, tyre.tempR].filter(v => v != null && !isNaN(v))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function avgWear(tyre) {
  const vals = [tyre.wearL, tyre.wearM, tyre.wearR].filter(v => v != null && !isNaN(v))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function TyreCorner({ label, tyre, flip }) {
  if (!tyre) return null
  const tL = tyre.tempL, tM = tyre.tempM, tR = tyre.tempR
  const wear = avgWear(tyre)
  const avg = avgTemp(tyre)
  const psi = tyre.pressure ? (tyre.pressure * 0.145038).toFixed(1) : '--'  // Pa → PSI

  // Zone order: outer → middle → inner (flip for right-side tyres)
  const zones = flip ? [tR, tM, tL] : [tL, tM, tR]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 54 }}>
      {/* Corner label */}
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
        {label}
      </span>

      {/* 3-zone temp strip */}
      <div style={{ display: 'flex', gap: 2, width: '100%' }}>
        {zones.map((t, i) => (
          <div key={i} style={{
            flex: 1, height: 48, borderRadius: 3,
            background: tempColour(t),
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 3,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
              {t != null ? Math.round(t) : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Avg temp */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: avg ? tempColour(avg) : 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
        {avg != null ? Math.round(avg) + '°' : '--°'}
      </span>

      {/* Wear bar */}
      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          width: `${(wear ?? 0) * 100}%`, height: '100%',
          borderRadius: 2, background: wearColour(wear),
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Wear % */}
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: wearColour(wear) }}>
        {wear != null ? Math.round(wear * 100) + '%' : '--'}
      </span>

      {/* Pressure */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
        {psi} psi
      </span>
    </div>
  )
}

export default function TyreOverlay() {
  const { data }  = useTelemetry()
  const tyres     = data && data.tyres

  const DEMO = {
    LF: { tempL: 88, tempM: 92, tempR: 96, wearL: 0.82, wearM: 0.79, wearR: 0.75, pressure: 179000 },
    RF: { tempL: 94, tempM: 91, tempR: 87, wearL: 0.77, wearM: 0.80, wearR: 0.83, pressure: 181000 },
    LR: { tempL: 85, tempM: 89, tempR: 93, wearL: 0.88, wearM: 0.85, wearR: 0.82, pressure: 172000 },
    RR: { tempL: 91, tempM: 88, tempR: 84, wearL: 0.84, wearM: 0.87, wearR: 0.90, pressure: 174000 },
  }

  const t = tyres || DEMO
  const isDemo = !tyres

  return (
    <ResizeHandles overlayId="tyres">
      <div className="overlay" style={{ width: 250 }}>
        <DragHandle overlayId="tyres" label="Tyres">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isDemo ? 'Demo' : 'Live'}
          </span>
        </DragHandle>

        <div style={{ padding: '8px 10px 10px' }}>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            {[['cold', '#3B82F6'], ['optimal', '#22C55E'], ['hot', '#EF4444']].map(([label, colour]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: colour }} />
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* 4 corners in car layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            <TyreCorner label="FL" tyre={t.LF} flip={false} />
            <TyreCorner label="FR" tyre={t.RF} flip={true} />
            <TyreCorner label="RL" tyre={t.LR} flip={false} />
            <TyreCorner label="RR" tyre={t.RR} flip={true} />
          </div>

          {/* Wear note */}
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              wear updates at pit stop
            </span>
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
