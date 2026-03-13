import { useState, useEffect } from 'react'

/**
 * useOverlayScale — returns { scale, windowW, windowH } for an overlay.
 *
 * scale    — CSS transform:scale factor (content zoom)
 * windowW  — actual Electron window pixel width  (use for canvas resolution)
 * windowH  — actual Electron window pixel height (use for canvas resolution)
 */
export function useOverlayScale(overlayId) {
  const [state, setState] = useState({ scale: 1, windowW: null, windowH: null })
  const hasElectron = typeof window !== 'undefined' && window.ari

  useEffect(() => {
    if (!hasElectron) return

    const apply = ({ width, height, defaultWidth, defaultHeight }) => {
      const s = Math.min(width / defaultWidth, height / defaultHeight)
      setState({ scale: Math.max(0.5, s), windowW: width, windowH: height })
    }

    window.ari.getOverlaySize(overlayId).then(size => { if (size) apply(size) })
    window.ari.onOverlaySize(apply)
    return () => window.ari.removeOverlaySizeListener()
  }, [overlayId, hasElectron])

  return state
}
