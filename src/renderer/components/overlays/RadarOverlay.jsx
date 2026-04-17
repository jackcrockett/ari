import React, { useRef, useEffect } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

// Radar shows proximity by lapDistPct delta.
// iRacing does not expose X/Z for other cars in live telemetry,
// so we approximate: vertical axis = ahead/behind, horizontal = slight jitter by carIdx.
const CLOSE_PCT = 0.05   // within 5% of lap = "on radar"
const DANGER_PCT = 0.015 // within 1.5% = danger zone

export default function RadarOverlay() {
  const { data } = useTelemetry()
  const canvasRef = useRef(null)
  const animRef   = useRef(null)

  const drivers = data?.relative ?? []
  const player  = drivers.find(d => d.isPlayer)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2

    function draw() {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      // Background oval
      ctx.beginPath()
      ctx.ellipse(cx, cy, W * 0.42, H * 0.45, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Danger zone oval
      ctx.beginPath()
      ctx.ellipse(cx, cy, W * 0.2, H * 0.2, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(232,0,29,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Crosshair
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.45); ctx.lineTo(cx, cy + H * 0.45); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - W * 0.42, cy); ctx.lineTo(cx + W * 0.42, cy); ctx.stroke()

      // Player car (center)
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#E8001D'; ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(232,0,29,0.35)'; ctx.lineWidth = 2; ctx.stroke()

      // Other cars
      const playerPct = player?.lapDistPct ?? 0
      drivers.filter(d => !d.isPlayer).forEach(d => {
        let delta = d.lapDistPct - playerPct
        // Wrap around track
        if (delta > 0.5)  delta -= 1
        if (delta < -0.5) delta += 1
        if (Math.abs(delta) > CLOSE_PCT) return

        const relY  = -(delta / CLOSE_PCT) * H * 0.42  // ahead = up
        const jitter = ((d.carIdx * 137) % 11 - 5) / 5 * W * 0.15 // pseudo-random lateral offset
        const px = cx + jitter
        const py = cy + relY

        const isDanger = Math.abs(delta) < DANGER_PCT
        const col = isDanger ? '#F59E0B' : (d.colour || '#64748B')

        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = col; ctx.fill()
        if (isDanger) {
          ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2)
          ctx.strokeStyle = '#F59E0B88'; ctx.lineWidth = 1.5; ctx.stroke()
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [drivers, player])

  return (
    <ResizeHandles overlayId="radar">
      <div className="overlay" style={{ width: 170 }}>
        <DragHandle overlayId="radar" label="Radar" />
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={162} height={148} style={{ display: 'block', width: '100%' }} />
        </div>
        <div style={{ padding: '2px 8px 5px', display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8001D' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>You</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Close</span>
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
