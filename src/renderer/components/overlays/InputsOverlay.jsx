import React, { useRef, useEffect, useCallback } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { useOverlayScale } from '../../hooks/useOverlayScale'

const TRACE_H      = 48
const HISTORY      = 300
const THROTTLE_COL = '#22C55E'
const BRAKE_COL    = '#E8001D'
const CLUTCH_COL   = '#60A5FA'

const COMPOUND_STYLE = {
  S: { bg: '#E8001D', label: 'SOFT' },
  M: { bg: '#F59E0B', label: 'MED'  },
  H: { bg: '#e2e8f0', label: 'HARD', color: '#0e0e10' },
  W: { bg: '#3B82F6', label: 'WET'  },
  I: { bg: '#22C55E', label: 'INTER' },
}

function fmt(s) {
  if (!s || s <= 0) return '--:--.---'
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(3)}`
}

// Vertical pedal bar — tall rectangle, fills from bottom
function PedalBar({ value = 0, color, label }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        color: pct > 2 ? color : 'rgba(255,255,255,0.2)',
        minWidth: 28, textAlign: 'center',
      }}>
        {pct}
      </span>
      <div style={{
        width: '100%', minWidth: 20, height: 90,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 3, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: color,
          borderRadius: '0 0 3px 3px',
          transition: 'height 0.025s linear',
          boxShadow: pct > 5 ? `0 0 10px ${color}55` : 'none',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700,
        letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )
}

// Rotating steering wheel
function SteeringWheel({ value = 0, maxAngle = 450 }) {
  const deg = value * maxAngle
  const cx = 36, cy = 36, r = 28

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={72} height={72}
        viewBox="0 0 72 72"
        style={{ transform: `rotate(${deg}deg)`, transition: 'transform 0.025s linear' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={4.5} />
        <circle cx={cx} cy={cy} r={6} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
        {[0, 120, 240].map(a => {
          const rad = (a - 90) * Math.PI / 180
          return <line key={a}
            x1={cx + 7 * Math.cos(rad)} y1={cy + 7 * Math.sin(rad)}
            x2={cx + (r - 1) * Math.cos(rad)} y2={cy + (r - 1) * Math.sin(rad)}
            stroke="rgba(255,255,255,0.3)" strokeWidth={3.5} strokeLinecap="round" />
        })}
        <circle cx={cx} cy={cy - r + 3} r={3} fill="#E8001D" />
      </svg>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        color: Math.abs(value) > 0.02 ? '#fff' : 'rgba(255,255,255,0.25)',
      }}>
        {value >= 0 ? 'R' : 'L'} {Math.abs(Math.round(deg))}°
      </span>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 8, letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
      }}>
        STEER
      </span>
    </div>
  )
}

export default function InputsOverlay() {
  const { data }   = useTelemetry()
  const { scale }  = useOverlayScale('inputs')
  const canvasRef  = useRef(null)
  const historyRef = useRef([])
  const rafRef     = useRef(null)

  // Append to history
  useEffect(() => {
    if (!data) return
    historyRef.current.push({
      throttle: Math.max(0, Math.min(1, data.throttle ?? 0)),
      brake:    Math.max(0, Math.min(1, 1 - (data.brake  ?? 0))),
      clutch:   Math.max(0, Math.min(1, data.clutch ?? 0)),
    })
    if (historyRef.current.length > HISTORY) historyRef.current.shift()
  }, [data])

  // Draw trace on canvas
  const drawTrace = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.offsetWidth
    const H = TRACE_H
    if (W === 0) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width  = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const h = historyRef.current
    if (h.length < 2) return

    const PAD = 2, drawH = H - PAD * 2
    const toY = v => PAD + (1 - Math.max(0, Math.min(1, v))) * drawH
    const toX = i => (i / (HISTORY - 1)) * W

    const drawLine = (key, color) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth   = 1.5
      ctx.lineJoin    = 'round'
      ctx.lineCap     = 'round'
      h.forEach((s, i) => {
        const x = toX(i), y = toY(s[key])
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Fill under
      ctx.beginPath()
      h.forEach((s, i) => {
        const x = toX(i), y = toY(s[key])
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.lineTo(toX(h.length - 1), toY(0))
      ctx.lineTo(toX(0), toY(0))
      ctx.closePath()
      ctx.fillStyle = color + '22'
      ctx.fill()
    }

    drawLine('clutch',   CLUTCH_COL)
    drawLine('brake',    BRAKE_COL)
    drawLine('throttle', THROTTLE_COL)
  }, [])

  // Continuous animation loop
  useEffect(() => {
    const loop = () => { drawTrace(); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawTrace])

  const throttle     = data?.throttle    ?? 0
  const brake        = 1 - (data?.brake  ?? 0)
  const clutch       = data?.clutch ?? 0
  const steering     = data?.steering    ?? 0
  const gear         = data?.gear        ?? 0
  const speed        = data?.speed       ?? 0
  const delta        = data?.delta
  const tyreCompound = data?.tyreCompound
  const lastLap      = data?.lastLapTime
  const bestLap      = data?.bestLapTime

  const compound = COMPOUND_STYLE[tyreCompound] || null
  const deltaPos = delta > 0
  const deltaStr = delta != null ? `${deltaPos ? '+' : ''}${delta.toFixed(3)}` : null
  const gearLabel = gear === 0 ? 'N' : gear === -1 ? 'R' : String(gear)

  return (
    <div style={{ position: 'relative', transformOrigin: 'top left', transform: `scale(${scale})`, display: 'inline-block' }}>
      <ResizeHandles overlayId="inputs" />
      <div className="overlay" style={{ width: 360 }}>

        <DragHandle overlayId="inputs" label="Inputs">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {compound && (
              <div style={{ background: compound.bg, color: compound.color || '#fff', fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 3 }}>
                {compound.label}
              </div>
            )}
            {deltaStr && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: deltaPos ? '#E8001D' : '#22C55E' }}>
                {deltaStr}
              </span>
            )}
          </div>
        </DragHandle>

        {/* Lap times */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {[['Last', lastLap, 'rgba(255,255,255,0.8)'], ['Best', bestLap, '#22C55E']].map(([label, val, col]) => (
            <div key={label} style={{ flex: 1, padding: '5px 12px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: col }}>{fmt(val)}</div>
            </div>
          ))}
        </div>

        {/* Inputs row — wide rectangle like iRacing */}
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 14px 8px', gap: 10 }}>

          {/* Pedal bars — take most of the width */}
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            <PedalBar value={throttle} color={THROTTLE_COL} label="THR" />
            <PedalBar value={brake}    color={BRAKE_COL}    label="BRK" />
            <PedalBar value={clutch}   color={CLUTCH_COL}   label="CLT" />
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 110, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

          {/* Steering + gear/speed */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <SteeringWheel value={steering} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 900, lineHeight: 1,
                color: gear === 0 ? 'rgba(255,255,255,0.4)' : '#fff',
              }}>
                {gearLabel}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
                  {Math.round(speed)}
                </span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>KMH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trace graph */}
        <div style={{ margin: '0 10px 10px', borderRadius: 4, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 10, padding: '3px 8px 2px', alignItems: 'center' }}>
            {[['THR', THROTTLE_COL], ['BRK', BRAKE_COL], ['CLT', CLUTCH_COL]].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 2, background: c, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>{l}</span>
              </div>
            ))}
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>5s</span>
          </div>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: `${TRACE_H}px` }} />
        </div>

      </div>
    </div>
  )
}
