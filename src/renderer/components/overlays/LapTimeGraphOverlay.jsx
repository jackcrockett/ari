import React, { useRef, useEffect, useState } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function LapTimeGraphOverlay() {
  const { data } = useTelemetry()
  const canvasRef   = useRef(null)
  const prevLapRef  = useRef(null)
  const [laps, setLaps] = useState([])

  useEffect(() => {
    if (!data) return
    const lapNum  = data.currentLap
    const lapTime = data.lastLapTime
    if (!lapNum || !lapTime || lapTime <= 0) return
    if (lapNum === prevLapRef.current) return
    prevLapRef.current = lapNum
    setLaps(prev => [...prev, { lap: lapNum, time: lapTime }].slice(-25))
  }, [data?.currentLap])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    if (laps.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Complete laps to build chart', W / 2, H / 2)
      return
    }

    const PAD = { top: 8, right: 8, bottom: 20, left: 42 }
    const minT = Math.min(...laps.map(l => l.time))
    const maxT = Math.max(...laps.map(l => l.time))
    const range = Math.max(maxT - minT, 1)
    const pw = W - PAD.left - PAD.right
    const ph = H - PAD.top  - PAD.bottom

    const tx = (i) => PAD.left + (i / (laps.length - 1)) * pw
    const ty = (t) => PAD.top + ph - ((t - minT) / range) * ph

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let j = 0; j <= 4; j++) {
      const y = PAD.top + (j / 4) * ph
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      const t = maxT - (j / 4) * range
      const m = Math.floor(t / 60), s = (t % 60).toFixed(1)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '8px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      ctx.fillText(`${m}:${String(s).padStart(4,'0')}`, PAD.left - 3, y)
    }

    // Line
    ctx.beginPath()
    laps.forEach((l, i) => { i === 0 ? ctx.moveTo(tx(i), ty(l.time)) : ctx.lineTo(tx(i), ty(l.time)) })
    ctx.strokeStyle = 'rgba(59,130,246,0.7)'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Points
    laps.forEach((l, i) => {
      const isBest = l.time === minT
      ctx.beginPath()
      ctx.arc(tx(i), ty(l.time), isBest ? 4 : 2.5, 0, Math.PI * 2)
      ctx.fillStyle = isBest ? '#A855F7' : '#3B82F6'
      ctx.fill()
      // Lap number
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(l.lap, tx(i), H - PAD.bottom + 3)
    })
  }, [laps])

  return (
    <ResizeHandles overlayId="lapgraph">
      <div className="overlay" style={{ width: 288 }}>
        <DragHandle overlayId="lapgraph" label="Lap Graph">
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            {laps.length} laps
          </span>
        </DragHandle>
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={280} height={148} style={{ display: 'block', width: '100%' }} />
        </div>
      </div>
    </ResizeHandles>
  )
}
