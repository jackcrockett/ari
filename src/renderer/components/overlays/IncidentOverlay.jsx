import React, { useRef, useMemo } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

export default function IncidentOverlay() {
  const { data } = useTelemetry()
  const prevCountsRef = useRef({})

  const drivers = useMemo(() => {
    if (!data?.standings) return []
    return data.standings
      .filter(d => !d.isSpectator)
      .map(d => {
        const inc    = d.incidentCount ?? 0
        const prev   = prevCountsRef.current[d.carIdx] ?? inc
        const isNew  = inc > prev
        return { ...d, inc, isNew }
      })
      .sort((a, b) => b.inc - a.inc || a.position - b.position)
      .slice(0, 10)
  }, [data])

  // Update previous counts after render
  useMemo(() => {
    if (!data?.standings) return
    data.standings.forEach(d => {
      prevCountsRef.current[d.carIdx] = d.incidentCount ?? 0
    })
  }, [data])

  const totalInc = drivers.reduce((s, d) => s + d.inc, 0)

  return (
    <ResizeHandles overlayId="incident">
      <div className="overlay" style={{ width: 220 }}>
        <DragHandle overlayId="incident" label="Incidents">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            {totalInc}x total
          </span>
        </DragHandle>

        {drivers.length === 0 && (
          <div style={{ padding: '8px 10px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            No incident data
          </div>
        )}

        {drivers.map((d, i) => {
          const colour = d.colour || DRIVER_COLOURS[d.carIdx % DRIVER_COLOURS.length]
          return (
            <div key={d.carIdx} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '4px 10px',
              background: d.isPlayer
                ? 'rgba(232,0,29,0.08)'
                : d.isNew ? 'rgba(245,158,11,0.06)' : 'transparent',
              borderBottom: i < drivers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderLeft: d.isPlayer ? '2px solid #E8001D' : d.isNew ? '2px solid #F59E0B' : '2px solid transparent',
            }}>
              <span style={{
                fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600,
                color: 'rgba(255,255,255,0.25)', width: 18, textAlign: 'right', flexShrink: 0,
              }}>
                P{d.position}
              </span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: colour, flexShrink: 0 }} />
              <span style={{
                fontFamily: 'var(--font-data)', fontSize: 11,
                fontWeight: d.isPlayer ? 600 : 400,
                color: d.isPlayer ? '#fff' : 'rgba(255,255,255,0.72)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {d.driverName}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                color: d.inc === 0
                  ? 'rgba(255,255,255,0.2)'
                  : d.inc >= 17 ? '#E8001D'
                  : d.inc >= 8  ? '#F59E0B'
                  : 'rgba(255,255,255,0.6)',
                flexShrink: 0,
              }}>
                {d.inc}x
              </span>
              {d.isNew && (
                <span style={{
                  fontFamily: 'var(--font-data)', fontSize: 7, fontWeight: 700,
                  color: '#F59E0B', background: 'rgba(245,158,11,0.15)',
                  padding: '1px 4px', borderRadius: 2, flexShrink: 0,
                }}>
                  NEW
                </span>
              )}
            </div>
          )
        })}
      </div>
    </ResizeHandles>
  )
}
