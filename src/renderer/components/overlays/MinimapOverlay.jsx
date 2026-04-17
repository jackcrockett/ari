import React, { useEffect, useRef, useState } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

function toCanvas(pt, W, H, pad) {
  return [pad + pt[0] * (W - pad * 2), pad + (1 - pt[1]) * (H - pad * 2)]
}

function posOnTrack(pct, pts, W, H, pad) {
  if (!pts || pts.length < 2) return [W / 2, H / 2]
  const n = pts.length
  const f = (((pct || 0) % 1) + 1) % 1 * n
  const i = Math.floor(f) % n
  const t = f - Math.floor(f)
  const a = toCanvas(pts[i], W, H, pad)
  const b = toCanvas(pts[(i + 1) % n], W, H, pad)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export default function MinimapOverlay() {
  const { data }    = useTelemetry()
  const canvasRef   = useRef(null)
  const animRef     = useRef(null)
  const ptsRef      = useRef(null)
  const trackIdRef  = useRef(null)
  const [ready, setReady] = useState(false)

  const hasElectron = typeof window !== 'undefined' && window.ari && window.ari.trackmapLoad
  const trackId     = data?.trackId || data?.trackName || null
  const drivers     = data?.relative ?? []

  useEffect(() => {
    if (!trackId || trackId === trackIdRef.current) return
    trackIdRef.current = trackId
    ptsRef.current = null
    setReady(false)
    const load = async () => {
      if (hasElectron) {
        try {
          const pts = await window.ari.trackmapLoad(String(trackId))
          if (pts && pts.length > 50) { ptsRef.current = pts; setReady(true); return }
        } catch(_) {}
      }
    }
    load()
  }, [trackId, hasElectron])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const PAD = 6

    function draw() {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      const pts = ptsRef.current

      if (pts && pts.length > 10) {
        ctx.beginPath()
        const [fx, fy] = toCanvas(pts[0], W, H, PAD)
        ctx.moveTo(fx, fy)
        pts.slice(1).forEach(p => { const [x,y] = toCanvas(p,W,H,PAD); ctx.lineTo(x,y) })
        ctx.closePath()
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 1; ctx.stroke()

        drivers.filter(d => !d.isPlayer).forEach(d => {
          const [x,y] = posOnTrack(d.lapDistPct, pts, W, H, PAD)
          ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2)
          ctx.fillStyle = d.colour || 'rgba(255,255,255,0.5)'; ctx.fill()
        })

        const player = drivers.find(d => d.isPlayer)
        if (player) {
          const [x,y] = posOnTrack(player.lapDistPct, pts, W, H, PAD)
          ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2)
          ctx.fillStyle = '#E8001D'; ctx.fill()
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('No map', W/2, H/2)
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [drivers, ready])

  return (
    <ResizeHandles overlayId="minimap">
      <div className="overlay" style={{ width: 140, background: 'rgba(8,8,10,0.82)' }}>
        <DragHandle overlayId="minimap" label="Map" />
        <div style={{ padding: 3 }}>
          <canvas ref={canvasRef} width={134} height={120} style={{ display: 'block', width: '100%' }} />
        </div>
      </div>
    </ResizeHandles>
  )
}
