const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const IRacingSDK = require('./iracing')

const isDev = !app.isPackaged

let controlWindow = null
let overlayWindows = {}
let iracingSDK = null
let Store = null

async function loadStore() {
  try {
    const mod = await import('electron-store')
    Store = mod.default
  } catch (e) {
    console.warn('[ARI] electron-store unavailable')
  }
}

let store = null

const OVERLAY_DEFAULTS = {
  relative:  { x: 20,  y: 100, width: 300, height: 225 },
  standings: { x: 20,  y: 340, width: 300, height: 295 },
  fuel:      { x: 20,  y: 650, width: 300, height: 175 },
  trackmap:  { x: 340, y: 100, width: 220, height: 255 },
  inputs:    { x: 340, y: 370, width: 260, height: 220 }
}

function getSavedConfig(id) {
  if (store) {
    const saved = store.get(`overlay.${id}`)
    if (saved) return { ...OVERLAY_DEFAULTS[id], ...saved }
  }
  return OVERLAY_DEFAULTS[id]
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
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'ARI — Aventa Race Intelligence'
  })
  if (isDev) controlWindow.loadURL('http://localhost:5173')
  else controlWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  controlWindow.on('closed', () => { controlWindow = null; app.quit() })
}

// ─── Overlay Factory ────────────────────────────────────────────────────────
function createOverlayWindow(id, config) {
  const { x, y, width, height } = config
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
  return win
}

// ─── IPC: Visibility ────────────────────────────────────────────────────────
ipcMain.handle('show-overlay', (event, id) => {
  if (overlayWindows[id] && !overlayWindows[id].isDestroyed()) {
    overlayWindows[id].show()
  } else {
    createOverlayWindow(id, getSavedConfig(id))
  }
})

ipcMain.handle('hide-overlay', (event, id) => {
  if (overlayWindows[id] && !overlayWindows[id].isDestroyed())
    overlayWindows[id].hide()
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

// ─── IPC: Resize ────────────────────────────────────────────────────────────
// corner: 'nw' | 'ne' | 'sw' | 'se'
ipcMain.handle('overlay-resize-move', (event, { id, corner, dx, dy }) => {
  const win = overlayWindows[id]
  if (!win || win.isDestroyed()) return

  const def = OVERLAY_DEFAULTS[id]
  const [wx, wy] = win.getPosition()
  const [ww, wh] = win.getSize()

  let newX = wx, newY = wy, newW = ww, newH = wh

  // NW corner: move origin, shrink size
  if (corner === 'nw') { newX += dx; newY += dy; newW -= dx; newH -= dy }
  // NE corner: move origin Y only, expand width
  if (corner === 'ne') { newY += dy; newW += dx; newH -= dy }
  // SW corner: move origin X only, expand height
  if (corner === 'sw') { newX += dx; newW -= dx; newH += dy }
  // SE corner: pure expand
  if (corner === 'se') { newW += dx; newH += dy }

  // Enforce minimums (default size is the floor)
  newW = Math.max(def.width,  Math.round(newW))
  newH = Math.max(def.height, Math.round(newH))

  // If width/height was clamped, don't shift origin either
  if (newW === def.width  && (corner === 'nw' || corner === 'sw')) newX = wx
  if (newH === def.height && (corner === 'nw' || corner === 'ne')) newY = wy

  win.setPosition(Math.round(newX), Math.round(newY))
  win.setSize(newW, newH)

  // Push updated size to renderer so it can rescale content live
  win.webContents.send('overlay-size', {
    width: newW, height: newH,
    defaultWidth: def.width, defaultHeight: def.height
  })
})

ipcMain.handle('overlay-resize-end', (event, id) => {
  const win = overlayWindows[id]
  if (!win || win.isDestroyed()) return
  const [wx, wy] = win.getPosition()
  const [ww, wh] = win.getSize()
  saveConfig(id, { x: wx, y: wy, width: ww, height: wh })
  win.setIgnoreMouseEvents(true, { forward: true })
})

// ─── IPC: Get size (renderer needs to know its own window dims for scaling) ─
ipcMain.handle('get-overlay-size', (event, id) => {
  const win = overlayWindows[id]
  if (!win || win.isDestroyed()) return null
  const [w, h] = win.getSize()
  const def = OVERLAY_DEFAULTS[id]
  return { width: w, height: h, defaultWidth: def.width, defaultHeight: def.height }
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
    }
  })
})

// ─── Telemetry Broadcast ────────────────────────────────────────────────────
function broadcastTelemetry(data) {
  if (controlWindow && !controlWindow.isDestroyed())
    controlWindow.webContents.send('telemetry-update', data)
  Object.values(overlayWindows).forEach(win => {
    if (win && !win.isDestroyed()) win.webContents.send('telemetry-update', data)
  })
}

// Broadcast window size changes to the overlay renderer so it can rescale
function broadcastSize(id, win) {
  if (win.isDestroyed()) return
  const [w, h] = win.getSize()
  const def = OVERLAY_DEFAULTS[id]
  win.webContents.send('overlay-size', { width: w, height: h, defaultWidth: def.width, defaultHeight: def.height })
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await loadStore()
  if (Store) store = new Store({ name: 'ari-layout' })
  createControlWindow()
  iracingSDK = new IRacingSDK(broadcastTelemetry)
  iracingSDK.start()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow()
  })
})

app.on('window-all-closed', () => {
  if (iracingSDK) iracingSDK.stop()
  if (process.platform !== 'darwin') app.quit()
})
