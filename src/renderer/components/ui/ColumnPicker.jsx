import React, { useState, useEffect, useCallback } from 'react'
import { COLUMN_DEFS, COLUMN_GROUPS, DEFAULT_COLUMNS } from '../../lib/columnDefs'
import { VARIANTS, DEFAULT_VARIANT } from '../../lib/overlayVariants'

const LABEL_OVERRIDES = {
  colorDot:     'Color Dot',
  isFastestLap: 'Fastest Lap',
  gap:          'Gap (to player)',
  gapToLeader:  'Gap to Leader',
}

function colLabel(id) {
  return LABEL_OVERRIDES[id] || COLUMN_DEFS[id]?.label || id
}

// ─── Tiny icon buttons ────────────────────────────────────────────────────────

function IconBtn({ onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3, cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
        padding: 0, flexShrink: 0,
        fontSize: 10, lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
}

// ─── ColumnPicker ─────────────────────────────────────────────────────────────

export default function ColumnPicker({ overlayId, overlayLabel, onBack }) {
  const hasElectron = typeof window !== 'undefined' && window.ari
  const defaultCols = DEFAULT_COLUMNS[overlayId] || []

  const [columns,  setColumns]  = useState(defaultCols)
  const [rowCount, setRowCount] = useState(overlayId === 'standings' ? 10 : 5)
  const [variant,  setVariant]  = useState(DEFAULT_VARIANT)

  // Load persisted settings on mount
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings(overlayId).then(s => {
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.rowCount)        setRowCount(s.rowCount)
      if (s?.variant)         setVariant(s.variant)
    })
  }, [overlayId, hasElectron])

  // Auto-save on any change (callers pass current values to avoid stale closure)
  const save = useCallback((cols, rc, vt) => {
    if (!hasElectron) return
    window.ari.saveOverlaySettings(overlayId, { columns: cols, rowCount: rc, variant: vt })
  }, [overlayId, hasElectron])

  const updateColumns  = (next) => { setColumns(next); save(next, rowCount, variant) }
  const updateRowCount = (n)    => { setRowCount(n);   save(columns, n, variant)     }
  const updateVariant  = (v)    => { setVariant(v);    save(columns, rowCount, v)    }

  const moveUp = (i) => {
    if (i === 0) return
    const a = [...columns]
    ;[a[i - 1], a[i]] = [a[i], a[i - 1]]
    updateColumns(a)
  }

  const moveDown = (i) => {
    if (i >= columns.length - 1) return
    const a = [...columns]
    ;[a[i], a[i + 1]] = [a[i + 1], a[i]]
    updateColumns(a)
  }

  const remove = (i) => updateColumns(columns.filter((_, idx) => idx !== i))

  const add = (id) => {
    if (!columns.includes(id)) updateColumns([...columns, id])
  }

  const reset = () => {
    setColumns(defaultCols)
    setVariant(DEFAULT_VARIANT)
    save(defaultCols, rowCount, DEFAULT_VARIANT)
  }

  // All columns not currently active
  const available = COLUMN_GROUPS
    .map(g => ({ ...g, ids: g.ids.filter(id => !columns.includes(id) && COLUMN_DEFS[id]) }))
    .filter(g => g.ids.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            fontSize: 14, padding: '0 4px 0 0', lineHeight: 1,
          }}
        >
          &larr;
        </button>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
          {overlayLabel} Columns
        </span>
        <button
          onClick={reset}
          style={{
            fontSize: 9, color: 'rgba(255,255,255,0.3)',
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3, padding: '3px 7px', cursor: 'pointer',
            fontFamily: 'var(--font-data)', letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>

        {/* Row count (standings only) */}
        {overlayId === 'standings' && (
          <div style={{ padding: '10px 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              Rows to show
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[5, 8, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => updateRowCount(n)}
                  style={{
                    padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                    fontFamily: 'var(--font-data)', fontSize: 10,
                    background: rowCount === n ? '#E8001D' : 'rgba(255,255,255,0.05)',
                    color: rowCount === n ? '#fff' : 'rgba(255,255,255,0.5)',
                    border: rowCount === n ? '1px solid rgba(232,0,29,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Style variant */}
        <div style={{ padding: '10px 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
            Style
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Object.values(VARIANTS).map(v => (
              <button
                key={v.id}
                onClick={() => updateVariant(v.id)}
                style={{
                  flex: 1, padding: '3px 0', borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'var(--font-data)', fontSize: 9,
                  background: variant === v.id ? '#E8001D' : 'rgba(255,255,255,0.05)',
                  color: variant === v.id ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: variant === v.id ? '1px solid rgba(232,0,29,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active columns */}
        <div style={{ padding: '10px 0 4px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
            Active columns
          </div>
          {columns.length === 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '4px 0' }}>No columns selected</div>
          )}
          {columns.map((id, i) => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 6px', marginBottom: 2,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 4,
            }}>
              <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-data)' }}>
                {colLabel(id)}
              </span>
              <IconBtn onClick={() => moveUp(i)}   disabled={i === 0}                 title="Move up">   &uarr; </IconBtn>
              <IconBtn onClick={() => moveDown(i)} disabled={i === columns.length - 1} title="Move down"> &darr; </IconBtn>
              <IconBtn onClick={() => remove(i)} title="Remove" style={{ color: '#E8001D' }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.4" />
                  <line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </IconBtn>
            </div>
          ))}
        </div>

        {/* Available columns */}
        {available.map(group => (
          <div key={group.label} style={{ marginTop: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {group.ids.map(id => (
                <button
                  key={id}
                  onClick={() => add(id)}
                  style={{
                    fontSize: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4, padding: '3px 8px',
                    color: 'rgba(255,255,255,0.55)',
                    fontFamily: 'var(--font-data)',
                  }}
                >
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
