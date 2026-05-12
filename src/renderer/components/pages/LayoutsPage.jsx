import React, { useState, useEffect, useRef, useCallback } from 'react'
import { OVERLAYS, OVERLAY_GROUPS, OVERLAY_DEFAULTS_RENDERER } from '../../lib/overlayGroups'
import { OverlayPreviewContext, PreviewTelemetryContext } from '../OverlayPreviewContext'
import { OVERLAY_COMPONENTS, STATIC_DEMO } from '../ui/OverlayPreviewWrapper'
import layoutBg from '../../../../assets/layout_background.png'

const REF_W = 2560
const REF_H = 1440

function getId() {
  return Math.random().toString(36).slice(2, 10)
}

function getPos(id, positions) {
  const def = OVERLAY_DEFAULTS_RENDERER[id] || { x: 0, y: 0, width: 200, height: 100 }
  return { ...def, ...(positions[id] || {}) }
}

const HANDLES = [
  { id: 'nw', cursor: 'nwse-resize', style: { left: -4,    top: -4    } },
  { id: 'n',  cursor: 'ns-resize',   style: { left: '50%', top: -4,    marginLeft: -4 } },
  { id: 'ne', cursor: 'nesw-resize', style: { right: -4,   top: -4    } },
  { id: 'e',  cursor: 'ew-resize',   style: { right: -4,   top: '50%', marginTop: -4  } },
  { id: 'se', cursor: 'nwse-resize', style: { right: -4,   bottom: -4 } },
  { id: 's',  cursor: 'ns-resize',   style: { left: '50%', bottom: -4, marginLeft: -4 } },
  { id: 'sw', cursor: 'nesw-resize', style: { left: -4,    bottom: -4 } },
  { id: 'w',  cursor: 'ew-resize',   style: { left: -4,    top: '50%', marginTop: -4  } },
]

// ── Interactive canvas with real overlay previews ────────────────────────────
function LayoutCanvas({ activeOverlayIds, positions, onPositionsChange, editable }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 450 })
  const interactionRef = useRef(null)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const scaleX = size.w / REF_W
  const scaleY = size.h / REF_H

  const handleBoxMouseDown = useCallback((e, id) => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()
    const pos = getPos(id, positions)
    interactionRef.current = { type: 'drag', id, startMX: e.clientX, startMY: e.clientY, startX: pos.x, startY: pos.y }
    setActiveId(id)
  }, [editable, positions])

  const handleHandleMouseDown = useCallback((e, id, handle) => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()
    const pos = getPos(id, positions)
    interactionRef.current = { type: 'resize', id, handle, startMX: e.clientX, startMY: e.clientY, startX: pos.x, startY: pos.y, startW: pos.width, startH: pos.height }
    setActiveId(id)
  }, [editable, positions])

  const handleMouseMove = useCallback((e) => {
    const ix = interactionRef.current
    if (!ix) return
    const { type, id, handle, startMX, startMY, startX, startY, startW, startH } = ix
    const dx = (e.clientX - startMX) / scaleX
    const dy = (e.clientY - startMY) / scaleY
    const def = OVERLAY_DEFAULTS_RENDERER[id] || {}
    const minW = Math.max(80, (def.width  || 100) * 0.35)
    const minH = Math.max(40, (def.height || 100) * 0.35)

    let update = {}
    if (type === 'drag') {
      update = { x: Math.round(startX + dx), y: Math.round(startY + dy) }
    } else {
      let x = startX, y = startY, w = startW, h = startH
      if (handle.includes('e')) w = Math.max(minW, startW + dx)
      if (handle.includes('s')) h = Math.max(minH, startH + dy)
      if (handle.includes('w')) { const c = Math.min(dx, startW - minW); x = startX + c; w = startW - c }
      if (handle.includes('n')) { const c = Math.min(dy, startH - minH); y = startY + c; h = startH - c }
      update = { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) }
    }
    const current = getPos(id, positions)
    onPositionsChange({ ...positions, [id]: { ...current, ...update } })
  }, [scaleX, scaleY, positions, onPositionsChange])

  const handleMouseUp = useCallback(() => {
    interactionRef.current = null
    setActiveId(null)
  }, [])

  return (
    <OverlayPreviewContext.Provider value={true}>
      <PreviewTelemetryContext.Provider value={STATIC_DEMO}>
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            backgroundImage: `url(${layoutBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            userSelect: 'none',
          }}
        >
          {/* Resolution label */}
          <div style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            2560 × 1440
          </div>

          {activeOverlayIds.map(id => {
            const Component = OVERLAY_COMPONENTS[id]
            if (!Component) return null
            const pos = getPos(id, positions)
            const isActive = activeId === id

            const canvasLeft = pos.x * scaleX
            const canvasTop  = pos.y * scaleY
            const canvasW    = Math.max(4, pos.width  * scaleX)
            const canvasH    = Math.max(4, pos.height * scaleY)
            const contentScale = scaleX

            return (
              <div
                key={id}
                style={{
                  position: 'absolute',
                  left: canvasLeft, top: canvasTop,
                  width: canvasW, height: canvasH,
                  overflow: 'hidden',
                  outline: isActive
                    ? '2px solid rgba(232,0,29,0.8)'
                    : editable
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  boxSizing: 'border-box',
                }}
              >
                {/* Actual overlay component, scaled to fit canvas box */}
                <div style={{
                  width: pos.width, height: pos.height,
                  transform: `scale(${contentScale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}>
                  <Component />
                </div>

                {/* Drag layer — sits on top of overlay content */}
                {editable && (
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      cursor: interactionRef.current?.type === 'drag' && activeId === id ? 'grabbing' : 'grab',
                      zIndex: 10,
                    }}
                    onMouseDown={(e) => handleBoxMouseDown(e, id)}
                  />
                )}

                {/* Resize handles */}
                {editable && HANDLES.map(h => (
                  <div
                    key={h.id}
                    style={{
                      position: 'absolute',
                      width: 8, height: 8,
                      background: isActive ? '#E8001D' : 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(0,0,0,0.4)',
                      borderRadius: 1,
                      cursor: h.cursor,
                      zIndex: 11,
                      ...h.style,
                    }}
                    onMouseDown={(e) => handleHandleMouseDown(e, id, h.id)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </PreviewTelemetryContext.Provider>
    </OverlayPreviewContext.Provider>
  )
}

// ── Overlay checklist ────────────────────────────────────────────────────────
function OverlayChecklist({ selected, onChange }) {
  const toggle = (id) => onChange(
    selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]
  )
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {OVERLAY_GROUPS.map(group => (
        <div key={group.label}>
          <div style={{
            padding: '8px 14px 4px',
            fontSize: 9, color: 'rgba(255,255,255,0.2)',
            textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-data)',
          }}>
            {group.label}
          </div>
          {group.overlays.map(({ id, label }) => {
            const on = selected.includes(id)
            return (
              <div key={id} onClick={() => toggle(id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', cursor: 'pointer',
                background: on ? 'rgba(232,0,29,0.07)' : 'transparent',
                borderLeft: `2px solid ${on ? '#E8001D' : 'transparent'}`,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  background: on ? '#E8001D' : 'transparent',
                  border: `1.5px solid ${on ? '#E8001D' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><polyline points="0.5,3 3,5.5 7.5,0.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 12, color: on ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: on ? 500 : 400 }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LayoutsPage() {
  const [layouts, setLayouts]         = useState([])
  const [selectedId, setSelectedId]   = useState(null)
  const [mode, setMode]               = useState('view')   // 'view' | 'create' | 'edit'
  const [draftName, setDraftName]     = useState('')
  const [draftOverlays, setDraftOverlays]   = useState([])
  const [draftPositions, setDraftPositions] = useState({})
  const [editingNameId, setEditingNameId]   = useState(null)
  const [editingNameVal, setEditingNameVal] = useState('')

  const hasElectron = typeof window !== 'undefined' && window.ari

  useEffect(() => {
    if (!hasElectron) return
    window.ari.getNamedLayouts().then(ls => setLayouts(ls || []))
  }, [hasElectron])

  // Listen for layout-applied events from main (e.g. from preset system)
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onLayoutApplied(layout => {
      setLayouts(prev => {
        const idx = prev.findIndex(l => l.id === layout.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = layout; return next }
        return [...prev, layout]
      })
    })
    return () => window.ari.removeLayoutAppliedListener()
  }, [hasElectron])

  const selectedLayout = layouts.find(l => l.id === selectedId)

  // ── Create ───────────────────────────────────────────────────────────────────
  const startCreate = () => {
    setMode('create')
    setSelectedId(null)
    setDraftName(`Layout ${layouts.length + 1}`)
    setDraftOverlays([])
    setDraftPositions({})
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const startEdit = (layout) => {
    setSelectedId(layout.id)
    setDraftName(layout.name)
    setDraftOverlays([...(layout.activeOverlays || [])])
    setDraftPositions({ ...(layout.overlayPositions || {}) })
    setMode('edit')
  }

  const cancelDraft = () => {
    setMode('view')
    setDraftName('')
    setDraftOverlays([])
    setDraftPositions({})
  }

  // ── Save & Apply ─────────────────────────────────────────────────────────────
  const saveAndApply = async () => {
    if (!draftName.trim() || draftOverlays.length === 0) return
    const isNew = mode === 'create'
    const layout = isNew
      ? {
          id: getId(),
          name: draftName.trim(),
          activeOverlays: draftOverlays,
          overlayPositions: draftPositions,
          overlaySettings: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : {
          ...selectedLayout,
          name: draftName.trim(),
          activeOverlays: draftOverlays,
          overlayPositions: draftPositions,
          updatedAt: Date.now(),
        }

    const next = isNew
      ? [...layouts, layout]
      : layouts.map(l => l.id === layout.id ? layout : l)

    setLayouts(next)
    setSelectedId(layout.id)
    setMode('view')

    if (hasElectron) {
      await window.ari.saveNamedLayout(layout)
      await window.ari.applyNamedLayout(layout)
    }
  }

  // ── Rename inline ─────────────────────────────────────────────────────────────
  const commitRename = async (id) => {
    if (!editingNameVal.trim()) { setEditingNameId(null); return }
    const next = layouts.map(l => l.id === id ? { ...l, name: editingNameVal.trim(), updatedAt: Date.now() } : l)
    setLayouts(next)
    setEditingNameId(null)
    const layout = next.find(l => l.id === id)
    if (hasElectron && layout) await window.ari.saveNamedLayout(layout)
  }

  // ── Apply only ─────────────────────────────────────────────────────────────
  const applyLayout = async (layout) => {
    if (hasElectron) await window.ari.applyNamedLayout(layout)
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  const deleteLayout = async (id) => {
    const next = layouts.filter(l => l.id !== id)
    setLayouts(next)
    if (selectedId === id) { setSelectedId(null); setMode('view') }
    if (hasElectron) await window.ari.deleteNamedLayout(id)
  }

  // ── Canvas data ───────────────────────────────────────────────────────────────
  const canvasOverlays   = (mode === 'create' || mode === 'edit') ? draftOverlays   : (selectedLayout?.activeOverlays   || [])
  const canvasPositions  = (mode === 'create' || mode === 'edit') ? draftPositions  : (selectedLayout?.overlayPositions  || {})
  const canvasEditable   = mode === 'create' || mode === 'edit'

  const canSaveApply = draftName.trim().length > 0 && draftOverlays.length > 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left sidebar: layout list ─────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={startCreate} style={{
            width: '100%', padding: '8px 0', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(232,0,29,0.85)', border: '1px solid #E8001D',
            color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
          }}>
            + New Layout
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {layouts.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
                No saved layouts.<br />Create one above.
              </span>
            </div>
          ) : (
            layouts.map(layout => {
              const isSelected = layout.id === selectedId && mode !== 'create'
              return (
                <div key={layout.id}
                  onClick={() => { if (mode !== 'edit' || selectedId !== layout.id) { setMode('view'); setSelectedId(layout.id) } }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: isSelected ? 'rgba(232,0,29,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isSelected ? '#E8001D' : 'transparent'}`,
                  }}
                >
                  {editingNameId === layout.id ? (
                    <input autoFocus value={editingNameVal}
                      onChange={e => setEditingNameVal(e.target.value)}
                      onBlur={() => commitRename(layout.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(layout.id); if (e.key === 'Escape') setEditingNameId(null) }}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, padding: '2px 5px', color: '#fff', fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none' }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {layout.name}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    {(layout.activeOverlays || []).length} overlays
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      {(mode === 'create' || (mode === 'edit' && selectedLayout)) ? (

        // EDITING / CREATING MODE
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Overlay selector sidebar */}
          <div style={{
            width: 200, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Overlays
              </div>
            </div>
            <OverlayChecklist selected={draftOverlays} onChange={setDraftOverlays} />
          </div>

          {/* Canvas + top bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Top control bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
            }}>
              <input
                autoFocus={mode === 'create'}
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                placeholder="Layout name..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 5, padding: '6px 12px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-ui)',
                  outline: 'none', minWidth: 0,
                }}
              />
              {Object.keys(draftPositions).length > 0 && (
                <button onClick={() => setDraftPositions({})} style={{ padding: '6px 11px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                  Reset
                </button>
              )}
              <button onClick={cancelDraft} style={{ padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                Cancel
              </button>
              <button
                onClick={saveAndApply}
                disabled={!canSaveApply}
                style={{
                  padding: '6px 18px', borderRadius: 5, cursor: canSaveApply ? 'pointer' : 'default',
                  fontFamily: 'var(--font-ui)',
                  background: canSaveApply ? 'rgba(232,0,29,0.85)' : 'rgba(232,0,29,0.25)',
                  border: `1px solid ${canSaveApply ? '#E8001D' : 'rgba(232,0,29,0.3)'}`,
                  color: canSaveApply ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                Save & Apply
              </button>
            </div>

            {/* Hint */}
            <div style={{ padding: '6px 16px', flexShrink: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-data)', letterSpacing: '0.04em' }}>
              {draftOverlays.length === 0
                ? 'Select overlays on the left — they will appear here as live previews'
                : 'Drag to reposition · drag handles to resize · Save & Apply to go live'}
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, padding: '0 16px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <LayoutCanvas
                activeOverlayIds={draftOverlays}
                positions={draftPositions}
                onPositionsChange={setDraftPositions}
                editable={true}
              />
            </div>
          </div>
        </div>

      ) : selectedLayout ? (

        // VIEW MODE — non-editable preview
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedLayout.name}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
              {(selectedLayout.activeOverlays || []).length} overlays
            </span>
            <button onClick={() => startEdit(selectedLayout)} style={{ padding: '6px 13px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              Edit
            </button>
            <button onClick={() => applyLayout(selectedLayout)} style={{ padding: '6px 16px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)', background: 'rgba(232,0,29,0.85)', border: '1px solid #E8001D', color: '#fff', fontSize: 12, fontWeight: 600 }}>
              Apply
            </button>
            <button onClick={() => deleteLayout(selectedLayout.id)} style={{ padding: '6px 11px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              Delete
            </button>
          </div>

          <div style={{ flex: 1, padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <LayoutCanvas
              activeOverlayIds={selectedLayout.activeOverlays || []}
              positions={selectedLayout.overlayPositions || {}}
              onPositionsChange={() => {}}
              editable={false}
            />
          </div>
        </div>

      ) : (

        // EMPTY STATE
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity={0.12}>
            <rect x="4" y="8" width="40" height="32" rx="4" stroke="white" strokeWidth="2.5" />
            <rect x="10" y="14" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5" />
            <rect x="26" y="14" width="12" height="6" rx="2" stroke="white" strokeWidth="1.5" />
            <rect x="26" y="24" width="12" height="4" rx="2" stroke="white" strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }}>
            Create a layout or select one from the list
          </span>
        </div>

      )}
    </div>
  )
}
