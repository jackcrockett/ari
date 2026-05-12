import React, { useRef, useEffect, useCallback } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'

const HISTORY      = 300
const THROTTLE_COL = '#22C55E'
const BRAKE_COL    = '#ff2348'

// Vertical pedal bar — fills bottom-to-top, no decorative labels
function VBar({ value = 0, color }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
        color: pct > 2 ? color : 'rgba(255,255,255,0.15)', lineHeight: 1,
        minWidth: 16, textAlign: 'center',
      }}>
        {pct}
      </span>
      <div style={{
        width: 12, flex: 1,
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 2, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: color,
          borderRadius: '0 0 2px 2px',
          transition: 'height 0.04s linear',
          boxShadow: pct > 2 ? `0 0 5px ${color}55` : 'none',
        }} />
      </div>
    </div>
  )
}

// Simple steering wheel — ring + hub + one top indicator dot
function SteeringWheel({ value = 0, maxAngle = 450 }) {
  const deg = value * maxAngle
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg
        width={38} height={38} viewBox="0 0 38 38"
        style={{ transform: `rotate(${deg}deg)`, transition: 'transform 0.04s linear' }}
      >
        {/* Outer ring */}
        <circle cx={19} cy={19} r={15} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={3} />
        {/* Center hub */}
        <circle cx={19} cy={19} r={5} fill="rgba(255,255,255,0.55)" />
        {/* Top indicator */}
        <circle cx={19} cy={5} r={2.5} fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  )
}

export default function InputsOverlay() {
  const { data }   = useTelemetry()
  const canvasRef  = useRef(null)
  const historyRef = useRef([])
  const rafRef     = useRef(null)

  useEffect(() => {
    if (!data) return
    historyRef.current.push({
      throttle: Math.max(0, Math.min(1, data.throttle ?? 0)),
      brake:    Math.max(0, Math.min(1, data.brake    ?? 0)),
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
      ctx.fillStyle = color + '18'
      ctx.fill()
    }

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
  const gear      = data?.gear ?? 0
  const speed     = data?.speed ?? 0
  const steering  = data?.steering ?? 0
  const gearLabel = gear === 0 ? 'N' : gear === -1 ? 'R' : String(gear)

  return (
    <div className="overlay" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
      <DragHandle overlayId="inputs" label="Inputs" />

      {/* Gear + speed */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '6px 10px', flexShrink: 0, minWidth: 44,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 900, lineHeight: 1,
          color: '#F59E0B',
        }}>
          {gearLabel}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          color: 'rgba(255,255,255,0.55)', lineHeight: 1, marginTop: 2,
        }}>
          {speed}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />

      {/* T + B bars */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 4, padding: '6px 8px', alignSelf: 'stretch', flexShrink: 0 }}>
        <VBar value={throttle} color={THROTTLE_COL} />
        <VBar value={brake}    color={BRAKE_COL} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />

      {/* Steering wheel */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
        <SteeringWheel value={steering} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />

      {/* Trace graph — absolutely fills its flex slot */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', background: 'rgba(0,0,0,0.3)', margin: '4px', borderRadius: 2, alignSelf: 'stretch' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  )
}
