import React, { useEffect, useRef, useState } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const CAR_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

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

export default function TrackMapOverlay() {
  const { data }   = useTelemetry()
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const ptsRef     = useRef(null)
  const trackIdRef = useRef(null)
  const [ready, setReady] = useState(false)

  const hasElectron = typeof window !== 'undefined' && window.ari && window.ari.trackmapLoad
  const trackId     = data && (data.trackId || data.trackName) || null
  const trackName   = (data && data.trackName) || 'Track Map'
  const drivers     = (data && data.relative) || []

  // Load track from store when track changes
  useEffect(() => {
    if (!trackId || trackId === trackIdRef.current) return
    trackIdRef.current = trackId
    ptsRef.current = null
    setReady(false)

    const load = async () => {
      // Try Electron store (has bundled + ibt-scanned tracks)
      if (hasElectron) {
        try {
          const pts = await window.ari.trackmapLoad(String(trackId))
          if (pts && pts.length > 50) {
            ptsRef.current = pts
            setReady(true)
            return
          }
        } catch(_) {}
      }
      // localStorage fallback
      try {
        const raw = localStorage.getItem('ari_track_' + trackId)
        if (raw) {
          const pts = JSON.parse(raw)
          if (pts && pts.length > 50) { ptsRef.current = pts; setReady(true) }
        }
      } catch(_) {}
    }

    load()
  }, [trackId, hasElectron])

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw() {
      const W = canvas.width, H = canvas.height, PAD = 10
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      const pts = ptsRef.current

      if (pts && pts.length > 10) {
        // Track outline
        ctx.beginPath()
        const [fx, fy] = toCanvas(pts[0], W, H, PAD)
        ctx.moveTo(fx, fy)
        pts.slice(1).forEach(p => { const [x,y] = toCanvas(p,W,H,PAD); ctx.lineTo(x,y) })
        ctx.closePath()
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth   = 7
        ctx.lineJoin    = 'round'
        ctx.lineCap     = 'round'
        ctx.stroke()

        // Centre line
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        pts.slice(1).forEach(p => { const [x,y] = toCanvas(p,W,H,PAD); ctx.lineTo(x,y) })
        ctx.closePath()
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'
        ctx.lineWidth   = 1.5
        ctx.stroke()

        // S/F marker
        ctx.beginPath()
        ctx.arc(fx, fy, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fill()

        // Other drivers
        drivers.filter(d => !d.isPlayer).forEach(d => {
          const [x,y] = posOnTrack(d.lapDistPct, pts, W, H, PAD)
          const col = d.colour || CAR_COLOURS[d.carIdx % CAR_COLOURS.length]
          ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fill()
          ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle=col; ctx.fill()
          if (d.onPitRoad) {
            ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2)
            ctx.strokeStyle='#F59E0B'; ctx.lineWidth=1; ctx.stroke()
          }
        })

        // Player
        const player = drivers.find(d => d.isPlayer)
        if (player) {
          const [x,y] = posOnTrack(player.lapDistPct, pts, W, H, PAD)
          ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2)
          ctx.strokeStyle='rgba(232,0,29,0.3)'; ctx.lineWidth=2; ctx.stroke()
          ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2)
          ctx.fillStyle='#E8001D'; ctx.fill()
        }

      } else {
        // No map available
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.font      = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('No map for this track', W/2, H/2 - 8)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.font      = '9px sans-serif'
        ctx.fillText('Drive a session to generate', W/2, H/2 + 8)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [drivers, ready])

  return (
    <ResizeHandles overlayId="trackmap">
      <div className="overlay" style={{ width: 210 }}>
        <DragHandle overlayId="trackmap" label="Track Map">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {trackName}
          </span>
        </DragHandle>
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={202} height={202} style={{ display: 'block', width: '100%' }} />
        </div>
        <div style={{ padding: '2px 10px 8px', display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8001D' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>You</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Others</span>
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
