import React, { useEffect, useRef, useState } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'

const CAR_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

function toCanvas(pt, ox, oy, drawW, drawH) {
  return [ox + pt[0] * drawW, oy + (1 - pt[1]) * drawH]
}

function posOnTrack(pct, pts, ox, oy, drawW, drawH, sfOffset = 0) {
  if (!pts || pts.length < 2) return [ox + drawW / 2, oy + drawH / 2]
  const n = pts.length
  const f = (((pct + sfOffset) % 1) + 1) % 1 * n
  const i = Math.floor(f) % n
  const t = f - Math.floor(f)
  const a = toCanvas(pts[i],           ox, oy, drawW, drawH)
  const b = toCanvas(pts[(i + 1) % n], ox, oy, drawW, drawH)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function buildSvgUrl(trackId, internalName, configName, layer) {
  if (!internalName || !trackId) return null
  const slug = configName
    ? internalName + '-' + configName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : internalName
  return `https://members-assets.iracing.com/public/track-maps/tracks_${internalName}/${trackId}-${slug}/${layer}.svg`
}

function longestSubpath(d, ns, parentSvg) {
  const segments = d.replace(/([Zz])\s*([Mm])/g, '$1\x00$2').split('\x00').map(s => s.trim()).filter(Boolean)
  if (segments.length <= 1) return d
  let bestD = segments[0], bestLen = 0
  for (const seg of segments) {
    const el = document.createElementNS(ns, 'path')
    el.setAttribute('d', seg)
    parentSvg.appendChild(el)
    const len = el.getTotalLength()
    parentSvg.removeChild(el)
    if (len > bestLen) { bestLen = len; bestD = seg }
  }
  return bestD
}

async function svgPathToPoints(pathD, viewBoxStr, numPoints = 600) {
  const ns  = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', viewBoxStr)
  svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:1px;height:1px;overflow:hidden'
  document.body.appendChild(svg)

  const parts = viewBoxStr.trim().split(/[\s,]+/).map(Number)
  const [, , vbW, vbH] = parts.length >= 4 ? parts : [0, 0, 1920, 1080]

  const mainD  = longestSubpath(pathD, ns, svg)
  const pathEl = document.createElementNS(ns, 'path')
  pathEl.setAttribute('d', mainD)
  svg.appendChild(pathEl)

  const totalLen = pathEl.getTotalLength()
  const raw = []
  for (let i = 0; i < numPoints; i++) {
    const pt = pathEl.getPointAtLength((i / numPoints) * totalLen)
    raw.push([pt.x, pt.y])
  }
  document.body.removeChild(svg)

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of raw) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const pts = raw.map(([x, y]) => [(x - minX) / rangeX, 1 - (y - minY) / rangeY])
  const bounds = { minX, maxX, minY, maxY, rangeX, rangeY, vbW, vbH }
  return { pts, bounds, trackAspect: rangeX / rangeY }
}

async function svgPathWithBounds(pathD, viewBoxStr, bounds, numPoints = 200) {
  const ns  = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', viewBoxStr)
  svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:1px;height:1px;overflow:hidden'
  document.body.appendChild(svg)

  const mainD  = longestSubpath(pathD, ns, svg)
  const pathEl = document.createElementNS(ns, 'path')
  pathEl.setAttribute('d', mainD)
  svg.appendChild(pathEl)

  const totalLen = pathEl.getTotalLength()
  const raw = []
  for (let i = 0; i < numPoints; i++) {
    const pt = pathEl.getPointAtLength((i / numPoints) * totalLen)
    raw.push([pt.x, pt.y])
  }
  document.body.removeChild(svg)

  return raw.map(([x, y]) => [
    (x - bounds.minX) / bounds.rangeX,
    1 - (y - bounds.minY) / bounds.rangeY,
  ])
}

async function findStartFinishOffset(sfSvgText, pts, bounds) {
  try {
    const ns  = 'http://www.w3.org/2000/svg'
    const tmp = document.createElementNS(ns, 'svg')
    tmp.setAttribute('viewBox', `0 0 ${bounds.vbW} ${bounds.vbH}`)
    tmp.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${bounds.vbW}px;height:${bounds.vbH}px;overflow:hidden`
    document.body.appendChild(tmp)

    const parser = new DOMParser()
    const doc    = parser.parseFromString(sfSvgText, 'image/svg+xml')
    if (!doc.querySelector('parseerror')) {
      const svgEl = doc.querySelector('svg')
      if (svgEl) {
        for (const child of [...svgEl.children]) {
          try { tmp.appendChild(document.importNode(child, true)) } catch (_) {}
        }
      }
    }

    let bbox = null
    try { bbox = tmp.getBBox() } catch (_) {}
    document.body.removeChild(tmp)

    if (!bbox || (bbox.width === 0 && bbox.height === 0)) return 0

    const sfNx = (bbox.x + bbox.width  / 2 - bounds.minX) / bounds.rangeX
    const sfNy = 1 - (bbox.y + bbox.height / 2 - bounds.minY) / bounds.rangeY

    let bestIdx = 0, bestDist = Infinity
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i][0] - sfNx, dy = pts[i][1] - sfNy
      const d2 = dx * dx + dy * dy
      if (d2 < bestDist) { bestDist = d2; bestIdx = i }
    }
    return bestIdx / pts.length
  } catch (_) { return 0 }
}

function parseTurnsSvg(svgText, bounds) {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(svgText, 'image/svg+xml')
    if (doc.querySelector('parsererror')) return []

    const raw = [...doc.querySelectorAll('text')]
      .map(el => {
        const tf = el.getAttribute('transform') || ''
        // Handle matrix(a b c d e f) — e,f are the translation
        let x = null, y = null
        const matM = tf.match(/matrix\([^)]*?\s+([-\d.]+)\s+([-\d.]+)\s*\)/)
        if (matM) { x = parseFloat(matM[1]); y = parseFloat(matM[2]) }
        else {
          const trM = tf.match(/translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/)
          if (trM) { x = parseFloat(trM[1]); y = parseFloat(trM[2]) }
        }
        if (x === null) return null
        const label = el.textContent?.trim() || ''
        if (!label) return null
        return { x, y, label }
      })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y || a.x - b.x)

    if (!raw.length) return []

    const used   = new Array(raw.length).fill(false)
    const groups = []
    for (let i = 0; i < raw.length; i++) {
      if (used[i]) continue
      const base = { ...raw[i] }
      used[i] = true
      for (let j = i + 1; j < raw.length; j++) {
        if (used[j]) continue
        const dx = Math.abs(raw[j].x - base.x)
        const dy = Math.abs(raw[j].y - base.y)
        if (dy < 3 && dx < 45) {
          base.label += raw[j].label
          base.x = (base.x + raw[j].x) / 2
          used[j] = true
        } else if (dy >= 30 && dy <= 55 && dx < 80) {
          base.label = (base.label + ' ' + raw[j].label).replace(/\s+/g, ' ').trim()
          base.x = (base.x + raw[j].x) / 2
          base.y = (base.y + raw[j].y) / 2
          used[j] = true
        }
      }
      groups.push(base)
    }

    return groups
      .filter(g => g.x >= bounds.minX - 150 && g.x <= bounds.maxX + 150 &&
                   g.y >= bounds.minY - 150 && g.y <= bounds.maxY + 150)
      .map(g => ({
        nx:    (g.x - bounds.minX) / bounds.rangeX,
        ny:    1 - (g.y - bounds.minY) / bounds.rangeY,
        label: g.label,
      }))
  } catch (_) { return [] }
}

// ── Legend components ─────────────────────────────────────────────────────────
function LegendLine({ color, dashed, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={22} height={8} style={{ flexShrink: 0 }}>
        <line x1={0} y1={4} x2={22} y2={4}
          stroke={color} strokeWidth={1.5}
          strokeDasharray={dashed ? '5,3' : undefined} />
      </svg>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}
function LegendArrow({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={22} height={8} style={{ flexShrink: 0 }}>
        <line x1={0} y1={4} x2={17} y2={4} stroke={color} strokeWidth={1.5} />
        <polygon points="17,1.5 22,4 17,6.5" fill={color} />
      </svg>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}
function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={22} height={8} style={{ flexShrink: 0 }}>
        <circle cx={11} cy={4} r={3.5} fill={color} />
      </svg>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

export default function TrackMapOverlay() {
  const { data }       = useTelemetry()
  const canvasRef      = useRef(null)
  const animRef        = useRef(null)
  const ptsRef         = useRef(null)
  const pitRoadRef     = useRef(null)
  const turnsRef       = useRef([])
  const sfOffsetRef    = useRef(0)
  const trackAspectRef = useRef(1)
  const trackKeyRef    = useRef(null)
  const driversRef     = useRef([])   // updated from telemetry without restarting RAF
  const debugRef       = useRef('')
  const [ready,  setReady]  = useState(false)
  const [status, setStatus] = useState('')
  const [, forceRepaint]    = useState(0)
  const setDebugInfo = msg => { debugRef.current = msg; forceRepaint(n => n + 1) }

  const hasElectron  = typeof window !== 'undefined' && window.ari
  const trackId      = data?.trackId           || null
  const internalName = data?.trackInternalName || null
  const configName   = data?.trackConfigName   || null
  const trackName    = data?.trackName         || 'Track Map'

  // Use ALL drivers from standings (not just the 5 in relative)
  driversRef.current = data?.standings || []

  // ─── Sync canvas buffer to display size ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      canvas.width  = Math.round(width  * dpr)
      canvas.height = Math.round(height * dpr)
    })
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [])

  // ─── Load track map when track changes ───────────────────────────────────────
  useEffect(() => {
    const key = `${trackId}:${internalName}:${configName}`
    if (!trackId || key === trackKeyRef.current) return
    trackKeyRef.current    = key
    ptsRef.current         = null
    pitRoadRef.current     = null
    turnsRef.current       = []
    sfOffsetRef.current    = 0
    trackAspectRef.current = 1
    setReady(false)
    setStatus('loading')

    const load = async () => {
      setDebugInfo(`id=${trackId} name=${internalName || '?'} cfg=${configName || 'none'}`)

      // 1. Cache hit — v:4 includes pit road
      if (hasElectron && window.ari.trackmapTurnsLoad) {
        try {
          const cached = await window.ari.trackmapTurnsLoad(String(trackId))
          if (cached !== null && !Array.isArray(cached) && cached.v === 4) {
            const cachedPts = await window.ari.trackmapLoad(String(trackId))
            if (cachedPts && cachedPts.length > 50) {
              ptsRef.current         = cachedPts
              turnsRef.current       = cached.turns      || []
              sfOffsetRef.current    = cached.sfOffset   || 0
              trackAspectRef.current = cached.trackAspect || 1
              pitRoadRef.current     = cached.pitRoad    || null
              setReady(true); setStatus(''); return
            }
          }
        } catch (_) {}
      }

      // 2. Fetch from iRacing CDN
      if (trackId && hasElectron && window.ari.fetchTrackSvg) {
        const candidates = []

        if (window.ari.lookupTrackmapCdnBase) {
          try {
            const base = await window.ari.lookupTrackmapCdnBase(String(trackId))
            if (base) candidates.push({
              active:  `${base}/active.svg`,
              turns:   `${base}/turns.svg`,
              sf:      `${base}/start-finish.svg`,
              pitroad: `${base}/pitroad.svg`,
            })
          } catch (_) {}
        }

        if (internalName) {
          if (configName) candidates.push({
            active:  buildSvgUrl(trackId, internalName, configName, 'active'),
            turns:   buildSvgUrl(trackId, internalName, configName, 'turns'),
            sf:      buildSvgUrl(trackId, internalName, configName, 'start-finish'),
            pitroad: buildSvgUrl(trackId, internalName, configName, 'pitroad'),
          })
          candidates.push({
            active:  buildSvgUrl(trackId, internalName, null, 'active'),
            turns:   buildSvgUrl(trackId, internalName, null, 'turns'),
            sf:      buildSvgUrl(trackId, internalName, null, 'start-finish'),
            pitroad: buildSvgUrl(trackId, internalName, null, 'pitroad'),
          })
        }

        let activeSvg = null, turnsSvg = null, sfSvg = null, pitroadSvg = null
        for (const c of candidates) {
          setDebugInfo(`fetching: ${c.active}`)
          try {
            const [a, t, s, p] = await Promise.all([
              window.ari.fetchTrackSvg(c.active),
              window.ari.fetchTrackSvg(c.turns),
              window.ari.fetchTrackSvg(c.sf),
              window.ari.fetchTrackSvg(c.pitroad),
            ])
            if (a) { activeSvg = a; turnsSvg = t; sfSvg = s; pitroadSvg = p; break }
          } catch (_) {}
        }

        try {
          if (activeSvg) {
            const parser  = new DOMParser()
            const doc     = parser.parseFromString(activeSvg, 'image/svg+xml')
            const svgEl   = doc.querySelector('svg')
            const viewBox = svgEl?.getAttribute('viewBox') || '0 0 1920 1080'

            const allPaths = [...doc.querySelectorAll('path')]
            if (!allPaths.length) { setDebugInfo('SVG has no paths'); setStatus('error'); return }

            const mainPath = allPaths.reduce(
              (best, p) => ((p.getAttribute('d') || '').length > (best.getAttribute('d') || '').length ? p : best),
              allPaths[0]
            )

            if (mainPath) {
              const { pts, bounds, trackAspect: ta } = await svgPathToPoints(mainPath.getAttribute('d'), viewBox)
              ptsRef.current         = pts
              trackAspectRef.current = ta

              const sfOffset = sfSvg ? await findStartFinishOffset(sfSvg, pts, bounds) : 0
              sfOffsetRef.current = sfOffset

              const turns = turnsSvg ? parseTurnsSvg(turnsSvg, bounds) : []
              turnsRef.current = turns

              let pitRoadPts = null
              if (pitroadSvg) {
                try {
                  const prDoc   = parser.parseFromString(pitroadSvg, 'image/svg+xml')
                  const prPaths = [...prDoc.querySelectorAll('path')]
                  if (prPaths.length > 0) {
                    const prMain = prPaths.reduce(
                      (b, p) => ((p.getAttribute('d') || '').length > (b.getAttribute('d') || '').length ? p : b),
                      prPaths[0]
                    )
                    pitRoadPts = await svgPathWithBounds(prMain.getAttribute('d'), viewBox, bounds)
                  }
                } catch (_) {}
              }
              pitRoadRef.current = pitRoadPts

              if (hasElectron && window.ari.trackmapSave)
                window.ari.trackmapSave(String(trackId), pts)
              if (hasElectron && window.ari.trackmapTurnsSave)
                window.ari.trackmapTurnsSave(String(trackId), { v: 4, turns, sfOffset, trackAspect: ta, pitRoad: pitRoadPts })

              setReady(true); setStatus(''); return
            }
          } else {
            setDebugInfo(`CDN 404 (tried ${candidates.length}): ${candidates.map(c => c.active).join(' | ')}`)
          }
        } catch (e) {
          console.warn('[ARI] TrackMap SVG fetch failed:', e.message)
          setDebugInfo(`fetch error: ${e.message}`)
        }
      } else if (!internalName) {
        setDebugInfo(`no CDN URLs — YAML parse failed (id=${trackId})`)
      }

      // 3. GPS fallback
      if (hasElectron && window.ari.trackmapLoad) {
        try {
          const cachedPts = await window.ari.trackmapLoad(String(trackId))
          if (cachedPts && cachedPts.length > 50) {
            ptsRef.current = cachedPts; trackAspectRef.current = 1
            setReady(true); setStatus(''); return
          }
        } catch (_) {}
      }

      setStatus('error')
    }

    load()
  }, [trackId, internalName, configName, hasElectron])

  // ─── Draw loop ────────────────────────────────────────────────────────────────
  // Intentionally omits driversRef from deps — it's a ref so the loop reads
  // the latest value each frame without needing to restart.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw() {
      const dpr = window.devicePixelRatio || 1
      const W   = canvas.width  / dpr
      const H   = canvas.height / dpr
      const PAD = 12
      const ctx = canvas.getContext('2d')

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      const pts         = ptsRef.current
      const pitRoad     = pitRoadRef.current
      const turns       = turnsRef.current
      const sfOffset    = sfOffsetRef.current
      const trackAspect = trackAspectRef.current || 1
      const drivers     = driversRef.current

      // Letterbox / pillarbox
      const canvasAspect = W / H
      let drawW, drawH, ox, oy
      if (canvasAspect > trackAspect) {
        drawH = H - PAD * 2; drawW = drawH * trackAspect
        ox = (W - drawW) / 2; oy = PAD
      } else {
        drawW = W - PAD * 2; drawH = drawW / trackAspect
        ox = PAD; oy = (H - drawH) / 2
      }

      if (pts && pts.length > 10) {
        // Pre-compute the S/F canvas position (reused for arrow later)
        const [fx, fy] = posOnTrack(0, pts, ox, oy, drawW, drawH, sfOffset)

        // Helper: stroke the full track loop
        const strokeTrack = (lineW, style) => {
          ctx.beginPath()
          for (let i = 0; i <= pts.length; i++) {
            const [x, y] = posOnTrack(i / pts.length, pts, ox, oy, drawW, drawH, sfOffset)
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = style
          ctx.lineWidth   = lineW
          ctx.lineJoin    = 'round'
          ctx.lineCap     = 'round'
          ctx.stroke()
        }

        // ── Track — three-pass render for depth ──────────────────────────────
        strokeTrack(20, 'rgba(255,255,255,0.05)')   // soft outer halo
        strokeTrack(10, 'rgba(255,255,255,0.13)')   // inner glow
        strokeTrack(3.5, 'rgba(255,255,255,0.90)')  // crisp centre line

        // ── Pit road ─────────────────────────────────────────────────────────
        if (pitRoad && pitRoad.length > 2) {
          ctx.beginPath()
          pitRoad.forEach((pt, i) => {
            const [x, y] = toCanvas(pt, ox, oy, drawW, drawH)
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          })
          ctx.setLineDash([6, 4])
          ctx.strokeStyle = '#E8001D'
          ctx.lineWidth   = 2
          ctx.lineJoin    = 'round'
          ctx.lineCap     = 'round'
          ctx.stroke()
          ctx.setLineDash([])
        }

        // ── S/F direction arrow ───────────────────────────────────────────────
        {
          const sfI    = Math.round(sfOffsetRef.current * pts.length) % pts.length
          const prevPt = pts[(sfI - 4 + pts.length) % pts.length]
          const nextPt = pts[(sfI + 4) % pts.length]
          const [pvx, pvy] = toCanvas(prevPt, ox, oy, drawW, drawH)
          const [nvx, nvy] = toCanvas(nextPt, ox, oy, drawW, drawH)
          const ddx = nvx - pvx, ddy = nvy - pvy
          const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1
          const dx = ddx / dlen, dy = ddy / dlen
          const aLen = 7, headLen = 6, ha = 0.42
          const cos = Math.cos(ha), sin = Math.sin(ha)
          const tipX = fx + dx * aLen, tipY = fy + dy * aLen
          const tailX = fx - dx * aLen, tailY = fy - dy * aLen
          const s1x = tipX + headLen * (-dx * cos + dy * sin)
          const s1y = tipY + headLen * (-dx * sin - dy * cos)
          const s2x = tipX + headLen * (-dx * cos - dy * sin)
          const s2y = tipY + headLen * ( dx * sin - dy * cos)

          ctx.beginPath()
          ctx.moveTo(tailX, tailY)
          ctx.lineTo(tipX, tipY)
          ctx.strokeStyle = '#E8001D'
          ctx.lineWidth   = 2.5
          ctx.lineCap     = 'round'
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(s1x, s1y)
          ctx.lineTo(s2x, s2y)
          ctx.closePath()
          ctx.fillStyle = '#E8001D'
          ctx.fill()
        }

        // ── Turn number labels ────────────────────────────────────────────────
        // Scale with the smaller canvas dimension for consistent size
        const minDim = Math.min(drawW, drawH)
        const r  = Math.max(9, Math.min(16, minDim * 0.055))
        const fs = Math.max(7, Math.round(r * 0.88))

        turns.forEach(({ nx, ny, label }) => {
          const [tx, ty] = toCanvas([nx, ny], ox, oy, drawW, drawH)

          // Dark filled circle
          ctx.beginPath()
          ctx.arc(tx, ty, r, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(10,10,20,0.85)'
          ctx.fill()

          // Bright white ring
          ctx.strokeStyle = 'rgba(255,255,255,0.82)'
          ctx.lineWidth   = 1.4
          ctx.stroke()

          // Number text
          const text = label.length > 3 ? label.slice(0, 3) : label
          ctx.font         = `700 ${fs}px sans-serif`
          ctx.fillStyle    = '#ffffff'
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, tx, ty)
        })

        // ── Other drivers ─────────────────────────────────────────────────────
        // Use standings = all cars on track, not just relative
        drivers.filter(d => !d.isPlayer).forEach(d => {
          const [x, y] = posOnTrack(d.lapDistPct, pts, ox, oy, drawW, drawH, sfOffset)
          const col = d.colour || CAR_COLOURS[d.carIdx % CAR_COLOURS.length]

          // Shadow ring
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0,0,0,0.75)'
          ctx.fill()
          // Colour dot
          ctx.beginPath()
          ctx.arc(x, y, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = col
          ctx.fill()

          // Pit-road highlight ring
          if (d.onPitRoad) {
            ctx.beginPath()
            ctx.arc(x, y, 6.5, 0, Math.PI * 2)
            ctx.strokeStyle = '#F59E0B'
            ctx.lineWidth   = 1.2
            ctx.stroke()
          }
        })

        // ── Player dot (always on top) ────────────────────────────────────────
        const player = drivers.find(d => d.isPlayer)
        if (player) {
          const [x, y] = posOnTrack(player.lapDistPct, pts, ox, oy, drawW, drawH, sfOffset)
          // Outer glow ring
          ctx.beginPath()
          ctx.arc(x, y, 10, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(232,0,29,0.28)'
          ctx.lineWidth   = 3
          ctx.stroke()
          // Filled dot
          ctx.beginPath()
          ctx.arc(x, y, 6, 0, Math.PI * 2)
          ctx.fillStyle = '#E8001D'
          ctx.fill()
          // White centre pip for sharpness
          ctx.beginPath()
          ctx.arc(x, y, 2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.fill()
        }

      } else {
        // No map yet — status text
        const msg = status === 'loading' ? 'Loading track map…'
                  : status === 'error'   ? 'Map unavailable'
                  : trackId              ? 'Fetching map…'
                  :                        'No active session'
        ctx.fillStyle    = 'rgba(255,255,255,0.18)'
        ctx.font         = '11px sans-serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(msg, W / 2, H / 2 - 8)
        if (debugRef.current) {
          ctx.font      = '8px sans-serif'
          ctx.fillStyle = 'rgba(255,200,0,0.45)'
          const words = debugRef.current.split(' ')
          let line = '', y = H / 2 + 8
          for (const w of words) {
            if ((line + w).length > 30) { ctx.fillText(line.trim(), W / 2, y); line = ''; y += 11 }
            line += w + ' '
          }
          if (line.trim()) ctx.fillText(line.trim(), W / 2, y)
        }
      }

      ctx.restore()
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [ready, status, trackId]) // drivers deliberately excluded — read via driversRef each frame

  return (
    <div className="overlay" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DragHandle overlayId="trackmap" label="Track Map">
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {trackName}
        </span>
      </DragHandle>

      <div style={{ flex: 1, minHeight: 0, padding: 4 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      <div style={{ padding: '3px 10px 7px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <LegendLine  color="rgba(255,255,255,0.75)" dashed={false} label="Track" />
        <LegendLine  color="#E8001D"                dashed={true}  label="Pit Road" />
        <LegendArrow color="#E8001D"                               label="S/F + direction" />
        <LegendDot   color="#E8001D"                               label="You" />
        <LegendDot   color="rgba(255,255,255,0.45)"               label="Others" />
      </div>
    </div>
  )
}
