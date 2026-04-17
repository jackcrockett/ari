import React, { useState } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const ALL_BLOCKS = [
  { id: 'gear',      label: 'GEAR',       get: d => d?.gear ?? '—' },
  { id: 'speed',     label: 'SPEED',      get: d => d?.speed != null ? `${d.speed} km/h` : '—' },
  { id: 'rpm',       label: 'RPM',        get: d => d?.rpm != null ? d.rpm.toLocaleString() : '—' },
  { id: 'lap',       label: 'LAP',        get: d => d?.currentLap != null ? `${d.currentLap} / ${d.totalLaps || '?'}` : '—' },
  { id: 'pos',       label: 'POSITION',   get: d => { const p = d?.standings?.find(x => x.isPlayer); return p ? `P${p.position}` : '—' } },
  { id: 'delta',     label: 'DELTA',      get: d => d?.delta != null ? `${d.delta > 0 ? '+' : ''}${d.delta.toFixed(3)}s` : '—' },
  { id: 'fuel',      label: 'FUEL',       get: d => d?.fuel?.level != null ? `${d.fuel.level.toFixed(2)}L` : '—' },
  { id: 'lapfuel',   label: 'FUEL/LAP',   get: d => d?.fuel?.perLap != null ? `${d.fuel.perLap.toFixed(2)}L` : '—' },
  { id: 'bestlap',   label: 'BEST LAP',   get: d => d?.bestLapTime ? formatLapTime(d.bestLapTime) : '—' },
  { id: 'lastlap',   label: 'LAST LAP',   get: d => d?.lastLapTime ? formatLapTime(d.lastLapTime) : '—' },
  { id: 'tracktemp', label: 'TRACK °C',   get: d => d?.trackTemp != null ? `${d.trackTemp.toFixed(1)}°` : '—' },
  { id: 'airtemp',   label: 'AIR °C',     get: d => d?.airTemp   != null ? `${d.airTemp.toFixed(1)}°` : '—' },
  { id: 'sessiont',  label: 'SESSION',    get: d => d?.sessionType || '—' },
  { id: 'remain',    label: 'LAPS LEFT',  get: d => d?.lapsRemain != null ? String(d.lapsRemain) : '—' },
  { id: 'latg',      label: 'LAT G',      get: d => d?.latAccel != null ? `${d.latAccel.toFixed(2)}G` : '—' },
  { id: 'long',      label: 'LON G',      get: d => d?.lonAccel != null ? `${d.lonAccel.toFixed(2)}G` : '—' },
  { id: 'throttle',  label: 'THROTTLE',   get: d => d?.throttle != null ? `${(d.throttle*100).toFixed(0)}%` : '—' },
  { id: 'brake',     label: 'BRAKE',      get: d => d?.brake    != null ? `${(d.brake*100).toFixed(0)}%` : '—' },
]

const DEFAULT_ACTIVE = ['gear','speed','rpm','lap','pos','delta','fuel','bestlap']

export default function AdvancedPanelOverlay() {
  const { data } = useTelemetry()
  const [active, setActive] = useState(DEFAULT_ACTIVE)
  const [editing, setEditing] = useState(false)

  const toggle = (id) => setActive(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const shownBlocks = ALL_BLOCKS.filter(b => active.includes(b.id))

  return (
    <ResizeHandles overlayId="advancedpanel">
      <div className="overlay" style={{ width: 348 }}>
        <DragHandle overlayId="advancedpanel" label="Advanced Panel">
          <span
            onClick={() => setEditing(e => !e)}
            style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: editing ? '#3B82F6' : 'rgba(255,255,255,0.3)', cursor: 'pointer', letterSpacing: '0.08em', padding: '1px 4px', border: `1px solid ${editing ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 3 }}
          >
            {editing ? 'DONE' : 'EDIT'}
          </span>
        </DragHandle>

        {editing ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px 10px' }}>
            {ALL_BLOCKS.map(b => {
              const on = active.includes(b.id)
              return (
                <div key={b.id} onClick={() => toggle(b.id)} style={{
                  fontFamily: 'var(--font-data)', fontSize: 9, padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
                  background: on ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${on ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: on ? '#3B82F6' : 'rgba(255,255,255,0.4)',
                }}>{b.label}</div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, padding: '6px 8px 8px' }}>
            {shownBlocks.map(b => (
              <div key={b.id} style={{ padding: '5px 4px' }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{b.get(data)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResizeHandles>
  )
}
