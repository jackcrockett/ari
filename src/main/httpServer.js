/**
 * ARI HTTP + WebSocket telemetry server.
 *
 * Serves live telemetry to remote devices (second monitor, phone, tablet).
 * WebSocket endpoint: ws://HOST:PORT/telemetry
 * HTTP GET /         Serves the renderer app (prod) or a redirect page (dev)
 * HTTP GET /status   JSON status: { clients, version }
 *
 * Requires the 'ws' npm package. Degrades gracefully if not installed.
 */

const http = require('http')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

let WS
try { WS = require('ws') } catch(_) { WS = null }

// ─── IP helpers ───────────────────────────────────────────────────────────────

function getLocalIPs() {
  const ips = []
  const ifaces = os.networkInterfaces()
  Object.values(ifaces).forEach(nets => {
    nets.forEach(net => {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address)
    })
  })
  return ips.length > 0 ? ips : ['127.0.0.1']
}

// ─── Server class ─────────────────────────────────────────────────────────────

class AriHttpServer {
  constructor({ isDev, appPath, onClientCountChange }) {
    this.isDev      = isDev
    this.appPath    = appPath
    this.onCount    = onClientCountChange || (() => {})
    this.server     = null
    this.wss        = null
    this.clients    = new Set()
    this.port       = 7001
    this.active     = false
  }

  get available() { return !!WS }

  get clientCount() { return this.clients.size }

  getUrls() {
    return getLocalIPs().map(ip => ({
      http: `http://${ip}:${this.port}`,
      ws:   `ws://${ip}:${this.port}/telemetry`,
    }))
  }

  async start(port = 7001) {
    if (!WS) throw new Error("'ws' package not installed -- run: npm install")
    if (this.active) return

    this.port = port

    this.server = http.createServer((req, res) => this._handleHttp(req, res))

    this.wss = new WS.Server({ server: this.server, path: '/telemetry' })
    this.wss.on('connection', ws => {
      this.clients.add(ws)
      this.onCount(this.clients.size)
      ws.on('close',   () => { this.clients.delete(ws); this.onCount(this.clients.size) })
      ws.on('error',   () => { this.clients.delete(ws); this.onCount(this.clients.size) })
    })

    await new Promise((resolve, reject) => {
      this.server.listen(port, '0.0.0.0', resolve)
      this.server.on('error', reject)
    })

    this.active = true
    console.log('[ARI] HTTP server on port', port, '-- IPs:', getLocalIPs().join(', '))
  }

  async stop() {
    if (!this.active) return
    this.clients.forEach(ws => ws.terminate())
    this.clients.clear()
    await new Promise(resolve => {
      if (this.wss)    this.wss.close()
      if (this.server) this.server.close(resolve)
      else             resolve()
    })
    this.active = false
    this.onCount(0)
    console.log('[ARI] HTTP server stopped')
  }

  broadcast(data) {
    if (!this.active || this.clients.size === 0) return
    const json = JSON.stringify(data)
    this.clients.forEach(ws => {
      if (ws.readyState === WS.OPEN) ws.send(json)
    })
  }

  _handleHttp(req, res) {
    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ clients: this.clients.size, version: '0.10', active: true }))
      return
    }

    // Serve renderer -- inject __ARI_WS__ so useTelemetry picks up the WS URL
    const distIndex = path.join(this.appPath, 'dist', 'renderer', 'index.html')
    if (!this.isDev && fs.existsSync(distIndex)) {
      let html = fs.readFileSync(distIndex, 'utf8')
      const ips    = getLocalIPs()
      const wsUrl  = `ws://${ips[0]}:${this.port}/telemetry`
      // Inject before </head>
      html = html.replace(
        '</head>',
        `<script>window.__ARI_WS__="${wsUrl}"</script></head>`
      )
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
      return
    }

    // Dev mode or dist not built: serve a simple info page
    const ips    = getLocalIPs()
    const wsUrl  = `ws://${ips[0]}:${this.port}/telemetry`
    const devUrl = `http://${ips[0]}:5173`
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARI Remote</title>
<style>
  body{background:#0e0e10;color:#fff;font-family:monospace;padding:24px;line-height:1.6}
  h2{color:#E8001D;margin:0 0 16px}code{background:#1a1a1c;padding:2px 6px;border-radius:3px;color:#22C55E}
  .url{margin:8px 0;font-size:15px}
</style>
</head><body>
<h2>ARI Remote Access</h2>
<p>Open one of these URLs on your device:</p>
${ips.map(ip => `<div class="url"><code>http://${ip}:5173</code></div>`).join('\n')}
<p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:16px">
  WebSocket: <code>${wsUrl}</code><br>
  Clients connected: ${this.clients.size}
</p>
</body></html>`)
  }
}

module.exports = AriHttpServer
