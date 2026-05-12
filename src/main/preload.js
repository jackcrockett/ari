const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ari', {
  // Control window chrome
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose:    () => ipcRenderer.invoke('window-close'),

  // Overlay visibility
  showOverlay: (id) => ipcRenderer.invoke('show-overlay', id),
  hideOverlay: (id) => ipcRenderer.invoke('hide-overlay', id),

  // Passthrough (coordinated by passthroughManager in each overlay renderer)
  setPassthrough: (id, enabled) => ipcRenderer.invoke('set-passthrough', { id, enabled }),

  // Drag to move
  dragMove:  (id, dx, dy) => ipcRenderer.invoke('overlay-drag-move', { id, dx, dy }),
  dragEnd:   (id)         => ipcRenderer.invoke('overlay-drag-end', id),
  resizeEnd:      (id)       => ipcRenderer.invoke('overlay-resize-end', id),
  getOverlaySize: (id)       => ipcRenderer.invoke('get-overlay-size', id),
  setOverlaySize: (id, w, h) => ipcRenderer.invoke('set-overlay-size', id, w, h),

  // Layout reset
  resetPositions:        ()   => ipcRenderer.invoke('reset-overlay-positions'),
  resetOverlayPosition:  (id) => ipcRenderer.invoke('reset-overlay-position', id),

  // Track map cache (GPS points)
  trackmapSave: (trackId, points) => ipcRenderer.invoke('trackmap-save', { trackId, points }),
  trackmapLoad: (trackId)         => ipcRenderer.invoke('trackmap-load', trackId),

  // Track map turns (SVG-derived)
  trackmapTurnsSave: (trackId, turns) => ipcRenderer.invoke('trackmapturns-save', { trackId, turns }),
  trackmapTurnsLoad: (trackId)        => ipcRenderer.invoke('trackmapturns-load', trackId),

  // Fetch SVG from iRacing CDN via main process (no CORS restrictions)
  fetchTrackSvg: (url) => ipcRenderer.invoke('fetch-track-svg', url),

  // Resolve correct CDN base URL for a track by reading iRacing's own Electron cache
  lookupTrackmapCdnBase: (trackId) => ipcRenderer.invoke('lookup-trackmap-cdn-base', trackId),

  // Telemetry
  onTelemetry:             (cb) => ipcRenderer.on('telemetry-update', (e, data) => cb(data)),
  removeTelemetryListener: ()   => ipcRenderer.removeAllListeners('telemetry-update'),

  // Active overlays — persisted list for startup restore
  getActiveOverlays: () => ipcRenderer.invoke('get-active-overlays'),

  // Per-overlay content settings (column selection, variants, etc.)
  getOverlaySettings:           (id)    => ipcRenderer.invoke('get-overlay-settings', id),
  saveOverlaySettings:          (id, c) => ipcRenderer.invoke('save-overlay-settings', id, c),
  onOverlaySettingsChanged:     (cb)    => ipcRenderer.on('overlay-settings-changed', (e, id, c) => cb(id, c)),
  removeSettingsChangeListener: ()      => ipcRenderer.removeAllListeners('overlay-settings-changed'),

  // Column picker -- overlay requests control panel to open settings for an overlay
  requestOpenSettings:        (id) => ipcRenderer.invoke('request-open-settings', id),
  onOpenSettings:             (cb) => ipcRenderer.on('open-overlay-settings', (e, id) => cb(id)),
  removeOpenSettingsListener: ()   => ipcRenderer.removeAllListeners('open-overlay-settings'),

  // Session presets
  getPresets:                  ()            => ipcRenderer.invoke('get-presets'),
  savePreset:                  (key, preset) => ipcRenderer.invoke('save-preset', key, preset),
  applyPreset:                 (key)         => ipcRenderer.invoke('apply-preset', key),
  getAutoPreset:               ()            => ipcRenderer.invoke('get-auto-preset'),
  setAutoPreset:               (enabled)     => ipcRenderer.invoke('set-auto-preset', enabled),
  onSessionTypeChange:         (cb)          => ipcRenderer.on('session-type-change', (e, d) => cb(d)),
  removeSessionTypeListener:   ()            => ipcRenderer.removeAllListeners('session-type-change'),
  onPresetApplied:             (cb)          => ipcRenderer.on('preset-applied', (e, key, p) => cb(key, p)),
  removePresetAppliedListener: ()            => ipcRenderer.removeAllListeners('preset-applied'),

  // Network streaming
  getNetworkStatus:            ()       => ipcRenderer.invoke('get-network-status'),
  startHttpServer:             (port)   => ipcRenderer.invoke('start-http-server', port),
  stopHttpServer:              ()       => ipcRenderer.invoke('stop-http-server'),
  onNetworkStatus:             (cb)     => ipcRenderer.on('network-status', (e, s) => cb(s)),
  removeNetworkStatusListener: ()       => ipcRenderer.removeAllListeners('network-status'),

  // Bridge status
  getBridgeStatus:             ()    => ipcRenderer.invoke('get-bridge-status'),
  onBridgeStatus:              (cb)  => ipcRenderer.on('bridge-status', (e, s) => cb(s)),
  removeBridgeStatusListener:  ()    => ipcRenderer.removeAllListeners('bridge-status'),

  // VR mode
  getVrMode: ()          => ipcRenderer.invoke('get-vr-mode'),
  setVrMode: (enabled)   => ipcRenderer.invoke('set-vr-mode', enabled),

  // Named layouts
  getNamedLayouts:      ()         => ipcRenderer.invoke('get-named-layouts'),
  saveNamedLayout:      (layout)   => ipcRenderer.invoke('save-named-layout', layout),
  deleteNamedLayout:    (id)       => ipcRenderer.invoke('delete-named-layout', id),
  applyNamedLayout:     (layout)   => ipcRenderer.invoke('apply-named-layout', layout),
  onLayoutApplied:      (cb)       => ipcRenderer.on('layout-applied', (e, l) => cb(l)),
  removeLayoutAppliedListener: ()  => ipcRenderer.removeAllListeners('layout-applied'),
})
