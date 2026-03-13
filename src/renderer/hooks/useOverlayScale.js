import { useState, useEffect } from 'react'

/**
 * useOverlayScale — returns the CSS scale factor for an overlay.
 *
 * Listens for 'overlay-size' events pushed from main process whenever the
 * window is resized. Scale is computed as the ratio of current window size
 * to the default (base) size, taking the smaller axis so content fits.
 *
 * Falls back to 1.0 in browser/demo mode.
 */
export function useOverlayScale(overlayId) {
  const [scale, setScale] = useState(1)
  const hasElectron = typeof window !== 'undefined' && window.ari

  useEffect(() => {
    if (!hasElectron) return

    // Get initial size on mount
    window.ari.getOverlaySize(overlayId).then(size => {
      if (!size) return
      const s = Math.min(
        size.width  / size.defaultWidth,
        size.height / size.defaultHeight
      )
      setScale(Math.max(0.5, s))
    })

    // Listen for live updates during resize
    window.ari.onOverlaySize(size => {
      const s = Math.min(
        size.width  / size.defaultWidth,
        size.height / size.defaultHeight
      )
      setScale(Math.max(0.5, s))
    })

    return () => window.ari.removeOverlaySizeListener()
  }, [overlayId, hasElectron])

  return scale
}
