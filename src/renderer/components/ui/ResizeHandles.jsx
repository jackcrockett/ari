import React, { useRef, useEffect, useCallback } from 'react'

const HANDLE_SIZE = 16  // px — hover zone at each corner
const CURSORS = {
  nw: 'nw-resize',
  ne: 'ne-resize',
  sw: 'sw-resize',
  se: 'se-resize',
}

const CORNER_STYLE = {
  nw: { top: 0,    left: 0    },
  ne: { top: 0,    right: 0   },
  sw: { bottom: 0, left: 0    },
  se: { bottom: 0, right: 0   },
}

/**
 * ResizeHandles — renders four invisible corner zones over an overlay.
 * Hovering a corner disables mouse passthrough so the resize drag can fire.
 * Dragging resizes the Electron window via IPC.
 */
export default function ResizeHandles({ overlayId }) {
  const hasElectron = typeof window !== 'undefined' && window.ari
  const activeCorner = useRef(null)
  const lastPos = useRef({ x: 0, y: 0 })
  const hoveringHandle = useRef(false)

  const startResize = useCallback((corner, e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    activeCorner.current = corner
    lastPos.current = { x: e.screenX, y: e.screenY }

    const onMove = (e) => {
      if (!activeCorner.current) return
      const dx = e.screenX - lastPos.current.x
      const dy = e.screenY - lastPos.current.y
      lastPos.current = { x: e.screenX, y: e.screenY }
      if (hasElectron && (dx !== 0 || dy !== 0)) {
        window.ari.resizeMove(overlayId, activeCorner.current, dx, dy)
      }
    }

    const onUp = () => {
      activeCorner.current = null
      hoveringHandle.current = false
      if (hasElectron) {
        window.ari.resizeEnd(overlayId)  // saves size + restores passthrough
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [overlayId, hasElectron])

  const onMouseEnter = useCallback(() => {
    if (!hasElectron) return
    hoveringHandle.current = true
    window.ari.setPassthrough(overlayId, false)
  }, [overlayId, hasElectron])

  const onMouseLeave = useCallback(() => {
    if (!hasElectron || activeCorner.current) return  // don't restore during active drag
    hoveringHandle.current = false
    window.ari.setPassthrough(overlayId, true)
  }, [overlayId, hasElectron])

  return (
    <>
      {Object.entries(CORNER_STYLE).map(([corner, pos]) => (
        <div
          key={corner}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={(e) => startResize(corner, e)}
          style={{
            position: 'absolute',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: CURSORS[corner],
            zIndex: 1000,
            ...pos,
            // Visible indicator — subtle corner bracket
            '--c': corner,
          }}
        >
          <CornerBracket corner={corner} />
        </div>
      ))}
    </>
  )
}

// Tiny L-shaped bracket drawn in SVG — visible hint that corner is draggable
function CornerBracket({ corner }) {
  const size = HANDLE_SIZE
  const arm  = 6   // length of each bracket arm
  const sw   = 1.5 // stroke width

  // Build the L path based on which corner
  const paths = {
    nw: `M ${arm} ${sw/2} L ${sw/2} ${sw/2} L ${sw/2} ${arm}`,
    ne: `M ${size-arm} ${sw/2} L ${size-sw/2} ${sw/2} L ${size-sw/2} ${arm}`,
    sw: `M ${sw/2} ${size-arm} L ${sw/2} ${size-sw/2} L ${arm} ${size-sw/2}`,
    se: `M ${size-arm} ${size-sw/2} L ${size-sw/2} ${size-sw/2} L ${size-sw/2} ${size-arm}`,
  }

  return (
    <svg
      width={size} height={size}
      style={{ display: 'block', opacity: 0.35, transition: 'opacity 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}
    >
      <path
        d={paths[corner]}
        fill="none"
        stroke="#fff"
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  )
}
