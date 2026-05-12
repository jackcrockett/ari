import React, { useState, useRef, useEffect, useCallback, useContext } from 'react'
import { OverlayPreviewContext } from '../OverlayPreviewContext'
import { grabPassthrough, releasePassthrough } from '../../lib/passthroughManager'

const GRID = 8

/**
 * DragHandle — drag bar at the top of each overlay.
 *
 * Uses document-level listeners (not window/element) so fast mouse movement
 * never loses the event. Snap-to-grid every 8px; hold Alt to disable snap.
 * Drag origin and committed offset are stored in refs — no state updates
 * during drag, so no re-renders while dragging.
 *
 * Passthrough is coordinated through passthroughManager so DragHandle and
 * ResizeHandles don't conflict when both hover states change simultaneously.
 */
export default function DragHandle({ overlayId, label, children, onSettings }) {
  const isPreview   = useContext(OverlayPreviewContext)
  const handleRef   = useRef(null)
  const dragState   = useRef(null)   // null = not dragging
  const hoverRef    = useRef(false)
  const hasElectron = typeof window !== 'undefined' && window.ari
  const [visible, setVisible] = useState(false)

  // ── Hover: toggle passthrough on entry/exit of the handle bar ───────────────
  useEffect(() => {
    if (isPreview || !hasElectron) return

    const onMove = (e) => {
      if (dragState.current) return   // hover state managed by drag during active drag
      const el = handleRef.current
      if (!el) return
      const r   = el.getBoundingClientRect()
      const over = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom
      if (over !== hoverRef.current) {
        hoverRef.current = over
        if (over) grabPassthrough(overlayId)
        else      releasePassthrough(overlayId)
      }
    }

    document.addEventListener('mousemove', onMove)
    return () => {
      document.removeEventListener('mousemove', onMove)
      // Release passthrough if unmounting while hovered
      if (hoverRef.current) {
        hoverRef.current = false
        releasePassthrough(overlayId)
      }
    }
  }, [overlayId, hasElectron, isPreview])

  // ── Drag ────────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (isPreview) return   // preview mode: drag is handled by the layout editor
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    dragState.current = {
      originX:   e.screenX,
      originY:   e.screenY,
      committed: { dx: 0, dy: 0 },
    }

    const onMove = (moveEvent) => {
      const ds = dragState.current
      if (!ds) return

      const rawDx = moveEvent.screenX - ds.originX
      const rawDy = moveEvent.screenY - ds.originY
      const snap  = moveEvent.altKey ? 1 : GRID

      const snappedDx = Math.round(rawDx / snap) * snap
      const snappedDy = Math.round(rawDy / snap) * snap

      const incrDx = snappedDx - ds.committed.dx
      const incrDy = snappedDy - ds.committed.dy
      if (incrDx === 0 && incrDy === 0) return

      ds.committed.dx = snappedDx
      ds.committed.dy = snappedDy

      if (hasElectron) window.ari.dragMove(overlayId, incrDx, incrDy)
    }

    const onUp = () => {
      dragState.current = null
      hoverRef.current  = false
      if (hasElectron) window.ari.dragEnd(overlayId)
      releasePassthrough(overlayId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [overlayId, hasElectron, isPreview])

  return (
    <div
      ref={handleRef}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => { if (!dragState.current) setVisible(false) }}
      style={{
        position:        'absolute',
        top: 0, left: 0, right: 0,
        height:          22,
        zIndex:          20,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 8px',
        background:      visible ? 'rgba(8,8,12,0.92)' : 'transparent',
        borderBottom:    visible ? '1px solid rgba(255,255,255,0.09)' : 'none',
        cursor:          visible ? 'grab' : 'default',
        userSelect:      'none',
        WebkitUserSelect:'none',
        transition:      'background 0.12s',
        pointerEvents:   'auto',
      }}
    >
      {/* Drag grip + label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: visible ? 1 : 0, transition: 'opacity 0.12s',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 3px)',
          gridTemplateRows:    'repeat(2, 3px)',
          gap: 2, opacity: 0.45, flexShrink: 0,
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />
          ))}
        </div>
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
        }}>
          {label}
        </span>
      </div>

      {/* Right slot */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: visible ? 1 : 0, transition: 'opacity 0.12s',
      }}>
        {children}
        {onSettings && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onSettings() }}
            title="Column settings"
            style={{
              width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              padding: 0, borderRadius: 3,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.2 1.8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
