import React, { useRef, useEffect, useCallback } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { useOverlayScale } from '../../hooks/useOverlayScale'

const W = 260
const TRACE_W = W - 24
const TRACE_H = 56
const PAD_T = 3
const PAD_B = 2
const HISTORY = 180

const THROTTLE_COL = '#22C55E'
const BRAKE_COL    = '#E8001D'
const CLUTCH_COL   = '#94A3B8'

const COMPOUND_STYLE = {
  S: { bg: '#E8001D', label: 'SOFT' },
  M: { bg: '#F59E0B', label: 'MED' },
  H: { bg: '#e2e8f0', label: 'HARD', color: '#0e0e10' },
  W: { bg: '#3B82F6', label: 'WET' },
  I: { bg: '#22C55E', label: 'INTER' },
}

function PedalBar({ value = 0, color, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ width: 18, height: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${value * 100}%`, background: color, borderRadius: 3, transition: 'height 0.03s linear', boxShadow: value > 0.05 ? `0 0 8px ${color}55` : 'none' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: value > 0.05 ? color : 'rgba(255,255,255,0.2)', letterSpacing: '0.02em', transition: 'color 0.1s' }}>
        {Math.round(value * 100)}
      </span>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function SteeringArc({ value = 0 }) {
  const clamp = Math.max(-1, Math.min(1, value))
  const maxDeg = 135
  const deg = clamp * maxDeg
  const r = 28
  const cx = 40, cy = 40
  const toRad = (d) => ((d - 90) * Math.PI) / 180
  const arcStart = toRad(-maxDeg)
  const arcEnd   = toRad(maxDeg)
  const arcX1 = cx + r * Math.cos(arcStart)
  const arcY1 = cy + r * Math.sin(arcStart)
  const arcX2 = cx + r * Math.cos(arcEnd)
  const arcY2 = cy + r * Math.sin(arcEnd)
  const dotAngle = toRad(deg)
  const dotX = cx + r * Math.cos(dotAngle)
  const dotY = cy + r * Math.sin(dotAngle)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={80} height={50} viewBox="0 0 80 56">
        <path d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${arcX2} ${arcY2}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} strokeLinecap="round" />
        <line x1={cx} y1={cy - r - 4} x2={cx} y2={cy - r + 4} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <circle cx={dotX} cy={dotY} r={4} fill="#fff" opacity={0.9} />
        <circle cx={dotX} cy={dotY} r={2} fill="#E8001D" />
      </svg>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: Math.abs(clamp) > 0.05 ? '#fff' : 'rgba(255,255,255,0.2)', letterSpacing: '0.02em' }}>
        {clamp >= 0 ? 'R' : 'L'} {Math.round(Math.abs(clamp) * 100)}°
      </span>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
        STEER
      </span>
    </div>
  )
}

export default function InputsOverlay() {
  const { data, connected } = useTelemetry()
  const scale = useOverlayScale('inputs')
  const canvasRef = useRef(null)
  const historyRef = useRef([])

  useEffect(() => {
    if (!data) return
    historyRef.current.push({ throttle: data.throttle ?? 0, brake: data.brake ?? 0, clutch: data.clutch ?? 0 })
    if (historyRef.current.length > HISTORY) historyRef.current.shift()
  }, [data])

  const drawTrace = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const h = historyRef.current
    ctx.clearRect(0, 0, TRACE_W, TRACE_H)

    const drawH = TRACE_H - PAD_T - PAD_B
    const toY = (v) => PAD_T + (1 - v) * drawH

    const drawLine = (key, color) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      h.forEach((sample, i) => {
        const x = (i / (HISTORY - 1)) * TRACE_W
        const y = toY(sample[key])
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      if (h.length > 1) {
        ctx.beginPath()
        h.forEach((sample, i) => {
          const x = (i / (HISTORY - 1)) * TRACE_W
          const y = toY(sample[key])
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.lineTo(TRACE_W, toY(0))
        ctx.lineTo(0, toY(0))
        ctx.closePath()
        ctx.fillStyle = color + '18'
        ctx.fill()
      }
    }

    drawLine('clutch', CLUTCH_COL)
    drawLine('brake', BRAKE_COL)
    drawLine('throttle', THROTTLE_COL)

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.moveTo(TRACE_W, 0)
    ctx.lineTo(TRACE_W, TRACE_H)
    ctx.stroke()
    ctx.setLineDash([])
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(drawTrace)
    return () => cancelAnimationFrame(frame)
  }, [data, drawTrace])

  if (!connected || !data) {
    return (
      <div className="overlay" style={{ width: W, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  const { throttle = 0, brake = 0, clutch = 0, steering = 0, delta, tyreCompound } = data
  const compound = COMPOUND_STYLE[tyreCompound] || COMPOUND_STYLE['M']
  const deltaPositive = delta > 0
  const deltaStr = delta != null ? `${deltaPositive ? '+' : ''}${delta.toFixed(3)}` : null

  return (
    <div style={{ position: 'relative', transformOrigin: 'top left', transform: `scale(${scale})`, display: 'inline-block' }}>
      <ResizeHandles overlayId="inputs" />
      <div className="overlay" style={{ width: W }}>
        <DragHandle overlayId="inputs" label="Inputs">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {tyreCompound && (
              <div style={{ background: compound.bg, color: compound.color || '#fff', fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 3 }}>
                {compound.label}
              </div>
            )}
            {deltaStr && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: deltaPositive ? '#E8001D' : '#22C55E', letterSpacing: '0.02em' }}>
                {deltaStr}
              </span>
            )}
          </div>
        </DragHandle>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, padding: '10px 14px 6px' }}>
          <PedalBar value={throttle} color={THROTTLE_COL} label="THR" />
          <PedalBar value={brake}    color={BRAKE_COL}    label="BRK" />
          <PedalBar value={clutch}   color={CLUTCH_COL}   label="CLT" />
          <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.06)', margin: '0 2px' }} />
          <SteeringArc value={steering} />
        </div>

        <div style={{ margin: '2px 12px 10px', borderRadius: 4, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 10, padding: '4px 8px 2px' }}>
            {[['THR', THROTTLE_COL], ['BRK', BRAKE_COL], ['CLT', CLUTCH_COL]].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 2, background: c, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>{l}</span>
              </div>
            ))}
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>3s</span>
          </div>
          <canvas ref={canvasRef} width={TRACE_W} height={TRACE_H} style={{ display: 'block', width: '100%' }} />
        </div>
      </div>
    </div>
  )
}
