import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const ALONGSIDE_PCT = 0.015 // within 1.5% of lap dist = alongside

export default function BlindSpotOverlay() {
  const { data } = useTelemetry()

  const drivers   = data?.relative ?? []
  const player    = drivers.find(d => d.isPlayer)
  const playerPct = player?.lapDistPct ?? 0

  // Any car within ALONGSIDE_PCT and NOT the player = someone alongside
  const close = drivers.filter(d => {
    if (d.isPlayer) return false
    let delta = d.lapDistPct - playerPct
    if (delta > 0.5)  delta -= 1
    if (delta < -0.5) delta += 1
    return Math.abs(delta) < ALONGSIDE_PCT
  })

  // Rough left/right split: use carIdx jitter parity (best effort without X/Z)
  const leftCar  = close.find(d => d.carIdx % 2 === 0)
  const rightCar = close.find(d => d.carIdx % 2 === 1) ?? close.find(d => !leftCar || d !== leftCar)

  const leftActive  = !!leftCar
  const rightActive = !!rightCar

  const indicator = (active, side) => (
    <div style={{
      flex: 1,
      height: 50,
      borderRadius: 5,
      background: active ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
      border: `2px solid ${active ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.1s ease',
    }}>
      {active && (
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.06em' }}>
          {side}
        </span>
      )}
    </div>
  )

  return (
    <ResizeHandles overlayId="blindspot">
      <div className="overlay" style={{ width: 150 }}>
        <DragHandle overlayId="blindspot" label="Blind Spot" />
        <div style={{ display: 'flex', gap: 4, padding: '5px 6px 7px' }}>
          {indicator(leftActive, 'L')}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />
          {indicator(rightActive, 'R')}
        </div>
      </div>
    </ResizeHandles>
  )
}
