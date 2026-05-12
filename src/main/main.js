const { app, BrowserWindow, ipcMain, screen } = require('electron')
const { scanIbtFiles, enableIRacingTelemetry } = require('./trackmap-builder')
const path = require('path')
const IRacingSDK    = require('./iracing')
const AriHttpServer = require('./httpServer')

const isDev = !app.isPackaged

let controlWindow  = null
let overlayWindows = {}
let iracingSDK         = null
let Store              = null
let lastSessionType    = null   // tracks last seen sessionType for change detection
let httpServer         = null   // AriHttpServer instance, created on demand

async function loadStore() {
  try {
    const mod = await import('electron-store')
    Store = mod.default
  } catch (e) {
    console.warn('[ARI] electron-store unavailable')
  }
}

let store = null

// Default position and size for each overlay window.
// All width/height values are sized for body { zoom: 1.4 } in global.css.
// CSS content is designed at 1/1.4 the window size; the window must be 1.4×
// larger so the zoomed content fills it exactly.
const OVERLAY_DEFAULTS = {
  relative:      { x: 20,   y: 100,  width: 420,  height: 350  },
  standings:     { x: 20,   y: 470,  width: 420,  height: 434  },
  fuel:          { x: 20,   y: 930,  width: 420,  height: 308  },
  trackmap:      { x: 460,  y: 100,  width: 308,  height: 358  },
  inputs:        { x: 460,  y: 478,  width: 504,  height: 112  },
  tyres:         { x: 854,  y: 100,  width: 350,  height: 504  },
  radar:         { x: 1232, y: 100,  width: 252,  height: 280  },
  headtohead:    { x: 460,  y: 632,  width: 420,  height: 294  },
  flags:         { x: 924,  y: 588,  width: 294,  height: 154  },
  delta:         { x: 460,  y: 980,  width: 504,  height: 98   },
  lapgraph:      { x: 1232, y: 420,  width: 420,  height: 252  },
  laplog:        { x: 1232, y: 686,  width: 392,  height: 350  },
  sessiontimer:  { x: 924,  y: 434,  width: 294,  height: 154  },
  overtakealert: { x: 784,  y: 770,  width: 392,  height: 106  },
  blindspot:     { x: 812,  y: 966,  width: 224,  height: 120  },
  boostbox:      { x: 1232, y: 1050, width: 280,  height: 154  },
  weather:       { x: 924,  y: 756,  width: 280,  height: 182  },
  raceschedule:  { x: 20,   y: 1176, width: 420,  height: 210  },
  hstandings:    { x: 20,   y: 1414, width: 1344, height: 112  },
  leaderboard:   { x: 1652, y: 100,  width: 392,  height: 588  },
  flatmap:       { x: 1652, y: 742,  width: 280,  height: 280  },
  minimap:       { x: 1652, y: 1036, width: 210,  height: 210  },
  laptimespread: { x: 1232, y: 1050, width: 392,  height: 154  },
  advancedpanel: { x: 460,  y: 1008, width: 504,  height: 280  },
  datablocks:    { x: 460,  y: 1302, width: 308,  height: 140  },
  heartrate:     { x: 924,  y: 952,  width: 224,  height: 140  },
  gforce:        { x: 1498, y: 100,  width: 252,  height: 280  },
  digiflag:      { x: 784,  y: 588,  width: 448,  height: 266  },
  pitboxhelper:  { x: 784,  y: 952,  width: 364,  height: 154  },
  incident:      { x: 20,   y: 280,  width: 308,  height: 308  },
  battle:        { x: 460,  y: 100,  width: 392,  height: 308  },
  garagecover:   { x: 784,  y: 364,  width: 588,  height: 448  },
}

function getSavedConfig(id) {
  const def = OVERLAY_DEFAULTS[id]
  if (!def) return null
  if (store) {
    const saved = store.get(`overlay.${id}`)
    if (saved) return {
      x:      saved.x      ?? def.x,
      y:      saved.y      ?? def.y,
      width:  saved.width  ?? def.width,
      height: saved.height ?? def.height,
    }
  }
  return { x: def.x, y: def.y, width: def.width, height: def.height }
}

function saveConfig(id, partial) {
  if (!store) return
  const existing = store.get(`overlay.${id}`) || {}
  store.set(`overlay.${id}`, { ...existing, ...partial })
}

// ─── Control Panel ─────────────────────────────────────────────────────────
function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1400, height: 880, minWidth: 900, minHeight: 600,
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

// ─── Overlay Factory ────────────────────────────────────────────────────────
function createOverlayWindow(id, config) {
  const { x, y, width, height } = config
  const def = OVERLAY_DEFAULTS[id] || {}
  const minWidth  = Math.max(120, Math.round((def.width  || 200) * 0.4))
  const minHeight = Math.max(60,  Math.round((def.height || 100) * 0.4))

  const win = new BrowserWindow({
    x, y,
    width:  Math.max(minWidth,  width),
    height: Math.max(minHeight, height),
    minWidth,
    minHeight,
    show: false,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: true, focusable: false, hasShadow: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.setIgnoreMouseEvents(true, { forward: true })
  const vrMode = store ? store.get('app.vrMode') || false : false
  win.setAlwaysOnTop(true, vrMode ? 'normal' : 'screen-saver')
  if (isDev) win.loadURL(`http://localhost:5173/#/overlay/${id}`)
  else win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'), { hash: `/overlay/${id}` })
  overlayWindows[id] = win
  win.webContents.once('did-finish-load', () => {
    win.showInactive()
    console.log('[ARI] Overlay shown:', id, 'bounds:', JSON.stringify(win.getBounds()))
  })
  win.on('resized', () => {
    const [newW, newH] = win.getSize()
    saveConfig(id, { width: newW, height: newH })
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

// ─── IPC: Track map turns (SVG-derived) ────────────────────────────────────
ipcMain.handle('trackmapturns-save', (event, { trackId, turns }) => {
  if (store) store.set('trackmapturns.' + trackId, turns)
})
ipcMain.handle('trackmapturns-load', (event, trackId) => {
  const v = store ? store.get('trackmapturns.' + trackId) : undefined
  return v !== undefined ? v : null
})

// ─── IPC: Fetch SVG from iRacing CDN (bypasses renderer CORS) ──────────────
ipcMain.handle('fetch-track-svg', async (event, url) => {
  const https = require('https')
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
})

// ─── IPC: Resolve track map CDN base URL from iRacing Electron cache ────────
// iRacing's Electron app caches the exact CDN URLs it uses (e.g.
// tracks_virginia/465-virginia-2022-full/active.svg). We read that cache to
// get the correct folder + slug for any track — no guessing required.
ipcMain.handle('lookup-trackmap-cdn-base', (event, trackId) => {
  const fs   = require('fs')
  const os   = require('os')
  const path = require('path')
  const cacheFile = path.join(
    os.homedir(),
    'AppData', 'Roaming', 'iracing-electron',
    'Cache', 'Cache_Data', 'data_1'
  )
  try {
    const buf = fs.readFileSync(cacheFile)
    // Cache index stores URLs as ASCII — search as latin1 string
    const str = buf.toString('latin1')
    const re  = new RegExp(`tracks_([^/\\x00]+)/${trackId}-([^/\\x00]+)/active\\.svg`)
    const m   = re.exec(str)
    if (m) {
      return `https://members-assets.iracing.com/public/track-maps/tracks_${m[1]}/${trackId}-${m[2]}`
    }
  } catch (_) {}
  return null
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
  }
})

ipcMain.handle('overlay-resize-end', (event, id) => {
  const win = overlayWindows[id]
  if (win && !win.isDestroyed()) {
    const [w, h] = win.getSize()
    saveConfig(id, { width: w, height: h })
  }
})

// ─── IPC: Get / set overlay size ────────────────────────────────────────────
ipcMain.handle('get-overlay-size', (event, id) => {
  const def = OVERLAY_DEFAULTS[id]
  if (!def) return null
  const cfg = getSavedConfig(id)
  return {
    width:         cfg.width,
    height:        cfg.height,
    defaultWidth:  def.width,
    defaultHeight: def.height,
    minWidth:  Math.max(120, Math.round(def.width  * 0.4)),
    minHeight: Math.max(60,  Math.round(def.height * 0.4)),
  }
})

ipcMain.handle('set-overlay-size', (event, id, width, height) => {
  const def = OVERLAY_DEFAULTS[id]
  if (!def) return
  const minW = Math.max(120, Math.round(def.width  * 0.4))
  const minH = Math.max(60,  Math.round(def.height * 0.4))
  const w = Math.max(minW, Math.round(width))
  const h = Math.max(minH, Math.round(height))
  const win = overlayWindows[id]
  if (win && !win.isDestroyed()) win.setSize(w, h)
  saveConfig(id, { width: w, height: h })
})

// ─── IPC: Reset layout ──────────────────────────────────────────────────────
ipcMain.handle('reset-overlay-position', (event, id) => {
  const win = overlayWindows[id]
  const def = OVERLAY_DEFAULTS[id]
  if (!def) return
  if (win && !win.isDestroyed()) {
    win.setPosition(def.x, def.y)
    win.setSize(def.width, def.height)
  }
  if (store) {
    const saved = store.get(`overlay.${id}`) || {}
    delete saved.x; delete saved.y; delete saved.width; delete saved.height
    store.set(`overlay.${id}`, saved)
  }
})

ipcMain.handle('reset-overlay-positions', () => {
  Object.keys(overlayWindows).forEach(id => {
    const win = overlayWindows[id]
    if (win && !win.isDestroyed()) {
      const def = OVERLAY_DEFAULTS[id]
      win.setPosition(def.x, def.y)
      if (store) {
        const saved = store.get(`overlay.${id}`) || {}
        delete saved.x; delete saved.y
        store.set(`overlay.${id}`, saved)
      }
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

// ─── IPC: Network streaming ─────────────────────────────────────────────────
ipcMain.handle('get-network-status', () => {
  if (!httpServer) return { active: false, available: false, urls: [], clients: 0 }
  return {
    active:    httpServer.active,
    available: httpServer.available,
    urls:      httpServer.active ? httpServer.getUrls() : [],
    clients:   httpServer.clientCount,
  }
})

ipcMain.handle('start-http-server', async (event, port = 7001) => {
  if (!httpServer) {
    httpServer = new AriHttpServer({
      isDev:   isDev,
      appPath: app.getAppPath(),
      onClientCountChange: (n) => {
        if (controlWindow && !controlWindow.isDestroyed())
          controlWindow.webContents.send('network-status', {
            active: true, available: true,
            urls: httpServer.getUrls(), clients: n,
          })
      },
    })
  }
  if (httpServer.active) return { ok: true }
  try {
    await httpServer.start(port)
    if (store) store.set('app.networkEnabled', true)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('stop-http-server', async () => {
  if (httpServer) await httpServer.stop()
  if (store) store.set('app.networkEnabled', false)
  if (controlWindow && !controlWindow.isDestroyed())
    controlWindow.webContents.send('network-status', { active: false, available: !!httpServer?.available, urls: [], clients: 0 })
})


// ─── IPC: Named layouts ─────────────────────────────────────────────────────
ipcMain.handle('get-named-layouts', () => {
  return store ? store.get('app.namedLayouts') || [] : []
})

ipcMain.handle('save-named-layout', (event, layout) => {
  if (!store) return
  const all = store.get('app.namedLayouts') || []
  const idx = all.findIndex(l => l.id === layout.id)
  if (idx >= 0) all[idx] = layout
  else all.push(layout)
  store.set('app.namedLayouts', all)
})

ipcMain.handle('delete-named-layout', (event, id) => {
  if (!store) return
  const all = store.get('app.namedLayouts') || []
  store.set('app.namedLayouts', all.filter(l => l.id !== id))
})

ipcMain.handle('apply-named-layout', (event, layout) => {
  if (!store) return
  const targetIds = new Set(layout.activeOverlays || [])

  // Hide overlays not in layout
  Object.entries(overlayWindows).forEach(([id, win]) => {
    if (!win || win.isDestroyed()) return
    if (targetIds.has(id)) { if (!win.isVisible()) win.show() }
    else { if (win.isVisible()) win.hide() }
  })

  // Create windows that don't exist yet, applying layout positions where available
  ;(layout.activeOverlays || []).forEach(id => {
    if (OVERLAY_DEFAULTS[id]) {
      const win = overlayWindows[id]
      const layoutPos = (layout.overlayPositions || {})[id]
      const baseConfig = getSavedConfig(id)
      const config = layoutPos ? { ...baseConfig, ...layoutPos } : baseConfig
      if (!win || win.isDestroyed()) {
        createOverlayWindow(id, config)
      } else if (layoutPos) {
        win.setPosition(layoutPos.x, layoutPos.y)
        win.setSize(layoutPos.width, layoutPos.height)
      }
    }
  })

  store.set('app.activeOverlays', layout.activeOverlays || [])

  // Apply per-overlay settings
  const overlaySettings = layout.overlaySettings || {}
  Object.entries(overlaySettings).forEach(([id, settings]) => {
    store.set('overlay.' + id + '.content', settings)
    const win = overlayWindows[id]
    if (win && !win.isDestroyed()) win.webContents.send('overlay-settings-changed', id, settings)
  })

  if (controlWindow && !controlWindow.isDestroyed())
    controlWindow.webContents.send('layout-applied', layout)

  console.log('[ARI] Named layout applied:', layout.name, '(' + (layout.activeOverlays || []).length + ' overlays)')
})

// ─── IPC: Bridge status ─────────────────────────────────────────────────────
ipcMain.handle('get-bridge-status', () => iracingSDK ? iracingSDK.bridgeStatus : 'starting')

// ─── IPC: VR mode ───────────────────────────────────────────────────────────
ipcMain.handle('get-vr-mode', () => store ? store.get('app.vrMode') || false : false)

ipcMain.handle('set-vr-mode', (event, enabled) => {
  if (store) store.set('app.vrMode', enabled)
  const level = enabled ? 'normal' : 'screen-saver'
  Object.values(overlayWindows).forEach(win => {
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(true, level)
  })
  console.log('[ARI] VR mode:', enabled ? 'ON (normal level)' : 'OFF (screen-saver level)')
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

  // Broadcast to remote WebSocket clients
  if (httpServer) httpServer.broadcast(data)
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

  // Auto-restore network server if it was running last session
  if (store && store.get('app.networkEnabled')) {
    httpServer = new AriHttpServer({
      isDev:   isDev,
      appPath: app.getAppPath(),
      onClientCountChange: (n) => {
        if (controlWindow && !controlWindow.isDestroyed())
          controlWindow.webContents.send('network-status', {
            active: true, available: true,
            urls: httpServer.getUrls(), clients: n,
          })
      },
    })
    httpServer.start().catch(e => console.warn('[ARI] HTTP server auto-start failed:', e.message))
  }

  iracingSDK = new IRacingSDK(broadcastTelemetry, {
    onBridgeStatus: (status) => {
      if (controlWindow && !controlWindow.isDestroyed())
        controlWindow.webContents.send('bridge-status', status)
    },
  })
  iracingSDK.start()

  try { enableIRacingTelemetry() } catch(e) { console.warn('[ARI] telemetry enable error:', e.message) }
  try { scanIbtFiles(store) } catch(e) { console.warn('[ARI] ibt scan error:', e.message) }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow()
  })
})

app.on('window-all-closed', () => {
  if (iracingSDK) iracingSDK.stop()
  if (httpServer)  httpServer.stop()
  if (process.platform !== 'darwin') app.quit()
})
