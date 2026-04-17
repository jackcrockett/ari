import React, { useState, useEffect, useRef } from 'react'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const HISTORY_LEN = 30

export default function HeartRateOverlay() {
  const [bpm, setBpm] = useState(null)
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState([])
  const canvasRef = useRef(null)

  // Simulate slight BPM variation when a value is set
  useEffect(() => {
    if (bpm == null) return
    const id = setInterval(() => {
      const jitter = Math.round((Math.random() - 0.5) * 4)
      const next = Math.max(40, Math.min(220, bpm + jitter))
      setHistory(h => [...h, next].slice(-HISTORY_LEN))
    }, 1000)
    return () => clearInterval(id)
  }, [bpm])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length < 2) return
    const W = canvas.width, H = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    const minH = Math.min(...history) - 5
    const maxH = Math.max(...history) + 5
    const range = Math.max(maxH - minH, 20)
    ctx.beginPath()
    history.forEach((v, i) => {
      const x = (i / (HISTORY_LEN - 1)) * W
      const y = H - ((v - minH) / range) * H
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#E8001D'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.stroke()
  }, [history])

  const zone = bpm == null ? null : bpm < 100 ? 'REST' : bpm < 140 ? 'ACTIVE' : bpm < 170 ? 'HIGH' : 'MAX'
  const zoneColor = zone === 'REST' ? '#22C55E' : zone === 'ACTIVE' ? '#3B82F6' : zone === 'HIGH' ? '#F59E0B' : '#E8001D'

  return (
    <ResizeHandles overlayId="heartrate">
      <div className="overlay" style={{ width: 152 }}>
        <DragHandle overlayId="heartrate" label="Heart Rate">
          <span onClick={() => setEditing(e => !e)} style={{ fontFamily: 'var(--font-data)', fontSize: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>
            {editing ? 'SET' : 'INPUT'}
          </span>
        </DragHandle>

        {editing ? (
          <div style={{ padding: '6px 10px 8px', display: 'flex', gap: 4 }}>
            <input
              type="number" min="40" max="220" placeholder="BPM"
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '4px 6px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
            <button
              onClick={() => { const v = parseInt(input); if (v > 0) { setBpm(v); setInput(''); setEditing(false) } }}
              style={{ background: '#E8001D', border: 'none', borderRadius: 4, color: '#fff', fontFamily: 'var(--font-data)', fontSize: 9, padding: '4px 8px', cursor: 'pointer' }}
            >OK</button>
          </div>
        ) : bpm == null ? (
          <div style={{ padding: '8px 10px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            No HRM — tap Input to enter BPM
          </div>
        ) : (
          <div style={{ padding: '5px 10px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: zoneColor, lineHeight: 1 }}>{history[history.length-1] ?? bpm}</span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>BPM</span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, color: zoneColor, marginLeft: 'auto', letterSpacing: '0.08em' }}>{zone}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <canvas ref={canvasRef} width={132} height={28} style={{ display: 'block', width: '100%', opacity: 0.7 }} />
            </div>
          </div>
        )}
      </div>
    </ResizeHandles>
  )
}
