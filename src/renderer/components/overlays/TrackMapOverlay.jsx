import React, { useEffect, useRef, useMemo } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import { useOverlayScale } from '../../hooks/useOverlayScale'

const TRACK_POINTS = [
  [0.50,0.08],[0.62,0.07],[0.74,0.09],[0.83,0.14],[0.90,0.22],[0.93,0.32],
  [0.92,0.44],[0.88,0.54],[0.82,0.62],[0.74,0.68],[0.65,0.72],[0.58,0.74],
  [0.52,0.78],[0.48,0.84],[0.46,0.90],[0.44,0.90],[0.38,0.84],[0.30,0.78],
  [0.22,0.74],[0.16,0.68],[0.10,0.60],[0.07,0.50],[0.07,0.40],[0.09,0.30],
  [0.14,0.22],[0.20,0.15],[0.28,0.10],[0.38,0.08],[0.50,0.08]
]

const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

function trackToCanvas(point, W, H, pad = 14) {
  return [pad + point[0] * (W - pad * 2), pad + point[1] * (H - pad * 2)]
}

function getPosOnTrack(pct, W, H, pad = 14) {
  const total = TRACK_POINTS.length - 1
  const idx = pct * total
  const i = Math.floor(idx) % total
  const j = (i + 1) % total
  const t = idx - Math.floor(idx)
  const p1 = trackToCanvas(TRACK_POINTS[i], W, H, pad)
  const p2 = trackToCanvas(TRACK_POINTS[j], W, H, pad)
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]
}

export default function TrackMapOverlay() {
  const { data, connected } = useTelemetry()
  const scale = useOverlayScale('trackmap')
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  const drivers = useMemo(() => data?.relative || [], [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function draw() {
      const W = canvas.width, H = canvas.height, PAD = 14
      ctx.clearRect(0, 0, W, H)

      // Track outline
      ctx.beginPath()
      const first = trackToCanvas(TRACK_POINTS[0], W, H, PAD)
      ctx.moveTo(first[0], first[1])
      for (let i = 1; i < TRACK_POINTS.length; i++) {
        const [x, y] = trackToCanvas(TRACK_POINTS[i], W, H, PAD)
        ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 10
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()

      // Centre line
      ctx.beginPath()
      ctx.moveTo(first[0], first[1])
      for (let i = 1; i < TRACK_POINTS.length; i++) {
        const [x, y] = trackToCanvas(TRACK_POINTS[i], W, H, PAD)
        ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Pit lane
      const pitStart = trackToCanvas([0.44, 0.90], W, H, PAD)
      const pitEnd   = trackToCanvas([0.50, 0.08], W, H, PAD)
      ctx.beginPath()
      ctx.moveTo(pitStart[0] + 4, pitStart[1])
      ctx.lineTo(pitEnd[0] + 4, pitEnd[1])
      ctx.strokeStyle = 'rgba(245,158,11,0.3)'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.stroke()
      ctx.setLineDash([])

      // Non-player dots
      drivers.filter(d => !d.isPlayer).forEach(d => {
        const pct = ((d.lapDistPct || 0) + 1) % 1
        const [x, y] = getPosOnTrack(pct, W, H, PAD)
        const colour = d.colour || DRIVER_COLOURS[d.carIdx % DRIVER_COLOURS.length]
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill()
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = colour; ctx.fill()
        if (d.onPitRoad) {
          ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2)
          ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1; ctx.stroke()
        }
      })

      // Player dot (on top)
      const player = drivers.find(d => d.isPlayer)
      if (player) {
        const pct = ((player.lapDistPct || 0.3) + 1) % 1
        const [x, y] = getPosOnTrack(pct, W, H, PAD)
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(232,0,29,0.25)'; ctx.lineWidth = 2; ctx.stroke()
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(232,0,29,0.6)'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#E8001D'; ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [drivers])

  if (!connected || !data) {
    return (
      <div className="overlay" style={{ width: 200, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', transformOrigin: 'top left', transform: `scale(${scale})`, display: 'inline-block' }}>
      <ResizeHandles overlayId="trackmap" />
      <div className="overlay" style={{ width: 200 }}>
        <DragHandle overlayId="trackmap" label="Track Map">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>Silverstone</span>
        </DragHandle>
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={192} height={192} style={{ display: 'block', width: '100%' }} />
        </div>
        <div style={{ padding: '4px 10px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8001D' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>You</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Pitting</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 2, background: 'rgba(245,158,11,0.4)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Pit lane</span>
          </div>
        </div>
      </div>
    </div>
  )
}
