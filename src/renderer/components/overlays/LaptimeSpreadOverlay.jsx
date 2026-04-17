import React, { useRef, useEffect } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function LaptimeSpreadOverlay() {
  const { data } = useTelemetry()
  const canvasRef = useRef(null)

  const standings = data?.standings ?? []
  const player    = standings.find(d => d.isPlayer)
  const times     = standings.filter(d => d.bestLapTime > 0).map(d => d.bestLapTime)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    if (times.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Waiting for lap times...', W / 2, H / 2)
      return
    }

    const minT = Math.min(...times)
    const maxT = Math.max(...times)
    const range = Math.max(maxT - minT, 0.5)
    const PAD = { left: 6, right: 6, top: 12, bottom: 16 }
    const pw = W - PAD.left - PAD.right

    // Draw range bar
    const barY = H / 2 - 8
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(PAD.left, barY, pw, 8)

    // Each driver as a tick
    standings.filter(d => d.bestLapTime > 0).forEach(d => {
      const x = PAD.left + ((d.bestLapTime - minT) / range) * pw
      const isPlayer = d.isPlayer
      ctx.fillStyle = isPlayer ? '#E8001D' : d.colour || 'rgba(255,255,255,0.3)'
      ctx.fillRect(x - (isPlayer ? 2 : 1), barY - (isPlayer ? 2 : 0), isPlayer ? 4 : 2, 8 + (isPlayer ? 4 : 0))
    })

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText(formatLapTime(minT), PAD.left, H - PAD.bottom + 2)
    ctx.textAlign = 'right'
    ctx.fillText(formatLapTime(maxT), W - PAD.right, H - PAD.bottom + 2)

    // Player marker label
    if (player && player.bestLapTime > 0) {
      const x = PAD.left + ((player.bestLapTime - minT) / range) * pw
      ctx.fillStyle = '#E8001D'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.font = '7px sans-serif'
      ctx.fillText('YOU', x, barY - 4)
    }
  }, [standings])

  const playerTime = player?.bestLapTime
  const playerRank = playerTime ? times.sort((a,b)=>a-b).indexOf(playerTime) + 1 : null

  return (
    <ResizeHandles overlayId="laptimespread">
      <div className="overlay" style={{ width: 268 }}>
        <DragHandle overlayId="laptimespread" label="Lap Time Spread">
          {playerRank && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
              P{playerRank} of {times.length} pace
            </span>
          )}
        </DragHandle>
        <div style={{ padding: 4 }}>
          <canvas ref={canvasRef} width={260} height={60} style={{ display: 'block', width: '100%' }} />
        </div>
      </div>
    </ResizeHandles>
  )
}
