const { app, BrowserWindow, ipcMain, screen } = require('electron')
const { scanIbtFiles, enableIRacingTelemetry } = require('./trackmap-builder')
const path = require('path')
const IRacingSDK = require('./iracing')

const isDev = !app.isPackaged

let controlWindow      = null
let layoutEditorWindow = null
let overlayWindows     = {}
let iracingSDK         = null
let Store              = null
let lastSessionType    = null   // tracks last seen sessionType for change detection

async function loadStore() {
  try {
    const mod = await import('electron-store')
    Store = mod.default
  } catch (e) {
    console.warn('[ARI] electron-store unavailable')
  }
}

let store = null

// Natural (default) dimensions for each overlay.
// Scale is stored separately in electron-store and applied at window creation.
const OVERLAY_DEFAULTS = {
  relative:      { x: 20,   y: 100,  width: 300, height: 225 },
  standings:     { x: 20,   y: 340,  width: 300, height: 295 },
  fuel:          { x: 20,   y: 650,  width: 300, height: 175 },
  trackmap:      { x: 340,  y: 100,  width: 220, height: 255 },
  inputs:        { x: 340,  y: 370,  width: 480, height: 100 },
  tyres:         { x: 610,  y: 100,  width: 250, height: 310 },
  radar:         { x: 880,  y: 100,  width: 180, height: 180 },
  headtohead:    { x: 340,  y: 480,  width: 300, height: 210 },
  flags:         { x: 660,  y: 420,  width: 210, height: 110 },
  delta:         { x: 340,  y: 700,  width: 360, height: 55  },
  lapgraph:      { x: 880,  y: 300,  width: 300, height: 180 },
  laplog:        { x: 880,  y: 490,  width: 280, height: 250 },
  sessiontimer:  { x: 660,  y: 310,  width: 210, height: 80  },
  overtakealert: { x: 560,  y: 550,  width: 280, height: 75  },
  blindspot:     { x: 580,  y: 690,  width: 160, height: 70  },
  boostbox:      { x: 880,  y: 750,  width: 200, height: 110 },
  weather:       { x: 660,  y: 540,  width: 200, height: 130 },
  raceschedule:  { x: 20,   y: 840,  width: 300, height: 150 },
  hstandings:    { x: 20,   y: 1010, width: 960, height: 55  },
  leaderboard:   { x: 1180, y: 100,  width: 280, height: 420 },
  flatmap:       { x: 1180, y: 530,  width: 200, height: 200 },
  minimap:       { x: 1180, y: 740,  width: 150, height: 150 },
  laptimespread: { x: 880,  y: 750,  width: 280, height: 110 },
  advancedpanel: { x: 340,  y: 720,  width: 360, height: 200 },
  datablocks:    { x: 340,  y: 930,  width: 220, height: 100 },
  heartrate:     { x: 660,  y: 680,  width: 160, height: 80  },
  gforce:        { x: 1070, y: 100,  width: 160, height: 160 },
  digiflag:      { x: 560,  y: 420,  width: 320, height: 190 },
  pitboxhelper:  { x: 560,  y: 680,  width: 260, height: 95  },
  incident:      { x: 20,   y: 200,  width: 220, height: 220 },
}

function getSavedConfig(id) {
  const def = OVERLAY_DEFAULTS[id]
  if (!def) return null
  const base = { x: def.x, y: def.y, scale: 1, naturalWidth: def.width, naturalHeight: def.height }
  if (store) {
    const saved = store.get(`overlay.${id}`)
    if (saved) return {
      ...base,
      x:     saved.x     ?? def.x,
      y:     saved.y     ?? def.y,
      scale: saved.scale ?? 1,
    }
  }
  return base
}

function saveConfig(id, partial) {
  if (!store) return
  const existing = store.get(`overlay.${id}`) || {}
  store.set(`overlay.${id}`, { ...existing, ...partial })
}

// ─── Control Panel ─────────────────────────────────────────────────────────
function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 420, height: 680, minWidth: 380, minHeight: 500,
    frame: false, transparent: false, backgroundColor: '#0e0e10', resizable: true,
    icon: path.join(__dirname, '../../icon.ico'),
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'ARI — Aventa Race Intelligence'
  })
  if (isDev) controlWindow.loadURL('http://localhost:5173')
  if (isDev) controlWindow.webContents.openDevTools({ mode: 'detach' })
  else controlWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  controlWindow.on('closed', () => { controlWindow = null; app.quit() })
}

// ─── Layout Editor ──────────────────────────────────────────────────────────
function createLayoutEditorWindow() {
  if (layoutEditorWindow && !layoutEditorWindow.isDestroyed()) {
    layoutEditorWindow.focus()
    return
  }
  layoutEditorWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    frame: false, transparent: false, backgroundColor: '#0a0a0c',
    icon: path.join(__dirname, '../../icon.ico'),
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'ARI — Layout Editor'
  })
  if (isDev) layoutEditorWindow.loadURL('http://localhost:5173/#/layout-editor')
  else layoutEditorWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'), { hash: '/layout-editor' })
  layoutEditorWindow.on('closed', () => { layoutEditorWindow = null })
}

// ─── Overlay Factory ────────────────────────────────────────────────────────
function createOverlayWindow(id, config) {
  const { x, y, scale = 1, naturalWidth, naturalHeight } = config
  const width  = Math.max(40, Math.round(naturalWidth  * scale))
  const height = Math.max(20, Math.round(naturalHeight * scale))

  const win = new BrowserWindow({
    x, y, width, height,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, focusable: false, hasShadow: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.setIgnoreMouseEvents(true, { forward: true })
  if (isDev) win.loadURL(`http://localhost:5173/#/overlay/${id}`)
  else win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'), { hash: `/overlay/${id}` })
  overlayWindows[id] = win
  win.once('ready-to-show', () => {
    win.show()
    win.setAlwaysOnTop(true, 'screen-saver')
    console.log('[ARI] Overlay shown:', id, 'bounds:', JSON.stringify(win.getBounds()))
  })
  return win
}

// ─── IPC: Control Window ────────────────────────────────────────────────────
ipcMain.handle('window-minimize', () => { if (controlWindow) controlWindow.minimize() })
ipcMain.handle('window-maximize', () => {
  if (!controlWindow) return
  if (controlWindow.isMaximized()) controlWindow.unmaximize()
  else controlWindow.maximize()
})
ipcMain.handle('window-close', () => { if (controlWindow) controlWindow.close() })

// ─── IPC: Layout Editor ─────────────────────────────────────────────────────
ipcMain.handle('open-layout-editor', () => createLayoutEditorWindow())
ipcMain.handle('close-layout-editor', () => {
  if (layoutEditorWindow && !layoutEditorWindow.isDestroyed()) layoutEditorWindow.close()
})

ipcMain.handle('get-layout-state', () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const result = { screen: { width, height }, overlays: {} }
  Object.entries(OVERLAY_DEFAULTS).forEach(([id, def]) => {
    const saved = store ? store.get(`overlay.${id}`) : null
    const win = overlayWindows[id]
    const visible = !!(win && !win.isDestroyed() && win.isVisible())
    result.overlays[id] = {
      x:            saved?.x        ?? def.x,
      y:            saved?.y        ?? def.y,
      naturalWidth:  def.width,
      naturalHeight: def.height,
      scale:        saved?.scale    ?? 1,
      inLayout:     saved?.inLayout ?? true,
      visible,
    }
  })
  return result
})

ipcMain.handle('save-layout-state', (event, updates) => {
  // updates: { [id]: { x, y, scale } }
  Object.entries(updates).forEach(([id, config]) => {
    const def = OVERLAY_DEFAULTS[id]
    if (!def) return
    const scale  = config.scale ?? 1
    const snapX  = Math.round(config.x)
    const snapY  = Math.round(config.y)
    const partial = { x: snapX, y: snapY, scale }
    if (config.inLayout !== undefined) partial.inLayout = config.inLayout
    saveConfig(id, partial)
    const win = overlayWindows[id]
    if (win && !win.isDestroyed()) {
      const w = Math.max(40, Math.round(def.width  * scale))
      const h = Math.max(20, Math.round(def.height * scale))
      win.setPosition(snapX, snapY)
      win.setSize(w, h)
      win.webContents.send('overlay-scale', scale)
    }
  })
})

// ─── IPC: Scale query (overlay renderer reads this on mount) ─────────────────
ipcMain.handle('get-overlay-scale', (event, id) => {
  const saved = store ? store.get(`overlay.${id}`) : null
  return saved?.scale ?? 1
})

// ─── IPC: Overlay content settings ─────────────────────────────────────────
// ─── IPC: Open settings in control panel ────────────────────────────────────
ipcMain.handle('request-open-settings', (event, id) => {
  if (controlWindow && !controlWindow.isDestroyed()) {
    if (controlWindow.isMinimized()) controlWindow.restore()
    controlWindow.focus()
    controlWindow.webContents.send('open-overlay-settings', id)
  }
})

// ─── IPC: Overlay content settings ─────────────────────────────────────────
ipcMain.handle('get-overlay-settings', (event, id) => {
  return store ? store.get('overlay.' + id + '.content') || null : null
})

ipcMain.handle('save-overlay-settings', (event, id, content) => {
  if (!store) return
  store.set('overlay.' + id + '.content', content)
  const win = overlayWindows[id]
  if (win && !win.isDestroyed()) win.webContents.send('overlay-settings-changed', id, content)
})

// ─── IPC: Active overlay list ───────────────────────────────────────────────
ipcMain.handle('get-active-overlays', () => {
  return store ? store.get('app.activeOverlays') || [] : []
})

// ─── IPC: Track map cache ──────────────────────────────────────────────────
ipcMain.handle('trackmap-save', (event, { trackId, points }) => {
  if (store) store.set('trackmap.' + trackId, points)
})
ipcMain.handle('trackmap-load', (event, trackId) => {
  const pts = store ? store.get('trackmap.' + trackId) : null
  console.log('[ARI] trackmap-load:', trackId, '→', pts ? pts.length + ' pts' : 'NOT FOUND')
  return pts || null
})

// ─── IPC: Visibility ────────────────────────────────────────────────────────
ipcMain.handle('show-overlay', (event, id) => {
  if (overlayWindows[id] && !overlayWindows[id].isDestroyed()) {
    overlayWindows[id].show()
  } else {
    createOverlayWindow(id, getSavedConfig(id))
  }
  if (store) {
    const active = store.get('app.activeOverlays') || []
    if (!active.includes(id)) store.set('app.activeOverlays', [...active, id])
  }
})

ipcMain.handle('hide-overlay', (event, id) => {
  if (overlayWindows[id] && !overlayWindows[id].isDestroyed())
    overlayWindows[id].hide()
  if (store) {
    const active = store.get('app.activeOverlays') || []
    store.set('app.activeOverlays', active.filter(x => x !== id))
  }
})

// ─── IPC: Passthrough ───────────────────────────────────────────────────────
ipcMain.handle('set-passthrough', (event, { id, enabled }) => {
  const win = overlayWindows[id]
  if (win && !win.isDestroyed())
    win.setIgnoreMouseEvents(enabled, { forward: true })
})

// ─── IPC: Drag ─────────────────────────────────────────────────────────────
ipcMain.handle('overlay-drag-move', (event, { id, dx, dy }) => {
  const win = overlayWindows[id]
  if (win && !win.isDestroyed()) {
    const [wx, wy] = win.getPosition()
    win.setPosition(wx + Math.round(dx), wy + Math.round(dy))
  }
})

ipcMain.handle('overlay-drag-end', (event, id) => {
  const win = overlayWindows[id]
  if (win && !win.isDestroyed()) {
    const [wx, wy] = win.getPosition()
    saveConfig(id, { x: wx, y: wy })
    win.setIgnoreMouseEvents(true, { forward: true })
  }
})

// ─── IPC: Reset layout ──────────────────────────────────────────────────────
ipcMain.handle('reset-overlay-positions', () => {
  Object.keys(overlayWindows).forEach(id => {
    const win = overlayWindows[id]
    if (win && !win.isDestroyed()) {
      const def = OVERLAY_DEFAULTS[id]
      win.setPosition(def.x, def.y)
      win.setSize(def.width, def.height)
      if (store) store.delete(`overlay.${id}`)
      win.webContents.send('overlay-scale', 1)
    }
  })
})

// ─── IPC: Presets ───────────────────────────────────────────────────────────
ipcMain.handle('get-presets',     ()                  => store ? store.get('app.presets') || {} : {})
ipcMain.handle('apply-preset',    (event, key)        => applyPreset(key))
ipcMain.handle('get-auto-preset', ()                  => store ? store.get('app.autoPreset') || false : false)
ipcMain.handle('set-auto-preset', (event, enabled)    => { if (store) store.set('app.autoPreset', enabled) })

ipcMain.handle('save-preset', (event, key, preset) => {
  if (!store) return
  const all = store.get('app.presets') || {}
  all[key] = { ...preset, saved: true }
  store.set('app.presets', all)
})

// ─── Preset helpers ─────────────────────────────────────────────────────────
function toPresetKey(sessionType) {
  const t = (sessionType || '').toLowerCase()
  if (t.includes('qualify')) return 'qualify'
  if (t.includes('practice') || t.includes('offline')) return 'practice'
  return 'race'
}

function applyPreset(key) {
  if (!store) return
  const presets = store.get('app.presets') || {}
  const preset  = presets[key]
  if (!preset || !preset.saved) return

  const targetIds = new Set(preset.activeOverlays || [])

  // Hide overlays that are not in the preset
  Object.entries(overlayWindows).forEach(([id, win]) => {
    if (!win || win.isDestroyed()) return
    if (targetIds.has(id)) {
      if (!win.isVisible()) win.show()
    } else {
      if (win.isVisible()) win.hide()
    }
  })

  // Create windows for preset overlays that do not exist yet
  preset.activeOverlays.forEach(id => {
    if (OVERLAY_DEFAULTS[id]) {
      const win = overlayWindows[id]
      if (!win || win.isDestroyed()) createOverlayWindow(id, getSavedConfig(id))
    }
  })

  // Persist active overlays
  store.set('app.activeOverlays', preset.activeOverlays)

  // Apply per-overlay column/content settings
  const overlaySettings = preset.overlaySettings || {}
  Object.entries(overlaySettings).forEach(([id, settings]) => {
    store.set('overlay.' + id + '.content', settings)
    const win = overlayWindows[id]
    if (win && !win.isDestroyed()) win.webContents.send('overlay-settings-changed', id, settings)
  })

  // Notify control panel so its toggle state re-syncs
  if (controlWindow && !controlWindow.isDestroyed())
    controlWindow.webContents.send('preset-applied', key, preset)

  console.log('[ARI] Preset applied:', key, '(' + (preset.activeOverlays || []).length + ' overlays)')
}

// ─── Telemetry Broadcast ────────────────────────────────────────────────────
function broadcastTelemetry(data) {
  // Detect session type changes and auto-apply matching preset
  const incoming = data.telemetry?.sessionType
  if (incoming && incoming !== lastSessionType) {
    const prev = lastSessionType
    lastSessionType = incoming
    const key = toPresetKey(incoming)
    if (prev !== null) {   // skip the very first frame -- not a real transition
      if (controlWindow && !controlWindow.isDestroyed())
        controlWindow.webContents.send('session-type-change', { sessionType: incoming, presetKey: key })
      if (store && (store.get('app.autoPreset') || false))
        applyPreset(key)
    }
  }

  if (controlWindow && !controlWindow.isDestroyed())
    controlWindow.webContents.send('telemetry-update', data)
  Object.values(overlayWindows).forEach(win => {
    if (win && !win.isDestroyed()) win.webContents.send('telemetry-update', data)
  })
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await loadStore()
  if (Store) store = new Store({ name: 'ari-layout' })
  createControlWindow()

  // Restore overlays that were active in the previous session
  if (store) {
    const activeIds = store.get('app.activeOverlays') || []
    activeIds.forEach(id => {
      if (OVERLAY_DEFAULTS[id]) createOverlayWindow(id, getSavedConfig(id))
    })
  }

  iracingSDK = new IRacingSDK(broadcastTelemetry)
  iracingSDK.start()

  try { enableIRacingTelemetry() } catch(e) { console.warn('[ARI] telemetry enable error:', e.message) }
  try { scanIbtFiles(store) } catch(e) { console.warn('[ARI] ibt scan error:', e.message) }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow()
  })
})

app.on('window-all-closed', () => {
  if (iracingSDK) iracingSDK.stop()
  if (process.platform !== 'darwin') app.quit()
})
