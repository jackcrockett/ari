import React from 'react'
import { useOverlayScale } from '../../hooks/useOverlayScale'

/**
 * ResizeHandles — wrapper that applies the overlay's scale transform.
 *
 * Resize handles were removed because transparent passthrough Electron
 * windows cannot reliably capture mousedown events. Resizing is now done
 * through the Layout Editor (a normal non-transparent window).
 *
 * The scale factor is set by the Layout Editor and persisted in electron-store.
 * body has overflow:hidden, so the scaled content is clipped to window bounds.
 */
export default function ResizeHandles({ overlayId, children }) {
  const scale = useOverlayScale(overlayId)

  return (
    <div style={{
      display: 'inline-block',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}>
      {children}
    </div>
  )
}
