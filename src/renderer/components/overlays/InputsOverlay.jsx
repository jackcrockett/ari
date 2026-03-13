import React, { useRef, useEffect, useCallback } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { useOverlayScale } from '../../hooks/useOverlayScale'

// Default (1x) dimensions
const DEFAULT_W  = 260
const DEFAULT_H  = 220
const TRACE_H_RATIO = 56 / DEFAULT_H   // trace canvas is 56/220 of overlay height at 1x
const HISTORY    = 180

const THROTTLE_COL = '#22C55E'
const BRAKE_COL    = '#E8001D'
const CLUTCH_COL   = '#94A3B8'

const COMPOUND_STYLE = {
  S: { bg: '#E8001D', label: 'SOFT' },
  M: { bg: '#F59E0B', label: 'MED'  },
  H: { bg: '#e2e8f0', label: 'HARD', color: '#0e0e10' },
  W: { bg: '#3B82F6', label: 'WET'  },
  I: { bg: '#22C55E', label: 'INTER' },
}

function PedalBar({ value = 0, color, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ width: 18, height: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${value * 100}%`, background: color, borderRadius: 3, transition: 'height 0.03s linear', boxShadow: value > 0.05 ? `0 0 8px ${color}55` : 'none' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: value > 0.05 ? color : 'rgba(255,255,255,0.2)', transition: 'color 0.1s' }}>
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
  const r = 28, cx = 40, cy = 40
  const toRad = (d) => ((d - 90) * Math.PI) / 180
  const arcStart = toRad(-maxDeg), arcEnd = toRad(maxDeg)
  const arcX1 = cx + r * Math.cos(arcStart), arcY1 = cy + r * Math.sin(arcStart)
  const arcX2 = cx + r * Math.cos(arcEnd),   arcY2 = cy + r * Math.sin(arcEnd)
  const dotX  = cx + r * Math.cos(toRad(deg)), dotY = cy + r * Math.sin(toRad(deg))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={80} height={50} viewBox="0 0 80 56">
        <path d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${arcX2} ${arcY2}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} strokeLinecap="round" />
        <line x1={cx} y1={cy-r-4} x2={cx} y2={cy-r+4} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <circle cx={dotX} cy={dotY} r={4} fill="#fff" opacity={0.9} />
        <circle cx={dotX} cy={dotY} r={2} fill="#E8001D" />
      </svg>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: Math.abs(clamp) > 0.05 ? '#fff' : 'rgba(255,255,255,0.2)' }}>
        {clamp >= 0 ? 'R' : 'L'} {Math.round(Math.abs(clamp) * 100)}°
      </span>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
        STEER
      </span>
    </div>
  )
}

export default function InputsOverlay() {
  const { data, connected }              = useTelemetry()
  const { scale, windowW, windowH }      = useOverlayScale('inputs')
  const canvasRef                        = useRef(null)
  const historyRef                       = useRef([])

  // Actual canvas pixel size = window size (crisp at any scale)
  // Fall back to default*scale if window dims not yet known
  const canvasW = windowW  ? windowW - 24           : Math.round((DEFAULT_W - 24) * scale)
  const canvasH = windowH  ? Math.round(windowH * TRACE_H_RATIO * 1.6) : Math.round(56 * scale)

  // Append to history ring buffer
  useEffect(() => {
    if (!data) return
    historyRef.current.push({ throttle: data.throttle ?? 0, brake: data.brake ?? 0, clutch: data.clutch ?? 0 })
    if (historyRef.current.length > HISTORY) historyRef.current.shift()
  }, [data])

  // Draw trace — uses actual canvas pixel dimensions so it's always crisp
  const drawTrace = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx   = canvas.getContext('2d')
    const cw    = canvas.width
    const ch    = canvas.height
    const PAD_T = Math.round(ch * 0.05)
    const PAD_B = Math.round(ch * 0.04)
    const drawH = ch - PAD_T - PAD_B
    const h     = historyRef.current
    const toY   = (v) => PAD_T + (1 - v) * drawH

    ctx.clearRect(0, 0, cw, ch)

    const drawLine = (key, color) => {
      if (h.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth   = Math.max(1.5, cw / 150)   // thicker line at higher res
      ctx.lineJoin    = 'round'
      ctx.lineCap     = 'round'
      h.forEach((s, i) => {
        const x = (i / (HISTORY - 1)) * cw
        const y = toY(s[key])
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.beginPath()
      h.forEach((s, i) => {
        const x = (i / (HISTORY - 1)) * cw
        const y = toY(s[key])
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.lineTo(cw, toY(0))
      ctx.lineTo(0,  toY(0))
      ctx.closePath()
      ctx.fillStyle = color + '18'
      ctx.fill()
    }

    drawLine('clutch',   CLUTCH_COL)
    drawLine('brake',    BRAKE_COL)
    drawLine('throttle', THROTTLE_COL)

    // Playhead
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth   = 1
    ctx.setLineDash([2, 3])
    ctx.moveTo(cw, 0)
    ctx.lineTo(cw, ch)
    ctx.stroke()
    ctx.setLineDash([])
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(drawTrace)
    return () => cancelAnimationFrame(frame)
  }, [data, drawTrace, canvasW, canvasH])

  if (!connected || !data) {
    return (
      <div className="overlay" style={{ width: DEFAULT_W, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  const { throttle = 0, brake = 0, clutch = 0, steering = 0, delta, tyreCompound } = data
  const compound      = COMPOUND_STYLE[tyreCompound] || COMPOUND_STYLE['M']
  const deltaPositive = delta > 0
  const deltaStr      = delta != null ? `${deltaPositive ? '+' : ''}${delta.toFixed(3)}` : null

  return (
    <div style={{ position: 'relative', transformOrigin: 'top left', transform: `scale(${scale})`, display: 'inline-block' }}>
      <ResizeHandles overlayId="inputs" />
      <div className="overlay" style={{ width: DEFAULT_W }}>

        <DragHandle overlayId="inputs" label="Inputs">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {tyreCompound && (
              <div style={{ background: compound.bg, color: compound.color || '#fff', fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 3 }}>
                {compound.label}
              </div>
            )}
            {deltaStr && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: deltaPositive ? '#E8001D' : '#22C55E' }}>
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
          {/* Canvas resolution matches actual window pixels — no CSS stretching blur */}
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            style={{ display: 'block', width: '100%', height: canvasH / scale }}
          />
        </div>
      </div>
    </div>
  )
}
