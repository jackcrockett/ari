import React, { useRef, useEffect, useCallback, useContext } from 'react'
import { OverlayPreviewContext } from '../OverlayPreviewContext'
import { grabPassthrough, releasePassthrough } from '../../lib/passthroughManager'

/**
 * ResizeHandles — adds a resize grip to the bottom-right corner of an overlay.
 *
 * DPI note: on Windows, e.screenX/Y are in physical pixels and Electron's
 * win.setSize() also takes physical pixels, but window.innerWidth/Height are
 * CSS logical pixels. We multiply inner dimensions by devicePixelRatio so all
 * values are in physical pixels before sending to the main process.
 */
export default function ResizeHandles({ overlayId, children }) {
  const isPreview   = useContext(OverlayPreviewContext)
  const gripRef     = useRef(null)
  const dragState   = useRef(null)
  const hoverRef    = useRef(false)
  const hasElectron = typeof window !== 'undefined' && window.ari

  // ── Hover: toggle passthrough on enter/exit of resize grip ──────────────────
  useEffect(() => {
    if (isPreview || !hasElectron) return

    const onMove = (e) => {
      if (dragState.current) return
      const el = gripRef.current
      if (!el) return
      const r    = el.getBoundingClientRect()
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
      if (hoverRef.current) {
        hoverRef.current = false
        releasePassthrough(overlayId)
      }
    }
  }, [overlayId, hasElectron, isPreview])

  // ── Resize drag ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (isPreview || !hasElectron) return
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    // All dimensions in logical CSS pixels — Electron's win.setSize() takes logical px.
    // e.screenX/Y are also in logical px in the Chromium renderer.
    const startW = window.innerWidth
    const startH = window.innerHeight
    const startX = e.screenX
    const startY = e.screenY

    dragState.current = { startX, startY, startW, startH, lastW: startW, lastH: startH }

    const onMove = (mv) => {
      const ds = dragState.current
      if (!ds) return
      const newW = Math.max(80, ds.startW + (mv.screenX - ds.startX))
      const newH = Math.max(60, ds.startH + (mv.screenY - ds.startY))
      const rW = Math.round(newW)
      const rH = Math.round(newH)
      if (rW === ds.lastW && rH === ds.lastH) return
      ds.lastW = rW
      ds.lastH = rH
      window.ari.resizeOverlay(overlayId, rW, rH)
    }

    const onUp = () => {
      dragState.current = null
      hoverRef.current  = false
      releasePassthrough(overlayId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [overlayId, hasElectron, isPreview])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}

      {!isPreview && (
        <div
          ref={gripRef}
          onMouseDown={onMouseDown}
          style={{
            position: 'absolute',
            bottom: 3,
            right: 3,
            width: 14,
            height: 14,
            cursor: 'nwse-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.35,
            pointerEvents: 'auto',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <circle cx="7.5" cy="1.5" r="1" fill="white" />
            <circle cx="7.5" cy="4.5" r="1" fill="white" />
            <circle cx="4.5" cy="4.5" r="1" fill="white" />
            <circle cx="7.5" cy="7.5" r="1" fill="white" />
            <circle cx="4.5" cy="7.5" r="1" fill="white" />
            <circle cx="1.5" cy="7.5" r="1" fill="white" />
          </svg>
        </div>
      )}
    </div>
  )
}
