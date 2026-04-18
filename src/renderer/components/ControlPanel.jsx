import React, { useState, useEffect } from 'react'
import { useTelemetry } from '../hooks/useTelemetry'
import ariLogo from '../../../assets/ari_logo.png'
import ColumnPicker from './ui/ColumnPicker'
import { COLUMN_PICKER_OVERLAYS } from '../lib/columnDefs'

const OVERLAY_GROUPS = [
  {
    label: 'Driving',
    overlays: [
      { id: 'relative',      label: 'Relative',        description: 'Cars ahead & behind with gap times' },
      { id: 'radar',         label: 'Radar',           description: 'Proximity radar — close cars around you' },
      { id: 'blindspot',     label: 'Blind Spot',      description: 'Left/right indicator when a car is alongside' },
      { id: 'flags',         label: 'Flags',           description: 'Current race flag status' },
      { id: 'delta',         label: 'Delta',           description: 'Lap time delta bar vs reference lap' },
      { id: 'inputs',        label: 'Inputs',          description: 'Throttle, brake, steering & delta' },
      { id: 'gforce',        label: 'G-Force',         description: 'Lateral & longitudinal G-force plot' },
      { id: 'sessiontimer',  label: 'Session Timer',   description: 'Time or laps remaining in session' },
    ]
  },
  {
    label: 'Standings',
    overlays: [
      { id: 'standings',     label: 'Standings',       description: 'Full race order with gaps to leader' },
      { id: 'hstandings',    label: 'H. Standings',    description: 'Horizontal standings strip' },
      { id: 'leaderboard',   label: 'Leaderboard',     description: 'Broadcast-style top N leaderboard' },
      { id: 'headtohead',    label: 'Head to Head',    description: 'Side-by-side comparison vs pinned driver' },
      { id: 'overtakealert', label: 'Overtake Alert',  description: 'Faster class car closing alert' },
    ]
  },
  {
    label: 'Timing',
    overlays: [
      { id: 'laplog',        label: 'Lap Log',         description: 'Table of every completed lap' },
      { id: 'lapgraph',      label: 'Lap Graph',       description: 'Rolling lap time chart' },
      { id: 'laptimespread', label: 'Lap Spread',      description: 'Pace distribution across field' },
    ]
  },
  {
    label: 'Car & Strategy',
    overlays: [
      { id: 'fuel',          label: 'Fuel Calc',       description: 'Fuel usage, laps remaining, pit strategy' },
      { id: 'tyres',         label: 'Tyres',           description: 'Tyre temps, wear & pressure' },
      { id: 'boostbox',      label: 'Boost / ERS',     description: 'Boost/ERS remaining and deploy' },
      { id: 'raceschedule',  label: 'Pit Window',      description: 'Optimal pit lap range calculator' },
      { id: 'pitboxhelper',  label: 'Pitbox Helper',   description: 'Pit lane delta and speed limiter' },
    ]
  },
  {
    label: 'Track & Map',
    overlays: [
      { id: 'trackmap',      label: 'Track Map',       description: 'Live car positions on track' },
      { id: 'minimap',       label: 'Minimap',         description: 'Compact corner map' },
      { id: 'flatmap',       label: 'Flat Map',        description: 'Schematic track — no GPS needed' },
    ]
  },
  {
    label: 'Environment',
    overlays: [
      { id: 'weather',       label: 'Weather',         description: 'Track/air temp, wind, track state' },
    ]
  },
  {
    label: 'Data',
    overlays: [
      { id: 'advancedpanel', label: 'Advanced Panel',  description: 'Configurable multi-stat data panel' },
      { id: 'datablocks',    label: 'Data Blocks',     description: 'Individual freeform stat widgets' },
      { id: 'incident',      label: 'Incidents',       description: 'Driver incident counts sorted by severity' },
    ]
  },
  {
    label: 'Streaming',
    overlays: [
      { id: 'digiflag',      label: 'Digiflag',        description: 'Large broadcast-style flag display' },
      { id: 'heartrate',     label: 'Heart Rate',      description: 'Driver BPM with rolling chart' },
    ]
  },
]

// Flat list for internal use
const OVERLAYS = OVERLAY_GROUPS.flatMap(g => g.overlays)

function TitleBarBtn({ children, onClick, label, isClose }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hover ? (isClose ? '#E8001D' : 'rgba(255,255,255,0.1)') : 'transparent',
        border: 'none',
        color: hover && isClose ? '#fff' : 'rgba(255,255,255,0.6)',
        cursor: 'default',
        transition: 'background 0.1s, color 0.1s',
        padding: 0,
        outline: 'none',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

const PRESET_KEYS = ['practice', 'qualify', 'race']
const PRESET_LABELS = { practice: 'Practice', qualify: 'Qualify', race: 'Race' }

export default function ControlPanel() {
  const { data, connected } = useTelemetry()
  const [activeOverlays,   setActiveOverlays]  = useState({})
  const [settingsOverlay,  setSettingsOverlay] = useState(null)
  const [presets,          setPresets]         = useState({})
  const [autoPreset,       setAutoPresetState] = useState(false)
  const [currentPresetKey, setCurrentPresetKey] = useState(null)
  const [networkStatus,    setNetworkStatus]   = useState({ active: false, available: true, urls: [], clients: 0 })
  const [vrMode,           setVrModeState]     = useState(false)
  const hasElectron = typeof window !== 'undefined' && window.ari

  // Restore persisted active-overlay state on mount
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getActiveOverlays().then(ids => {
      const state = {}
      ids.forEach(id => { state[id] = true })
      setActiveOverlays(state)
    })
  }, [hasElectron])

  // Load presets and auto-preset setting on mount
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getPresets().then(p => setPresets(p || {}))
    window.ari.getAutoPreset().then(v => setAutoPresetState(v || false))
  }, [hasElectron])

  // Listen for overlay settings requests (gear icon in overlay DragHandle)
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onOpenSettings(id => setSettingsOverlay(id))
    return () => window.ari.removeOpenSettingsListener()
  }, [hasElectron])

  // Track current session type for preset highlighting
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onSessionTypeChange(({ presetKey }) => setCurrentPresetKey(presetKey))
    return () => window.ari.removeSessionTypeListener()
  }, [hasElectron])

  // Sync UI when a preset is auto-applied from main process
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onPresetApplied((key, preset) => {
      const state = {}
      ;(preset.activeOverlays || []).forEach(id => { state[id] = true })
      setActiveOverlays(state)
    })
    return () => window.ari.removePresetAppliedListener()
  }, [hasElectron])

  const saveCurrentAsPreset = async (key) => {
    const activeIds = Object.keys(activeOverlays).filter(id => activeOverlays[id])
    const overlaySettings = {}
    if (hasElectron) {
      for (const id of Array.from(COLUMN_PICKER_OVERLAYS)) {
        const s = await window.ari.getOverlaySettings(id)
        if (s) overlaySettings[id] = s
      }
    }
    const preset = { activeOverlays: activeIds, overlaySettings }
    if (hasElectron) await window.ari.savePreset(key, preset)
    setPresets(prev => ({ ...prev, [key]: { ...preset, saved: true } }))
  }

  const applyPreset = async (key) => {
    if (!hasElectron) return
    await window.ari.applyPreset(key)
    const ids = await window.ari.getActiveOverlays()
    const state = {}
    ids.forEach(id => { state[id] = true })
    setActiveOverlays(state)
  }

  const toggleAutoPreset = async () => {
    const next = !autoPreset
    setAutoPresetState(next)
    if (hasElectron) await window.ari.setAutoPreset(next)
  }

  // Load network status and VR mode on mount; listen for live updates
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getNetworkStatus().then(s => setNetworkStatus(s))
    window.ari.getVrMode().then(v => setVrModeState(v || false))
    window.ari.onNetworkStatus(s => setNetworkStatus(s))
    return () => window.ari.removeNetworkStatusListener()
  }, [hasElectron])

  const toggleNetwork = async () => {
    if (networkStatus.active) {
      await window.ari.stopHttpServer()
    } else {
      const result = await window.ari.startHttpServer(7001)
      if (result?.error) console.error('[ARI] HTTP server error:', result.error)
      const s = await window.ari.getNetworkStatus()
      setNetworkStatus(s)
    }
  }

  const toggleVrMode = async () => {
    const next = !vrMode
    setVrModeState(next)
    if (hasElectron) await window.ari.setVrMode(next)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  const toggleOverlay = async (id) => {
    const isActive = activeOverlays[id]
    console.log('[ARI UI] toggle', id, 'hasElectron=', !!hasElectron, 'isActive=', isActive)
    if (hasElectron) {
      if (isActive) {
        await window.ari.hideOverlay(id)
      } else {
        await window.ari.showOverlay(id)
      }
    }
    setActiveOverlays(prev => ({ ...prev, [id]: !isActive }))
  }

  return (
    <div style={{
      height: '100vh',
      background: '#0e0e10',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden'
    }}>
      {/* Title bar — Windows-style with drag region and window controls */}
      <div style={{
        height: 32,
        background: '#111113',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        WebkitAppRegion: 'drag',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10, flex: 1, minWidth: 0 }}>
          <img
            src={ariLogo}
            alt="ARI"
            style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Aventa Race Intelligence
          </span>
        </div>

        {/* Window controls — must not be draggable */}
        <div style={{ display: 'flex', WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
          <TitleBarBtn
            onClick={() => window.ari?.windowMinimize()}
            label="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </TitleBarBtn>
          <TitleBarBtn
            onClick={() => window.ari?.windowMaximize()}
            label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
            </svg>
          </TitleBarBtn>
          <TitleBarBtn
            onClick={() => window.ari?.windowClose()}
            label="Close"
            isClose
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </TitleBarBtn>
        </div>
      </div>

      {/* Connection status */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0
      }}>
        <div style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: connected ? '#22C55E' : '#E8001D',
          boxShadow: connected ? '0 0 6px #22C55E' : '0 0 6px #E8001D'
        }} />
        <span style={{ fontSize: 11, color: connected ? '#22C55E' : 'rgba(255,255,255,0.4)' }}>
          {connected
            ? data?.demo
              ? 'Demo mode — connect iRacing for live data'
              : 'Connected to iRacing'
            : 'Waiting for iRacing...'}
        </span>
      </div>

      {/* Session info */}
      {data && (
        <div style={{
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          flexShrink: 0
        }}>
          {[
            { label: 'Session', value: data.sessionType || '—' },
            { label: 'Lap', value: data.currentLap ? `${data.currentLap} / ${data.totalLaps || '?'}` : '—' },
            { label: 'Fuel', value: data.fuel ? `${data.fuel.level.toFixed(1)}L` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 5, padding: '7px 10px' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Presets */}
      <div style={{ padding: '10px 18px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Presets
          </span>
          <button
            onClick={toggleAutoPreset}
            title={autoPreset ? 'Auto-apply on: click to disable' : 'Auto-apply off: click to enable'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 24, height: 13, borderRadius: 7, position: 'relative',
              background: autoPreset ? '#22C55E' : 'rgba(255,255,255,0.12)',
              transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: autoPreset ? 13 : 2,
                width: 9, height: 9, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }} />
            </div>
            <span style={{ fontSize: 9, color: autoPreset ? '#22C55E' : 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-data)', letterSpacing: '0.08em' }}>
              AUTO
            </span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {PRESET_KEYS.map(key => {
            const preset   = presets[key] || {}
            const isCurrent = key === currentPresetKey
            const isSaved   = !!preset.saved
            return (
              <div
                key={key}
                style={{
                  background: isCurrent ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCurrent ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 5, padding: '6px 6px 5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{
                    fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: isCurrent ? '#22C55E' : 'rgba(255,255,255,0.5)',
                  }}>
                    {PRESET_LABELS[key]}
                  </span>
                  {isSaved && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => saveCurrentAsPreset(key)}
                    title="Save current state to this preset"
                    style={{
                      flex: 1, fontSize: 8, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3, padding: '2px 0', color: 'rgba(255,255,255,0.45)',
                      fontFamily: 'var(--font-data)', letterSpacing: '0.05em',
                    }}
                  >
                    SAVE
                  </button>
                  <button
                    onClick={() => isSaved && applyPreset(key)}
                    title={isSaved ? 'Apply this preset' : 'No preset saved yet'}
                    style={{
                      flex: 1, fontSize: 8, cursor: isSaved ? 'pointer' : 'default',
                      background: isSaved ? 'rgba(232,0,29,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSaved ? 'rgba(232,0,29,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 3, padding: '2px 0',
                      color: isSaved ? '#E8001D' : 'rgba(255,255,255,0.2)',
                      fontFamily: 'var(--font-data)', letterSpacing: '0.05em',
                    }}
                  >
                    LOAD
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Network + VR */}
      <div style={{ padding: '8px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>

          {/* Network Stream toggle */}
          <div style={{
            flex: 1, padding: '6px 8px', borderRadius: 5,
            background: networkStatus.active ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${networkStatus.active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: networkStatus.active ? 5 : 0 }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: networkStatus.active ? '#22C55E' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                Network
              </span>
              <button
                onClick={toggleNetwork}
                style={{
                  width: 24, height: 13, borderRadius: 7, position: 'relative',
                  background: networkStatus.active ? '#22C55E' : 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: networkStatus.active ? 13 : 2,
                  width: 9, height: 9, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {networkStatus.active && networkStatus.urls.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {networkStatus.urls[0].http}
                  </span>
                  <button
                    onClick={() => copyToClipboard(networkStatus.urls[0].http)}
                    style={{ fontSize: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, padding: '1px 4px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', flexShrink: 0, fontFamily: 'var(--font-data)', letterSpacing: '0.04em' }}
                  >
                    COPY
                  </button>
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                  {networkStatus.clients} client{networkStatus.clients !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {networkStatus.active && networkStatus.urls.length === 0 && (
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Starting...</span>
            )}
          </div>

          {/* VR Mode toggle */}
          <div style={{
            flex: 1, padding: '6px 8px', borderRadius: 5,
            background: vrMode ? 'rgba(192,132,252,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${vrMode ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.07)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: vrMode ? '#C084FC' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                VR Mode
              </span>
              <button
                onClick={toggleVrMode}
                style={{
                  width: 24, height: 13, borderRadius: 7, position: 'relative',
                  background: vrMode ? '#C084FC' : 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: vrMode ? 13 : 2,
                  width: 9, height: 9, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>
              {vrMode ? 'OVR capture' : 'Screen overlay'}
            </span>
          </div>

        </div>
      </div>

      {/* Column picker -- shown when a settings gear icon is clicked in an overlay */}
      {settingsOverlay && COLUMN_PICKER_OVERLAYS.has(settingsOverlay) ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ColumnPicker
            overlayId={settingsOverlay}
            overlayLabel={OVERLAYS.find(o => o.id === settingsOverlay)?.label ?? settingsOverlay}
            onBack={() => setSettingsOverlay(null)}
          />
        </div>
      ) : (
        <>
          {/* Overlay toggles */}
          <div style={{ padding: '14px 18px 8px', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
              Overlays
            </div>
          </div>

          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
            {OVERLAY_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 0 4px' }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {group.overlays.map(({ id, label, description }) => {
                    const active = activeOverlays[id]
                    return (
                      <div
                        key={id}
                        onClick={() => toggleOverlay(id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px',
                          background: active ? 'rgba(232,0,29,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${active ? 'rgba(232,0,29,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 28, height: 16,
                          background: active ? '#E8001D' : 'rgba(255,255,255,0.1)',
                          borderRadius: 8, position: 'relative', flexShrink: 0, transition: 'background 0.2s'
                        }}>
                          <div style={{
                            position: 'absolute', top: 2, left: active ? 14 : 2,
                            width: 12, height: 12, background: '#fff', borderRadius: '50%',
                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                          }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: active ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: 1 }}>{label}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{description}</div>
                        </div>
                        {active && (
                          <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, color: '#E8001D', background: 'rgba(232,0,29,0.12)', padding: '2px 5px', borderRadius: 3, letterSpacing: '0.08em' }}>ON</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Fullscreen mode hint */}
      <div style={{
        padding: '5px 18px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="5" cy="5" r="4.5" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <rect x="4.5" y="3" width="1" height="1" rx="0.3" fill="rgba(255,255,255,0.18)" />
          <rect x="4.5" y="5" width="1" height="2.5" rx="0.3" fill="rgba(255,255,255,0.18)" />
        </svg>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>
          Overlays require iRacing borderless windowed mode
        </span>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          Aventa Race Intelligence
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { if (hasElectron) window.ari.openLayoutEditor() }}
            style={{
              fontSize: 9,
              color: '#fff',
              background: '#E8001D',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--font-data)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Edit Layout
          </button>
          <button
            onClick={async () => { if (hasElectron) await window.ari.resetPositions() }}
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.25)',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              padding: '3px 8px',
              cursor: 'pointer',
              fontFamily: 'var(--font-data)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Reset
          </button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            {data?.demo ? 'DEMO' : 'LIVE'}
          </span>
        </div>
      </div>
    </div>
  )
}
