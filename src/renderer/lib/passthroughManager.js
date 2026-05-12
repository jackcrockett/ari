/**
 * passthroughManager — reference-counted overlay mouse passthrough coordinator.
 *
 * Each overlay window is a separate browser context (Electron renderer process),
 * so this module is a singleton per window. Multiple interactive elements
 * (DragHandle, ResizeHandle) call grab/release to coordinate: passthrough is
 * disabled while ANY element is being hovered or dragged.
 */

let count = 0

export function grabPassthrough(overlayId) {
  count++
  if (count === 1 && window.ari) window.ari.setPassthrough(overlayId, false)
}

export function releasePassthrough(overlayId) {
  count = Math.max(0, count - 1)
  if (count === 0 && window.ari) window.ari.setPassthrough(overlayId, true)
}
