import React, { useState, useEffect, useRef, useCallback } from 'react'
import ariLogo from '../../../assets/ari_logo.png'
import { OverlayPreviewContext, PreviewTelemetryContext } from './OverlayPreviewContext'
import { buildDemoData } from '../hooks/useTelemetry'

// ─── Overlay components ──────────────────────────────────────────────────────
import RelativeOverlay        from './overlays/RelativeOverlay'
import StandingsOverlay       from './overlays/StandingsOverlay'
import FuelOverlay            from './overlays/FuelOverlay'
import TyreOverlay            from './overlays/TyreOverlay'
import TrackMapOverlay        from './overlays/TrackMapOverlay'
import InputsOverlay          from './overlays/InputsOverlay'
import RadarOverlay           from './overlays/RadarOverlay'
import HeadToHeadOverlay      from './overlays/HeadToHeadOverlay'
import FlagsOverlay           from './overlays/FlagsOverlay'
import DeltaOverlay           from './overlays/DeltaOverlay'
import LapTimeGraphOverlay    from './overlays/LapTimeGraphOverlay'
import LapTimeLogOverlay      from './overlays/LapTimeLogOverlay'
import SessionTimerOverlay    from './overlays/SessionTimerOverlay'
import OvertakeAlertOverlay   from './overlays/OvertakeAlertOverlay'
import BlindSpotOverlay       from './overlays/BlindSpotOverlay'
import BoostBoxOverlay        from './overlays/BoostBoxOverlay'
import WeatherOverlay         from './overlays/WeatherOverlay'
import RaceScheduleOverlay    from './overlays/RaceScheduleOverlay'
import HorizontalStandingsOverlay from './overlays/HorizontalStandingsOverlay'
import LeaderboardOverlay     from './overlays/LeaderboardOverlay'
import FlatMapOverlay         from './overlays/FlatMapOverlay'
import MinimapOverlay         from './overlays/MinimapOverlay'
import LaptimeSpreadOverlay   from './overlays/LaptimeSpreadOverlay'
import AdvancedPanelOverlay   from './overlays/AdvancedPanelOverlay'
import DataBlocksOverlay      from './overlays/DataBlocksOverlay'
import HeartRateOverlay       from './overlays/HeartRateOverlay'
import GForceOverlay          from './overlays/GForceOverlay'
import DigiflagOverlay        from './overlays/DigiflagOverlay'
import PitboxHelperOverlay    from './overlays/PitboxHelperOverlay'

const OVERLAY_COMPONENTS = {
  relative: RelativeOverlay, standings: StandingsOverlay, fuel: FuelOverlay,
  tyres: TyreOverlay, trackmap: TrackMapOverlay, inputs: InputsOverlay,
  radar: RadarOverlay, headtohead: HeadToHeadOverlay, flags: FlagsOverlay,
  delta: DeltaOverlay, lapgraph: LapTimeGraphOverlay, laplog: LapTimeLogOverlay,
  sessiontimer: SessionTimerOverlay, overtakealert: OvertakeAlertOverlay,
  blindspot: BlindSpotOverlay, boostbox: BoostBoxOverlay, weather: WeatherOverlay,
  raceschedule: RaceScheduleOverlay, hstandings: HorizontalStandingsOverlay,
  leaderboard: LeaderboardOverlay, flatmap: FlatMapOverlay, minimap: MinimapOverlay,
  laptimespread: LaptimeSpreadOverlay, advancedpanel: AdvancedPanelOverlay,
  datablocks: DataBlocksOverlay, heartrate: HeartRateOverlay, gforce: GForceOverlay,
  digiflag: DigiflagOverlay, pitboxhelper: PitboxHelperOverlay,
}

// ─── Metadata ────────────────────────────────────────────────────────────────
const OVERLAY_INFO = {
  relative:      { label: 'Relative',       group: 'driving'   },
  radar:         { label: 'Radar',          group: 'driving'   },
  blindspot:     { label: 'Blind Spot',     group: 'driving'   },
  flags:         { label: 'Flags',          group: 'driving'   },
  delta:         { label: 'Delta',          group: 'driving'   },
  inputs:        { label: 'Inputs',         group: 'driving'   },
  gforce:        { label: 'G-Force',        group: 'driving'   },
  sessiontimer:  { label: 'Session Timer',  group: 'driving'   },
  standings:     { label: 'Standings',      group: 'standings' },
  hstandings:    { label: 'H. Standings',   group: 'standings' },
  leaderboard:   { label: 'Leaderboard',    group: 'standings' },
  headtohead:    { label: 'Head to Head',   group: 'standings' },
  overtakealert: { label: 'Overtake Alert', group: 'standings' },
  laplog:        { label: 'Lap Log',        group: 'timing'    },
  lapgraph:      { label: 'Lap Graph',      group: 'timing'    },
  laptimespread: { label: 'Lap Spread',     group: 'timing'    },
  fuel:          { label: 'Fuel Calc',      group: 'strategy'  },
  tyres:         { label: 'Tyres',          group: 'strategy'  },
  boostbox:      { label: 'Boost / ERS',    group: 'strategy'  },
  raceschedule:  { label: 'Pit Window',     group: 'strategy'  },
  pitboxhelper:  { label: 'Pitbox Helper',  group: 'strategy'  },
  trackmap:      { label: 'Track Map',      group: 'map'       },
  minimap:       { label: 'Minimap',        group: 'map'       },
  flatmap:       { label: 'Flat Map',       group: 'map'       },
  weather:       { label: 'Weather',        group: 'env'       },
  advancedpanel: { label: 'Advanced Panel', group: 'data'      },
  datablocks:    { label: 'Data Blocks',    group: 'data'      },
  digiflag:      { label: 'Digiflag',       group: 'streaming' },
  heartrate:     { label: 'Heart Rate',     group: 'streaming' },
}

const GROUP_COLORS = {
  driving:   '#3B82F6',
  standings: '#8B5CF6',
  timing:    '#22C55E',
  strategy:  '#F59E0B',
  map:       '#14B8A6',
  env:       '#06B6D4',
  data:      '#F97316',
  streaming: '#EC4899',
}

const EDITOR_GROUPS = [
  { label: 'Driving',        ids: ['relative','radar','blindspot','flags','delta','inputs','gforce','sessiontimer'] },
  { label: 'Standings',      ids: ['standings','hstandings','leaderboard','headtohead','overtakealert'] },
  { label: 'Timing',         ids: ['laplog','lapgraph','laptimespread'] },
  { label: 'Car & Strategy', ids: ['fuel','tyres','boostbox','raceschedule','pitboxhelper'] },
  { label: 'Track & Map',    ids: ['trackmap','minimap','flatmap'] },
  { label: 'Environment',    ids: ['weather'] },
  { label: 'Data',           ids: ['advancedpanel','datablocks'] },
  { label: 'Streaming',      ids: ['digiflag','heartrate'] },
]

const SCALE_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

// ─── LayoutEditor ─────────────────────────────────────────────────────────────
export default function LayoutEditor() {
  const [layoutState, setLayoutState] = useState({
    screen: { width: 1920, height: 1080 },
    overlays: {},
  })
  const [selected,      setSelected]      = useState(null)
  const [previewData,   setPreviewData]   = useState(() => buildDemoData(0).telemetry)
  const canvasRef  = useRef(null)
  const tickRef    = useRef(0)
  const hasElectron = typeof window !== 'undefined' && window.ari

  // Single shared demo data tick for all overlay previews (10 fps is plenty)
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 6
      setPreviewData(buildDemoData(tickRef.current).telemetry)
    }, 100)
    return () => clearInterval(id)
  }, [])

  // Load layout state from main process
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getLayoutState().then(state => {
      if (state) setLayoutState(state)
    })
  }, [hasElectron])

  const { screen: screenBounds, overlays } = layoutState

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  const SIDEBAR_W = 264
  const TITLE_H   = 40
  const HINT_H    = 32
  const PAD       = 24

  const winW = typeof window !== 'undefined' ? window.innerWidth  : 1400
  const winH = typeof window !== 'undefined' ? window.innerHeight : 860

  const availW = winW - SIDEBAR_W - PAD * 2
  const availH = winH - TITLE_H - HINT_H - PAD * 2

  const editorScale = Math.min(availW / screenBounds.width, availH / screenBounds.height)
  const canvasW = Math.round(screenBounds.width  * editorScale)
  const canvasH = Math.round(screenBounds.height * editorScale)

  const getCanvasRect = useCallback(() => canvasRef.current?.getBoundingClientRect(), [])

  // ── State helpers ──────────────────────────────────────────────────────────
  const updateOverlay = useCallback((id, changes) => {
    setLayoutState(prev => ({
      ...prev,
      overlays: { ...prev.overlays, [id]: { ...prev.overlays[id], ...changes } },
    }))
  }, [])

  // ── Drag to reposition ─────────────────────────────────────────────────────
  const onBoxMouseDown = useCallback((id, e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setSelected(id)

    const canvasRect = getCanvasRect()
    if (!canvasRect) return

    // Capture values at mousedown — avoids stale closure during drag
    const ov    = layoutState.overlays[id]
    const scale = editorScale
    const bw    = ov.naturalWidth  * ov.scale * scale
    const bh    = ov.naturalHeight * ov.scale * scale
    const offX  = e.clientX - (canvasRect.left + ov.x * scale)
    const offY  = e.clientY - (canvasRect.top  + ov.y * scale)

    const onMove = (me) => {
      const rawX = me.clientX - canvasRect.left - offX
      const rawY = me.clientY - canvasRect.top  - offY
      updateOverlay(id, {
        x: Math.max(0, Math.min(screenBounds.width  - ov.naturalWidth  * ov.scale, rawX / scale)),
        y: Math.max(0, Math.min(screenBounds.height - ov.naturalHeight * ov.scale, rawY / scale)),
      })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [layoutState.overlays, editorScale, screenBounds, getCanvasRect, updateOverlay])

  // ── Corner drag to rescale ─────────────────────────────────────────────────
  const onCornerMouseDown = useCallback((id, e) => {
    e.preventDefault()
    e.stopPropagation()

    const ov       = layoutState.overlays[id]
    const startX   = e.clientX
    const startW   = ov.naturalWidth * ov.scale * editorScale  // canvas px

    const onMove = (me) => {
      const newCanvasW = Math.max(ov.naturalWidth * 0.4 * editorScale, startW + (me.clientX - startX))
      const newScale   = newCanvasW / (ov.naturalWidth * editorScale)
      updateOverlay(id, { scale: Math.max(0.4, Math.min(3, newScale)) })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [layoutState.overlays, editorScale, updateOverlay])

  // ── Save / Cancel ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    const updates = {}
    Object.entries(overlays).forEach(([id, ov]) => {
      updates[id] = {
        x:        Math.round(ov.x),
        y:        Math.round(ov.y),
        scale:    +ov.scale.toFixed(3),
        inLayout: ov.inLayout,
      }
    })
    if (hasElectron) {
      await window.ari.saveLayoutState(updates)
      window.ari.closeLayoutEditor()
    }
  }

  const handleCancel = () => {
    if (hasElectron) window.ari.closeLayoutEditor()
  }

  // ── Selected overlay info ─────────────────────────────────────────────────
  const selOv   = selected && overlays[selected] ? overlays[selected] : null
  const selInfo = selected ? OVERLAY_INFO[selected] : null
  const selColor = selInfo ? (GROUP_COLORS[selInfo.group] || '#fff') : '#fff'

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PreviewTelemetryContext.Provider value={previewData}>
      <OverlayPreviewContext.Provider value={true}>
        <div style={{
          height: '100vh', background: '#0a0a0c',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--font-ui)', color: '#fff',
          userSelect: 'none', overflow: 'hidden',
        }}>

          {/* ── Title bar ──────────────────────────────────────────────────── */}
          <div style={{
            height: TITLE_H, background: '#111113',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center',
            paddingLeft: 14, flexShrink: 0,
            WebkitAppRegion: 'drag',
          }}>
            <img src={ariLogo} alt="ARI" style={{ width: 18, height: 18, objectFit: 'contain', marginRight: 9, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginRight: 10 }}>
              Layout Editor
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-data)', letterSpacing: '0.08em' }}>
              {screenBounds.width}×{screenBounds.height} · {Math.round(editorScale * 100)}% scale
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', WebkitAppRegion: 'no-drag' }}>
              <button onClick={handleCancel} style={{ height: TITLE_H, padding: '0 20px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{ height: TITLE_H, padding: '0 22px', background: '#E8001D', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                Save Layout
              </button>
            </div>
          </div>

          {/* ── Main area ──────────────────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ── Canvas ───────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: PAD, overflow: 'hidden' }}>
              <div
                ref={canvasRef}
                onClick={(e) => { if (e.target === canvasRef.current) setSelected(null) }}
                style={{
                  position: 'relative', width: canvasW, height: canvasH,
                  background: '#080809',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4, flexShrink: 0, overflow: 'hidden',
                }}
              >
                {/* Dot grid */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                  backgroundSize: `${Math.max(12, Math.round(40 * editorScale))}px ${Math.max(12, Math.round(40 * editorScale))}px`,
                }} />

                {/* Overlay preview boxes */}
                {Object.entries(overlays).map(([id, ov]) => {
                  if (!ov.inLayout) return null
                  const OverlayComp = OVERLAY_COMPONENTS[id]
                  const info  = OVERLAY_INFO[id]
                  if (!OverlayComp || !info) return null

                  const color = GROUP_COLORS[info.group] || '#64748B'
                  const bx = ov.x * editorScale
                  const by = ov.y * editorScale
                  const bw = Math.max(20, ov.naturalWidth  * ov.scale * editorScale)
                  const bh = Math.max(10, ov.naturalHeight * ov.scale * editorScale)
                  const isSel = selected === id

                  return (
                    <div
                      key={id}
                      onMouseDown={(e) => onBoxMouseDown(id, e)}
                      style={{
                        position: 'absolute', left: bx, top: by,
                        width: bw, height: bh,
                        cursor: 'move',
                        overflow: 'hidden',
                        borderRadius: 3,
                        // Selection ring rendered via boxShadow (doesn't affect layout)
                        boxShadow: isSel ? `0 0 0 2px ${color}, 0 4px 20px rgba(0,0,0,0.6)` : '0 2px 8px rgba(0,0,0,0.4)',
                        zIndex: isSel ? 100 : 1,
                      }}
                    >
                      {/* Actual overlay component — no pointer events so drag hits outer div */}
                      <div style={{
                        transform: `scale(${ov.scale * editorScale})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        // Force natural size so the scale transform clips correctly
                        width: ov.naturalWidth,
                        height: ov.naturalHeight,
                      }}>
                        <OverlayComp />
                      </div>

                      {/* Resize handle — above the overlay content */}
                      <div
                        onMouseDown={(e) => onCornerMouseDown(id, e)}
                        title="Drag to resize"
                        style={{
                          position: 'absolute', right: 0, bottom: 0,
                          width: 14, height: 14,
                          cursor: 'se-resize',
                          background: isSel ? color : 'rgba(255,255,255,0.25)',
                          borderRadius: '2px 0 3px 0',
                          zIndex: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 7, color: 'rgba(0,0,0,0.6)', fontWeight: 700,
                        }}
                      >
                        ◢
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <div style={{
              width: SIDEBAR_W, background: '#111113',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
              flexShrink: 0, overflow: 'hidden',
            }}>

              {/* Selected overlay properties */}
              <div style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, minHeight: 130 }}>
                {selOv && selInfo ? (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: selColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-data)', marginBottom: 10 }}>
                      {selInfo.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                      {[
                        { l: 'X',     v: Math.round(selOv.x) },
                        { l: 'Y',     v: Math.round(selOv.y) },
                        { l: 'WIDTH', v: Math.round(selOv.naturalWidth  * selOv.scale) + 'px' },
                        { l: 'HEIGHT',v: Math.round(selOv.naturalHeight * selOv.scale) + 'px' },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '5px 8px' }}>
                          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-data)', letterSpacing: '0.1em' }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-data)', letterSpacing: '0.1em', marginBottom: 5 }}>
                      SCALE — {selOv.scale.toFixed(2)}×
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {SCALE_PRESETS.map(s => {
                        const active = Math.abs(selOv.scale - s) < 0.01
                        return (
                          <button key={s} onClick={() => updateOverlay(selected, { scale: s })} style={{
                            padding: '4px 8px', fontSize: 11, fontFamily: 'var(--font-mono)',
                            background: active ? selColor : 'rgba(255,255,255,0.07)',
                            color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                            border: 'none', borderRadius: 4, cursor: 'pointer',
                          }}>
                            {s}×
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-data)', letterSpacing: '0.07em', paddingTop: 4 }}>
                    CLICK AN OVERLAY TO SELECT IT
                  </div>
                )}
              </div>

              {/* Overlay list with inLayout toggles */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {EDITOR_GROUPS.map(group => (
                  <div key={group.label}>
                    <div style={{ padding: '8px 14px 3px', fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-data)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {group.label}
                    </div>
                    {group.ids.map(id => {
                      const ov   = overlays[id]
                      const info = OVERLAY_INFO[id]
                      if (!ov || !info) return null
                      const color = GROUP_COLORS[info.group]
                      const isSel = selected === id
                      const inLayout = ov.inLayout

                      return (
                        <div key={id} style={{
                          display: 'flex', alignItems: 'center',
                          padding: '4px 14px',
                          background: isSel ? 'rgba(255,255,255,0.05)' : 'transparent',
                          borderLeft: isSel ? `2px solid ${color}` : '2px solid transparent',
                          gap: 8,
                        }}>
                          {/* Toggle pill */}
                          <div
                            onClick={() => updateOverlay(id, { inLayout: !inLayout })}
                            title={inLayout ? 'Hide from layout' : 'Add to layout'}
                            style={{
                              width: 28, height: 15, borderRadius: 8, flexShrink: 0,
                              background: inLayout ? color : 'rgba(255,255,255,0.12)',
                              position: 'relative', cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: 2,
                              left: inLayout ? 15 : 2,
                              width: 11, height: 11, borderRadius: '50%',
                              background: '#fff',
                              transition: 'left 0.15s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                            }} />
                          </div>

                          {/* Label */}
                          <span
                            onClick={() => inLayout && setSelected(isSel ? null : id)}
                            style={{
                              flex: 1, fontSize: 12,
                              color: inLayout
                                ? (isSel ? '#fff' : 'rgba(255,255,255,0.65)')
                                : 'rgba(255,255,255,0.25)',
                              cursor: inLayout ? 'pointer' : 'default',
                            }}
                          >
                            {info.label}
                          </span>

                          {/* Scale display */}
                          {inLayout && (
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.2)' }}>
                              {ov.scale.toFixed(2)}×
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Hint bar ─────────────────────────────────────────────────────── */}
          <div style={{ height: HINT_H, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 18px', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-data)', letterSpacing: '0.06em' }}>
              DRAG to reposition · DRAG ◢ to resize · CLICK to select · Toggle overlays on/off in the sidebar list
            </span>
          </div>
        </div>
      </OverlayPreviewContext.Provider>
    </PreviewTelemetryContext.Provider>
  )
}
