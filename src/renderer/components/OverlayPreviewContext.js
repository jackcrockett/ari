import { createContext } from 'react'

/** Set to true when rendering overlays inside the Layout Editor canvas preview.
 *  Disables all IPC side effects: scale fetch, passthrough toggling, drag. */
export const OverlayPreviewContext = createContext(false)

/** Holds shared demo telemetry data so all preview overlays use the same tick
 *  instead of each running their own subscription. */
export const PreviewTelemetryContext = createContext(null)
