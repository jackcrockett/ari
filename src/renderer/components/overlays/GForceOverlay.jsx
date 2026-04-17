import React, { useRef, useEffect } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const MAX_G = 4
const TRAIL_LEN = 40

export default function GForceOverlay() {
  const { data } = useTelemetry()
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const trailRef  = useRef([])

  const latG = data?.latAccel ?? 0
  const lonG = data?.lonAccel ?? 0

  useEffect(() => {
    trailRef.current.push({ lat: latG, lon: lonG })
    if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift()
  }, [latG, lonG])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2
    const R  = Math.min(cx, cy) - 8

    function draw() {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      // Circles
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ;[1, 2, 3, 4].forEach(g => {
        ctx.beginPath()
        ctx.arc(cx, cy, (g / MAX_G) * R, 0, Math.PI * 2)
        ctx.stroke()
      })
      // Crosshairs
      ctx.beginPath()
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy)
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.stroke()

      // G labels
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '7px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ;[1,2,3,4].forEach(g => ctx.fillText(`${g}G`, cx + (g / MAX_G) * R + 2, cy))

      // Trail
      const trail = trailRef.current
      for (let i = 1; i < trail.length; i++) {
        const p = trail[i - 1], q = trail[i]
        const alpha = i / trail.length * 0.5
        ctx.beginPath()
        ctx.moveTo(cx + (p.lat / MAX_G) * R, cy - (p.lon / MAX_G) * R)
        ctx.lineTo(cx + (q.lat / MAX_G) * R, cy - (q.lon / MAX_G) * R)
        ctx.strokeStyle = `rgba(59,130,246,${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Current dot
      const px = cx + (latG / MAX_G) * R
      const py = cy - (lonG / MAX_G) * R
      const totalG = Math.sqrt(latG * latG + lonG * lonG)
      const dotColor = totalG > 3 ? '#E8001D' : totalG > 2 ? '#F59E0B' : '#3B82F6'
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = dotColor; ctx.fill()
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2)
      ctx.strokeStyle = dotColor + '55'; ctx.lineWidth = 1.5; ctx.stroke()

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [latG, lonG])

  return (
    <ResizeHandles overlayId="gforce">
      <div className="overlay" style={{ width: 152 }}>
        <DragHandle overlayId="gforce" label="G-Force" />
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={144} height={144} style={{ display: 'block', width: '100%' }} />
        </div>
        <div style={{ padding: '2px 8px 6px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            LAT {latG.toFixed(2)}G
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            LON {lonG.toFixed(2)}G
          </span>
        </div>
      </div>
    </ResizeHandles>
  )
}
