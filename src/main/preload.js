const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ari', {
  // Control window chrome
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose:    () => ipcRenderer.invoke('window-close'),

  // Overlay visibility
  showOverlay: (id) => ipcRenderer.invoke('show-overlay', id),
  hideOverlay: (id) => ipcRenderer.invoke('hide-overlay', id),

  // Passthrough (toggled by DragHandle on hover/leave)
  setPassthrough: (id, enabled) => ipcRenderer.invoke('set-passthrough', { id, enabled }),

  // Drag to move
  dragMove: (id, dx, dy) => ipcRenderer.invoke('overlay-drag-move', { id, dx, dy }),
  dragEnd:  (id)         => ipcRenderer.invoke('overlay-drag-end', id),

  // Scale — read on mount, live-updated by layout editor
  getOverlayScale:          (id) => ipcRenderer.invoke('get-overlay-scale', id),
  onOverlayScale:           (cb) => ipcRenderer.on('overlay-scale', (e, s) => cb(s)),
  removeOverlayScaleListener: () => ipcRenderer.removeAllListeners('overlay-scale'),

  // Layout editor
  openLayoutEditor:  ()        => ipcRenderer.invoke('open-layout-editor'),
  closeLayoutEditor: ()        => ipcRenderer.invoke('close-layout-editor'),
  getLayoutState:    ()        => ipcRenderer.invoke('get-layout-state'),
  saveLayoutState:   (updates) => ipcRenderer.invoke('save-layout-state', updates),

  // Layout reset
  resetPositions: () => ipcRenderer.invoke('reset-overlay-positions'),

  // Track map cache
  trackmapSave: (trackId, points) => ipcRenderer.invoke('trackmap-save', { trackId, points }),
  trackmapLoad: (trackId)         => ipcRenderer.invoke('trackmap-load', trackId),

  // Telemetry
  onTelemetry:             (cb) => ipcRenderer.on('telemetry-update', (e, data) => cb(data)),
  removeTelemetryListener: ()   => ipcRenderer.removeAllListeners('telemetry-update'),
})
