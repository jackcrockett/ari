const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ari', {
  // Visibility
  showOverlay: (id) => ipcRenderer.invoke('show-overlay', id),
  hideOverlay: (id) => ipcRenderer.invoke('hide-overlay', id),

  // Passthrough
  setPassthrough: (id, enabled) => ipcRenderer.invoke('set-passthrough', { id, enabled }),

  // Drag
  dragMove: (id, dx, dy) => ipcRenderer.invoke('overlay-drag-move', { id, dx, dy }),
  dragEnd:  (id) => ipcRenderer.invoke('overlay-drag-end', id),

  // Resize
  resizeStart: (id) => ipcRenderer.invoke('overlay-resize-start', id),
  resizeMove: (id, corner, dx, dy) => ipcRenderer.invoke('overlay-resize-move', { id, corner, dx, dy }),
  resizeEnd:  (id) => ipcRenderer.invoke('overlay-resize-end', id),

  // Size query (for initial scale on mount)
  getOverlaySize: (id) => ipcRenderer.invoke('get-overlay-size', id),

  // Layout
  resetPositions: () => ipcRenderer.invoke('reset-overlay-positions'),

  // Track map cache
  trackmapSave: (trackId, points) => ipcRenderer.invoke('trackmap-save', { trackId, points }),
  trackmapLoad: (trackId) => ipcRenderer.invoke('trackmap-load', trackId),

  // Telemetry
  onTelemetry: (cb) => ipcRenderer.on('telemetry-update', (e, data) => cb(data)),
  removeTelemetryListener: () => ipcRenderer.removeAllListeners('telemetry-update'),

  // Size change events (pushed from main when resize moves)
  onOverlaySize: (cb) => ipcRenderer.on('overlay-size', (e, data) => cb(data)),
  removeOverlaySizeListener: () => ipcRenderer.removeAllListeners('overlay-size'),
})
