import React, { useRef, useCallback } from 'react'

const HANDLE_SIZE = 18
const CURSORS = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' }

export default function ResizeHandles({ overlayId }) {
  const hasElectron = typeof window !== 'undefined' && window.ari
  const activeCorner   = useRef(null)
  const hoveringHandle = useRef(false)
  const readyToMove    = useRef(false)
  const rafPending     = useRef(false)   // rAF throttle gate
  const latestDelta    = useRef({ dx: 0, dy: 0 })

  const startResize = useCallback(async (corner, e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    activeCorner.current  = corner
    readyToMove.current   = false
    rafPending.current    = false

    const startMouseX = e.screenX
    const startMouseY = e.screenY

    // Await snapshot — main must have start state before any move is processed
    if (hasElectron) await window.ari.resizeStart(overlayId)
    readyToMove.current = true

    const onMove = (moveEvent) => {
      if (!activeCorner.current || !readyToMove.current) return
      latestDelta.current = {
        dx: moveEvent.screenX - startMouseX,
        dy: moveEvent.screenY - startMouseY,
      }
      // Throttle IPC calls to one per animation frame — prevents queue flooding
      if (!rafPending.current) {
        rafPending.current = true
        requestAnimationFrame(() => {
          if (activeCorner.current && hasElectron) {
            window.ari.resizeMove(overlayId, activeCorner.current, latestDelta.current.dx, latestDelta.current.dy)
          }
          rafPending.current = false
        })
      }
    }

    const onUp = () => {
      activeCorner.current  = null
      readyToMove.current   = false
      rafPending.current    = false
      hoveringHandle.current = false
      if (hasElectron) window.ari.resizeEnd(overlayId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [overlayId, hasElectron])

  const onMouseEnter = useCallback(() => {
    if (!hasElectron) return
    hoveringHandle.current = true
    window.ari.setPassthrough(overlayId, false)
  }, [overlayId, hasElectron])

  const onMouseLeave = useCallback(() => {
    if (!hasElectron || activeCorner.current) return
    hoveringHandle.current = false
    window.ari.setPassthrough(overlayId, true)
  }, [overlayId, hasElectron])

  const corners = {
    nw: { top: 0,    left: 0  },
    ne: { top: 0,    right: 0 },
    sw: { bottom: 0, left: 0  },
    se: { bottom: 0, right: 0 },
  }

  return (
    <>
      {Object.entries(corners).map(([corner, pos]) => (
        <div
          key={corner}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={(e) => startResize(corner, e)}
          style={{
            position: 'fixed',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: CURSORS[corner],
            zIndex: 9999,
            ...pos,
          }}
        >
          <CornerBracket corner={corner} />
        </div>
      ))}
    </>
  )
}

function CornerBracket({ corner }) {
  const size = HANDLE_SIZE
  const arm  = 7
  const sw   = 1.5
  const paths = {
    nw: `M ${arm} ${sw/2} L ${sw/2} ${sw/2} L ${sw/2} ${arm}`,
    ne: `M ${size-arm} ${sw/2} L ${size-sw/2} ${sw/2} L ${size-sw/2} ${arm}`,
    sw: `M ${sw/2} ${size-arm} L ${sw/2} ${size-sw/2} L ${arm} ${size-sw/2}`,
    se: `M ${size-arm} ${size-sw/2} L ${size-sw/2} ${size-sw/2} L ${size-sw/2} ${size-arm}`,
  }
  return (
    <svg
      width={size} height={size}
      style={{ display: 'block', opacity: 0.4, transition: 'opacity 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
    >
      <path d={paths[corner]} fill="none" stroke="#fff" strokeWidth={sw} strokeLinecap="round" />
    </svg>
  )
}
