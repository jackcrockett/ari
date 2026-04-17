import React, { useEffect, useRef } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

// Schematic oval/circuit approximation using lapDistPct only — no GPS needed.
// Generates a smooth closed oval path and places cars along it by pct.
function makeOvalPoints(W, H, pad) {
  const pts = []
  const cx = W / 2, cy = H / 2
  const rx = W / 2 - pad, ry = H / 2 - pad - 8
  for (let i = 0; i < 200; i++) {
    const angle = (i / 200) * Math.PI * 2 - Math.PI / 2
    pts.push([(cx + Math.cos(angle) * rx) / W, (cy + Math.sin(angle) * ry) / H])
  }
  return pts
}

function posOnOval(pct, W, H, pad) {
  const cx = W / 2, cy = H / 2
  const rx = W / 2 - pad, ry = H / 2 - pad - 8
  const angle = (((pct || 0) % 1) * Math.PI * 2) - Math.PI / 2
  return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]
}

export default function FlatMapOverlay() {
  const { data }   = useTelemetry()
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const drivers    = data?.relative ?? []
  const trackName  = data?.trackName || 'Track'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const PAD = 14

    function draw() {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      // Draw oval outline
      ctx.beginPath()
      ctx.ellipse(W/2, H/2, W/2 - PAD, H/2 - PAD - 8, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 8
      ctx.lineJoin = 'round'; ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1.5; ctx.stroke()

      // S/F line at top
      const sfX = W / 2
      ctx.beginPath()
      ctx.moveTo(sfX, PAD + 4); ctx.lineTo(sfX, PAD - 4)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke()

      // Other drivers
      drivers.filter(d => !d.isPlayer).forEach(d => {
        const [x,y] = posOnOval(d.lapDistPct, W, H, PAD)
        ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill()
        ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2)
        ctx.fillStyle = d.colour || 'rgba(255,255,255,0.4)'; ctx.fill()
      })

      // Player
      const player = drivers.find(d => d.isPlayer)
      if (player) {
        const [x,y] = posOnOval(player.lapDistPct, W, H, PAD)
        ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2)
        ctx.strokeStyle = 'rgba(232,0,29,0.3)'; ctx.lineWidth = 2; ctx.stroke()
        ctx.beginPath(); ctx.arc(x,y,4.5,0,Math.PI*2)
        ctx.fillStyle = '#E8001D'; ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [drivers])

  return (
    <ResizeHandles overlayId="flatmap">
      <div className="overlay" style={{ width: 190 }}>
        <DragHandle overlayId="flatmap" label="Flat Map">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {trackName}
          </span>
        </DragHandle>
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={182} height={165} style={{ display: 'block', width: '100%' }} />
        </div>
      </div>
    </ResizeHandles>
  )
}
