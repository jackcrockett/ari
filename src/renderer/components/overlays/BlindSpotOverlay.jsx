import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const ALONGSIDE_PCT = 0.012  // 1.2% of lap distance = alongside threshold

export default function BlindSpotOverlay() {
  const { data } = useTelemetry()

  const drivers   = data?.relative ?? []
  const player    = drivers.find(d => d.isPlayer)
  const playerPct = player?.lapDistPct ?? 0

  // Build close-car list with delta; filter out pitting/off-track cars
  const closeWithDelta = drivers
    .filter(d => {
      if (d.isPlayer) return false
      // trackSurface: 5=on track, 2=pit lane, 3=pit stall. null = demo data (allow through)
      if (d.trackSurface != null && d.trackSurface !== 5) return false
      return true
    })
    .map(d => {
      let delta = d.lapDistPct - playerPct
      if (delta > 0.5)  delta -= 1
      if (delta < -0.5) delta += 1
      return { ...d, delta }
    })
    .filter(d => Math.abs(d.delta) < ALONGSIDE_PCT)

  // delta < 0: car is just ahead of us (overlap forward)
  // delta >= 0: car is just behind or level (overlap from rear)
  const leftCars  = closeWithDelta.filter(d => d.delta < 0)
  const rightCars = closeWithDelta.filter(d => d.delta >= 0)

  const leftActive  = leftCars.length > 0
  const rightActive = rightCars.length > 0

  const indicator = (active, cars, side) => (
    <div style={{
      flex: 1, height: 50, borderRadius: 5,
      background: active ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
      border: `2px solid ${active ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 1,
      transition: 'all 0.1s ease',
    }}>
      {active ? (
        <>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.06em', lineHeight: 1 }}>
            {side}
          </span>
          {cars[0]?.carNumber && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(245,158,11,0.7)', lineHeight: 1 }}>
              #{cars[0].carNumber}
            </span>
          )}
        </>
      ) : null}
    </div>
  )

  return (
    <ResizeHandles overlayId="blindspot">
      <div className="overlay" style={{ width: 150 }}>
        <DragHandle overlayId="blindspot" label="Blind Spot" />
        <div style={{ display: 'flex', gap: 4, padding: '5px 6px 7px' }}>
          {indicator(leftActive, leftCars, 'FWD')}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />
          {indicator(rightActive, rightCars, 'RR')}
        </div>
      </div>
    </ResizeHandles>
  )
}
