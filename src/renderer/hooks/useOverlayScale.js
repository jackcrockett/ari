import { useState, useEffect, useContext } from 'react'
import { OverlayPreviewContext } from '../components/OverlayPreviewContext'

const hasElectron = typeof window !== 'undefined' && window.ari

/**
 * useOverlayScale — reads the scale factor stored for this overlay.
 * In layout editor preview mode, always returns 1 (the preview applies its
 * own scale transform to the whole component).
 */
export function useOverlayScale(overlayId) {
  const isPreview = useContext(OverlayPreviewContext)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (isPreview || !hasElectron) return
    window.ari.getOverlayScale(overlayId).then(s => {
      if (s != null) setScale(s)
    })
    const handler = (s) => setScale(s)
    window.ari.onOverlayScale(handler)
    return () => window.ari.removeOverlayScaleListener()
  }, [overlayId, isPreview])

  return isPreview ? 1 : scale
}
