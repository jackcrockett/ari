/**
 * ARI Track Map Builder
 * Loads bundled track GPS data + scans ibt files for new tracks
 */

const fs   = require('fs')
const path = require('path')
const os   = require('os')

// ─── ibt parsing constants ────────────────────────────────────────────────────
const OFF_SESS_LEN    = 16
const OFF_SESS_OFFSET = 20
const OFF_NUM_VARS    = 24
const OFF_VAR_HEADER  = 28
const OFF_BUF_LEN     = 36
const OFF_REC_COUNT   = 140
const VAR_STRIDE      = 144
const TYPE_SIZE       = [1,1,4,4,4,8]

function readNum(buf, pos, type) {
  if (pos + TYPE_SIZE[type] > buf.length) return undefined
  switch(type) {
    case 0: case 1: return buf.readUInt8(pos)
    case 2: return buf.readInt32LE(pos)
    case 3: return buf.readUInt32LE(pos)
    case 4: return buf.readFloatLE(pos)
    case 5: return buf.readDoubleLE(pos)
  }
}

function normalise(pts) {
  if (!pts || pts.length < 2) return pts
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity
  pts.forEach(([x,y])=>{ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y })
  const rx=x1-x0||1, ry=y1-y0||1, s=Math.min(1/rx,1/ry)
  const ox=(1-rx*s)/2, oy=(1-ry*s)/2
  return pts.map(([x,y])=>[Math.round((ox+(x-x0)*s)*1e4)/1e4, Math.round((oy+(y-y0)*s)*1e4)/1e4])
}

function readIbt(filePath) {
  try {
    const buf      = fs.readFileSync(filePath)
    if (buf.length < 400) return null
    const sessLen  = buf.readInt32LE(OFF_SESS_LEN)
    const sessOff  = buf.readInt32LE(OFF_SESS_OFFSET)
    const bufLen   = buf.readInt32LE(OFF_BUF_LEN)
    const recCount = buf.readInt32LE(OFF_REC_COUNT)
    const dataStart= sessOff + sessLen
    if (bufLen<=0 || recCount<=0 || dataStart+recCount*bufLen > buf.length+1000) return null

    // Build var map
    const nv = buf.readInt32LE(OFF_NUM_VARS)
    const vh = buf.readInt32LE(OFF_VAR_HEADER)
    const vm = {}
    for (let i=0; i<nv; i++) {
      const b = vh + i*VAR_STRIDE
      if (b+VAR_STRIDE > buf.length) break
      const name = buf.slice(b+16,b+48).toString('utf8').replace(/\0[\s\S]*$/,'').trim()
      if (name) vm[name] = { type: buf.readInt32LE(b), offset: buf.readInt32LE(b+4) }
    }
    if (!vm['Lat'] || !vm['Lon'] || !vm['LapDistPct']) return null

    // Get track info from YAML
    let trackId='', trackName=''
    if (sessOff>0 && sessLen>0 && sessOff+sessLen<=buf.length) {
      const yaml = buf.slice(sessOff,sessOff+sessLen).toString('utf8').replace(/\0[\s\S]*$/,'')
      trackId   = (yaml.match(/TrackID:\s*(\d+)/)||[])[1]||''
      trackName = ((yaml.match(/TrackDisplayName:\s*(.+)/)||[])[1]||'').trim().replace(/^'|'$/g,'')
    }
    if (!trackId) return null

    // Sample records
    const SLOTS=512, step=Math.max(1,Math.floor(recCount/5000))
    const slots=new Array(SLOTS).fill(null)
    for (let rec=0; rec<recCount; rec+=step) {
      const base=dataStart+rec*bufLen
      if (base+bufLen>buf.length) break
      const rv=(n)=>{ const v=vm[n]; return v ? readNum(buf,base+v.offset,v.type) : undefined }
      const pct=rv('LapDistPct'), lat=rv('Lat'), lon=rv('Lon')
      if (pct==null||lat==null||lon==null||lat===0) continue
      const slot=Math.floor((((pct%1)+1)%1)*SLOTS)
      if (!slots[slot]) slots[slot]=[lon,lat]
    }
    if (slots.filter(Boolean).length < SLOTS*0.5) return null

    // Interpolate gaps
    for (let p=0; p<4; p++)
      for (let i=0; i<SLOTS; i++)
        if (!slots[i]) {
          const a=slots[(i-1+SLOTS)%SLOTS], b=slots[(i+1)%SLOTS]
          if (a&&b) slots[i]=[(a[0]+b[0])/2,(a[1]+b[1])/2]
        }

    return { trackId, trackName, points: normalise(slots.filter(Boolean)) }
  } catch(e) { return null }
}

function findDir(subpath) {
  const candidates = [
    path.join(os.homedir(), 'Documents', 'iRacing', subpath),
    path.join('C:\\Users', os.userInfo().username, 'Documents', 'iRacing', subpath),
    path.join(process.env.USERPROFILE||'', 'Documents', 'iRacing', subpath),
  ]
  return candidates.find(d=>{ try{return fs.existsSync(d)}catch(_){return false} })||null
}

function enableIRacingTelemetry() {
  const p = findDir('app.ini')
  if (!p) return
  try {
    let ini = fs.readFileSync(p,'utf8')
    if (ini.includes('diskLogger=1')) return
    ini = ini.includes('diskLogger=0') ? ini.replace('diskLogger=0','diskLogger=1')
            : ini.includes('[DataLogger]') ? ini.replace('[DataLogger]','[DataLogger]\ndiskLogger=1')
            : ini + '\n[DataLogger]\ndiskLogger=1\n'
    fs.writeFileSync(p, ini, 'utf8')
    console.log('[ARI] Enabled iRacing telemetry — restart iRacing to apply')
  } catch(e) {}
}

function scanIbtFiles(store) {
  // Load bundled tracks first
  let bundled
  try { bundled = require('./track-database') } catch(e) { bundled = {} }
  let bc = 0
  for (const [id, pts] of Object.entries(bundled)) {
    if (store) { store.set('trackmap.'+id, pts); bc++ }
  }
  if (bc>0) console.log('[ARI] Loaded '+bc+' bundled track maps (always fresh)')

  // Scan ibt files
  const dir = findDir('telemetry')
  if (!dir) { console.log('[ARI] No telemetry folder — enable in iRacing with Alt+L'); return {} }
  let files
  try {
    files = fs.readdirSync(dir).filter(f=>f.endsWith('.ibt'))
      .map(f=>path.join(dir,f))
      .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs)
  } catch(e) { return {} }

  console.log('[ARI] Scanning '+files.length+' ibt files...')
  const results={}, seen=new Set(Object.keys(bundled))
  for (const file of files) {
    try {
      const r = readIbt(file)
      if (!r||seen.has(r.trackId)) continue
      seen.add(r.trackId)
      if (store) store.set('trackmap.'+r.trackId, r.points)
      results[r.trackId]=r
      console.log('[ARI] Built track map: '+r.trackName+' ('+r.points.length+' pts)')
    } catch(e) {}
  }
  return results
}

module.exports = { scanIbtFiles, readIbt, enableIRacingTelemetry }
