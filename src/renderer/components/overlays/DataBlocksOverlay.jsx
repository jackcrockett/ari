import React, { useState } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

const BLOCKS = [
  { id: 'gear',    label: 'GEAR',   get: d => d?.gear ?? '—',                           size: 'xl' },
  { id: 'speed',   label: 'KM/H',   get: d => d?.speed ?? '—',                          size: 'xl' },
  { id: 'rpm',     label: 'RPM',    get: d => d?.rpm != null ? d.rpm.toLocaleString() : '—', size: 'md' },
  { id: 'fuel',    label: 'FUEL L', get: d => d?.fuel?.level?.toFixed(2) ?? '—',        size: 'md' },
  { id: 'lap',     label: 'LAP',    get: d => d?.currentLap ?? '—',                     size: 'md' },
  { id: 'delta',   label: 'DELTA',  get: d => d?.delta != null ? `${d.delta > 0 ? '+' : ''}${d.delta.toFixed(3)}` : '—', size: 'md' },
  { id: 'best',    label: 'BEST',   get: d => formatLapTime(d?.bestLapTime),             size: 'sm' },
  { id: 'last',    label: 'LAST',   get: d => formatLapTime(d?.lastLapTime),             size: 'sm' },
]

const SIZES = { xl: 32, md: 20, sm: 14 }

const DEFAULT_BLOCKS = ['gear', 'speed', 'rpm', 'delta']

export default function DataBlocksOverlay() {
  const { data } = useTelemetry()
  const [selected, setSelected] = useState(DEFAULT_BLOCKS)
  const [editing, setEditing] = useState(false)

  const shown = BLOCKS.filter(b => selected.includes(b.id))

  return (
    <ResizeHandles overlayId="datablocks">
      <div className="overlay" style={{ width: 210 }}>
        <DragHandle overlayId="datablocks" label="Data Blocks">
          <span onClick={() => setEditing(e => !e)} style={{
            fontFamily: 'var(--font-data)', fontSize: 8, cursor: 'pointer',
            color: editing ? '#3B82F6' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${editing ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
            padding: '1px 4px', borderRadius: 3
          }}>{editing ? 'DONE' : 'EDIT'}</span>
        </DragHandle>

        {editing ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 8px 8px' }}>
            {BLOCKS.map(b => {
              const on = selected.includes(b.id)
              return (
                <div key={b.id} onClick={() => setSelected(prev => on ? prev.filter(x=>x!==b.id) : [...prev,b.id])}
                  style={{ fontFamily: 'var(--font-data)', fontSize: 9, padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
                    background: on ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${on ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: on ? '#3B82F6' : 'rgba(255,255,255,0.35)' }}>
                  {b.label}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '5px 8px 7px' }}>
            {shown.map(b => (
              <div key={b.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '5px 8px', minWidth: 44 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginBottom: 1 }}>{b.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: SIZES[b.size] || 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>{b.get(data)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResizeHandles>
  )
}
