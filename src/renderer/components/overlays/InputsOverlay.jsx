import React, { useRef, useEffect, useCallback } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const HISTORY      = 300
const CONTENT_H    = 62
const THROTTLE_COL = '#22C55E'
const BRAKE_COL    = '#E8001D'
const CLUTCH_COL   = '#60A5FA'

// Compact vertical pedal bar — stretches to fill parent height
function PedalBar({ value = 0, color, label }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 14, height: '100%' }}>
      <div style={{
        width: '100%', flex: 1, minHeight: 0,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 2, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: color,
          borderRadius: '0 0 2px 2px',
          transition: 'height 0.025s linear',
          boxShadow: pct > 5 ? `0 0 6px ${color}66` : 'none',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 7, fontWeight: 700,
        letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase', lineHeight: 1,
      }}>
        {label}
      </span>
    </div>
  )
}

// Steering wheel — sized to fit compact content row
function SteeringWheel({ value = 0, maxAngle = 450 }) {
  const deg = value * maxAngle
  const cx = 26, cy = 26, r = 20

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 }}>
      <svg
        width={52} height={52} viewBox="0 0 52 52"
        style={{ transform: `rotate(${deg}deg)`, transition: 'transform 0.025s linear' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={4} />
        <circle cx={cx} cy={cy} r={5} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
        {[0, 120, 240].map(a => {
          const rad = (a - 90) * Math.PI / 180
          return <line key={a}
            x1={cx + 6 * Math.cos(rad)} y1={cy + 6 * Math.sin(rad)}
            x2={cx + (r - 1) * Math.cos(rad)} y2={cy + (r - 1) * Math.sin(rad)}
            stroke="rgba(255,255,255,0.3)" strokeWidth={3} strokeLinecap="round" />
        })}
        <circle cx={cx} cy={cy - r + 3} r={2.5} fill="#E8001D" />
      </svg>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
        color: Math.abs(value) > 0.02 ? '#fff' : 'rgba(255,255,255,0.2)',
        lineHeight: 1,
      }}>
        {value >= 0 ? 'R' : 'L'} {Math.abs(Math.round(deg))}°
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.07)', margin: '4px 0', flexShrink: 0 }} />
}

export default function InputsOverlay() {
  const { data }  = useTelemetry()
  const canvasRef = useRef(null)
  const historyRef = useRef([])
  const rafRef    = useRef(null)

  useEffect(() => {
    if (!data) return
    historyRef.current.push({
      throttle: Math.max(0, Math.min(1, data.throttle ?? 0)),
      brake:    Math.max(0, Math.min(1, data.brake    ?? 0)),
      clutch:   Math.max(0, Math.min(1, data.clutch   ?? 0)),
    })
    if (historyRef.current.length > HISTORY) historyRef.current.shift()
  }, [data])

  const drawTrace = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    if (W === 0 || H === 0) return

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

  useEffect(() => {
    const loop = () => { drawTrace(); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawTrace])

  const throttle  = data?.throttle ?? 0
  const brake     = data?.brake    ?? 0
  const clutch    = data?.clutch   ?? 0
  // iRacing SteeringWheelAngle: positive=left — negate for display
  const steering  = -(data?.steering ?? 0)
  const gear      = data?.gear ?? 0
  const speed     = data?.speed ?? 0
  const gearLabel = gear === 0 ? 'N' : gear === -1 ? 'R' : String(gear)

  return (
    <ResizeHandles overlayId="inputs">
      <div className="overlay" style={{ width: 480 }}>

        <DragHandle overlayId="inputs" label="Inputs" />

        {/* Single compact content row — mirrors iRacing HUD layout */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          padding: '6px 12px', gap: 10,
          height: CONTENT_H,
        }}>

          {/* Scrolling input trace */}
          <div style={{
            flex: 1, minWidth: 0,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 4, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          </div>

          <Divider />

          {/* Current T / B / C bars */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'stretch' }}>
            <PedalBar value={throttle} color={THROTTLE_COL} label="T" />
            <PedalBar value={brake}    color={BRAKE_COL}    label="B" />
            <PedalBar value={clutch}   color={CLUTCH_COL}   label="C" />
          </div>

          <Divider />

          {/* Gear + Speed */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 1, minWidth: 46, flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 900, lineHeight: 1,
              color: '#F59E0B',
            }}>
              {gearLabel}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
              color: 'rgba(255,255,255,0.9)', lineHeight: 1,
            }}>
              {Math.round(speed)}
            </span>
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 7,
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
            }}>
              KMH
            </span>
          </div>

          <Divider />

          {/* Steering wheel */}
          <SteeringWheel value={steering} />

        </div>
      </div>
    </ResizeHandles>
  )
}
