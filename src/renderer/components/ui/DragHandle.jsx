import React, { useRef, useEffect, useCallback } from 'react'

/**
 * DragHandle — makes an overlay draggable by toggling Electron's
 * setIgnoreMouseEvents based on whether the cursor is over this element.
 *
 * Strategy:
 * 1. A window-level mousemove listener always fires (even through ignored events
 *    when forward:true is set) so we can detect cursor position.
 * 2. When cursor enters the drag handle bounds → disable passthrough so clicks land.
 * 3. When cursor leaves → re-enable passthrough so iRacing gets clicks again.
 * 4. On mousedown → start dragging, move window via IPC on each mousemove.
 * 5. On mouseup → stop dragging, save position.
 */
export default function DragHandle({ overlayId, label, children }) {
  const handleRef = useRef(null)
  const isDragging = useRef(false)
  const isHovering = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const hasElectron = typeof window !== 'undefined' && window.ari

  // ── Hover detection via mousemove (works even in passthrough mode) ──────────
  useEffect(() => {
    if (!hasElectron) return

    const onMouseMove = (e) => {
      if (isDragging.current) return // handled separately
      if (!handleRef.current) return

      const rect = handleRef.current.getBoundingClientRect()
      const over = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      )

      if (over && !isHovering.current) {
        isHovering.current = true
        window.ari.setPassthrough(overlayId, false)  // enable clicks
      } else if (!over && isHovering.current && !isDragging.current) {
        isHovering.current = false
        window.ari.setPassthrough(overlayId, true)   // back to passthrough
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [overlayId, hasElectron])

  // ── Drag handling ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    isDragging.current = true
    lastPos.current = { x: e.screenX, y: e.screenY }

    const onMove = (e) => {
      if (!isDragging.current) return
      const dx = e.screenX - lastPos.current.x
      const dy = e.screenY - lastPos.current.y
      lastPos.current = { x: e.screenX, y: e.screenY }
      if (hasElectron && (dx !== 0 || dy !== 0)) {
        window.ari.dragMove(overlayId, dx, dy)
      }
    }

    const onUp = () => {
      isDragging.current = false
      isHovering.current = false
      if (hasElectron) {
        window.ari.dragEnd(overlayId)     // saves position + re-enables passthrough
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [overlayId, hasElectron])

  return (
    <div
      ref={handleRef}
      onMouseDown={onMouseDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        cursor: 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Drag grip dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 3px)',
          gridTemplateRows: 'repeat(2, 3px)',
          gap: 2,
          opacity: 0.4,
          flexShrink: 0
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              width: 3, height: 3,
              borderRadius: '50%',
              background: '#fff'
            }} />
          ))}
        </div>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)'
        }}>
          {label}
        </span>
      </div>

      {/* Right side slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}
