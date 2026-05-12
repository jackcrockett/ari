import React, { useState, useEffect, useCallback, useRef } from 'react'
import { COLUMN_DEFS, COLUMN_GROUPS, DEFAULT_COLUMNS } from '../../lib/columnDefs'
import { VARIANTS, DEFAULT_VARIANT } from '../../lib/overlayVariants'

const LABEL_OVERRIDES = {
  position:         'Position',
  classPosition:    'Class Position',
  colorDot:         'Colour Dot',
  carNumber:        'Car Number',
  driverName:       'Driver Name',
  license:          'Licence',
  iRating:          'iRating',
  carClass:         'Car Class',
  carClassBadge:    'Class Badge (coloured)',
  gap:              'Gap to Player',
  gapToLeader:      'Gap to Leader',
  intervalToNext:   'Interval to Next',
  lastLapTime:      'Last Lap Time',
  bestLapTime:      'Best Lap Time',
  estimatedLapTime: 'Estimated Lap Time',
  pitStatus:        'Pit Status',
  pitStopCount:     'Pit Stop Count',
  fastRepairs:      'Fast Repairs Used',
  currentLap:       'Current Lap',
  lapsCompleted:    'Laps Completed',
  tyreCompound:     'Tyre Compound',
  trackSurface:     'Track Surface',
  incidentCount:    'Incident Count',
  isFastestLap:     'Fastest Lap Indicator',
  positionsGained:  'Positions Gained',
  teamName:         'Team Name',
}

function colLabel(id) {
  return LABEL_OVERRIDES[id] || COLUMN_DEFS[id]?.label || id
}

// ─── Drag-to-reorder list ─────────────────────────────────────────────────────

function DraggableColumnList({ columns, onReorder, onRemove }) {
  const dragIdx  = useRef(null)
  const overIdx  = useRef(null)
  const [dragging, setDragging] = useState(null)   // index being dragged
  const [over,     setOver]     = useState(null)   // index being hovered

  const onDragStart = (i) => (e) => {
    dragIdx.current = i
    setDragging(i)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox
    e.dataTransfer.setData('text/plain', i)
  }

  const onDragEnter = (i) => (e) => {
    e.preventDefault()
    if (i === dragIdx.current) return
    overIdx.current = i
    setOver(i)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (i) => (e) => {
    e.preventDefault()
    const from = dragIdx.current
    if (from == null || from === i) return
    const next = [...columns]
    const [item] = next.splice(from, 1)
    next.splice(i, 0, item)
    onReorder(next)
    dragIdx.current = null
    overIdx.current = null
    setDragging(null)
    setOver(null)
  }

  const onDragEnd = () => {
    dragIdx.current = null
    overIdx.current = null
    setDragging(null)
    setOver(null)
  }

  if (columns.length === 0) {
    return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '6px 0' }}>No columns selected</div>
  }

  return (
    <div>
      {columns.map((id, i) => {
        const isDragging = dragging === i
        const isOver     = over === i && dragging !== i

        return (
          <div
            key={id}
            draggable
            onDragStart={onDragStart(i)}
            onDragEnter={onDragEnter(i)}
            onDragOver={onDragOver}
            onDrop={onDrop(i)}
            onDragEnd={onDragEnd}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', marginBottom: 4,
              background: isDragging
                ? 'rgba(232,0,29,0.12)'
                : isOver
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isOver ? 'rgba(232,0,29,0.4)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 5,
              opacity: isDragging ? 0.5 : 1,
              cursor: 'grab',
              transition: 'background 0.1s, border-color 0.1s, opacity 0.1s',
              userSelect: 'none',
            }}
          >
            {/* Drag handle */}
            <div style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, lineHeight: 1, fontSize: 13 }}>
              ⠿
            </div>

            <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-data)' }}>
              {colLabel(id)}
            </span>

            {/* Remove */}
            <button
              onClick={() => onRemove(i)}
              title="Remove"
              style={{
                width: 22, height: 22, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4, cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', padding: 0,
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── ColumnPicker ─────────────────────────────────────────────────────────────

export default function ColumnPicker({ overlayId, overlayLabel, onBack }) {
  const hasElectron = typeof window !== 'undefined' && window.ari
  const defaultCols = DEFAULT_COLUMNS[overlayId] || []

  const [columns,  setColumns]  = useState(defaultCols)
  const [rowCount, setRowCount] = useState(overlayId === 'standings' ? 10 : 5)
  const [variant,  setVariant]  = useState(DEFAULT_VARIANT)

  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings(overlayId).then(s => {
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.rowCount)        setRowCount(s.rowCount)
      if (s?.variant)         setVariant(s.variant)
    })
  }, [overlayId, hasElectron])

  const save = useCallback((cols, rc, vt) => {
    if (!hasElectron) return
    window.ari.saveOverlaySettings(overlayId, { columns: cols, rowCount: rc, variant: vt })
  }, [overlayId, hasElectron])

  const updateColumns  = (next) => { setColumns(next); save(next, rowCount, variant) }
  const updateRowCount = (n)    => { setRowCount(n);   save(columns, n, variant)     }
  const updateVariant  = (v)    => { setVariant(v);    save(columns, rowCount, v)    }

  const remove = (i) => updateColumns(columns.filter((_, idx) => idx !== i))
  const add    = (id) => { if (!columns.includes(id)) updateColumns([...columns, id]) }
  const reset  = () => { setColumns(defaultCols); setVariant(DEFAULT_VARIANT); save(defaultCols, rowCount, DEFAULT_VARIANT) }

  const available = COLUMN_GROUPS
    .map(g => ({ ...g, ids: g.ids.filter(id => !columns.includes(id) && COLUMN_DEFS[id]) }))
    .filter(g => g.ids.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 20, padding: '0 6px 0 0', lineHeight: 1 }}
        >
          &larr;
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>
          {overlayLabel} — Columns
        </span>
        <button
          onClick={reset}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-data)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Reset
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 22px' }}>

        {/* Row count — standings only */}
        {overlayId === 'standings' && (
          <div style={{ padding: '14px 0 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Rows to show</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[5, 8, 10, 15, 20].map(n => (
                <button key={n} onClick={() => updateRowCount(n)} style={{
                  padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
                  fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600,
                  background: rowCount === n ? '#E8001D' : 'rgba(255,255,255,0.05)',
                  color: rowCount === n ? '#fff' : 'rgba(255,255,255,0.55)',
                  border: rowCount === n ? '1px solid rgba(232,0,29,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Style variant */}
        <div style={{ padding: '14px 0 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Style</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.values(VARIANTS).map(v => (
              <button key={v.id} onClick={() => updateVariant(v.id)} style={{
                flex: 1, padding: '6px 0', borderRadius: 5, cursor: 'pointer',
                fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 600,
                background: variant === v.id ? '#E8001D' : 'rgba(255,255,255,0.05)',
                color: variant === v.id ? '#fff' : 'rgba(255,255,255,0.5)',
                border: variant === v.id ? '1px solid rgba(232,0,29,0.4)' : '1px solid rgba(255,255,255,0.1)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active columns — drag to reorder */}
        <div style={{ padding: '14px 0 4px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            Active columns
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.15)', marginLeft: 8, letterSpacing: '0.04em', textTransform: 'none' }}>
              drag to reorder
            </span>
          </div>
          <DraggableColumnList columns={columns} onReorder={updateColumns} onRemove={remove} />
        </div>

        {/* Available columns to add */}
        {available.map(group => (
          <div key={group.label} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {group.ids.map(id => (
                <button key={id} onClick={() => add(id)} style={{
                  fontSize: 12, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 5, padding: '6px 12px',
                  color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-data)',
                }}>
                  + {colLabel(id)}
                </button>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
