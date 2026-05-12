import React, { useState, useEffect } from 'react'
import { useTelemetry } from '../hooks/useTelemetry'
import ariLogo from '../../../assets/ari_logo.png'
import HomePage from './pages/HomePage'
import OverlaysPage from './pages/OverlaysPage'
import SettingsPage from './pages/SettingsPage'

// ── Window chrome buttons ────────────────────────────────────────────────────
function WinBtn({ children, onClick, label, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? (danger ? '#E8001D' : 'rgba(255,255,255,0.08)') : 'transparent',
        border: 'none',
        color: hover && danger ? '#fff' : 'rgba(255,255,255,0.5)',
        cursor: 'default', transition: 'background 0.1s, color 0.1s',
        padding: 0, outline: 'none', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ── Nav tab ──────────────────────────────────────────────────────────────────
function NavTab({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, padding: '0 22px', height: '100%',
        border: 'none', borderBottom: `2px solid ${active ? '#E8001D' : 'transparent'}`,
        cursor: 'pointer', background: 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.38)',
        transition: 'color 0.15s, border-color 0.15s',
        fontFamily: 'var(--font-ui)', flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, letterSpacing: '0.04em', lineHeight: 1 }}>{label}</span>
    </button>
  )
}

const PAGES = [
  { id: 'home',     label: 'Home',     icon: '⌂' },
  { id: 'overlays', label: 'Overlays', icon: '◫' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function ControlPanel() {
  const { data, connected }  = useTelemetry()
  const [page, setPage]      = useState('home')
  const [activeOverlays, setActiveOverlays] = useState({})
  const [presets, setPresets]               = useState({})
  const [autoPreset, setAutoPresetState]    = useState(false)
  const [currentPresetKey, setCurrentPresetKey] = useState(null)
  const [networkStatus, setNetworkStatus]   = useState({ active: false, available: true, urls: [], clients: 0 })
  const [vrMode, setVrModeState]            = useState(false)
  const [bridgeStatus, setBridgeStatus]     = useState('starting')

  const hasElectron = typeof window !== 'undefined' && window.ari

  // ── Listen for gear-icon requests from overlays → jump to Overlays page ────
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onOpenSettings(() => setPage('overlays'))
    return () => window.ari.removeOpenSettingsListener()
  }, [hasElectron])

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getActiveOverlays().then(ids => {
      const state = {}
      ids.forEach(id => { state[id] = true })
      setActiveOverlays(state)
    })
    window.ari.getPresets().then(p => setPresets(p || {}))
    window.ari.getAutoPreset().then(v => setAutoPresetState(v || false))
    window.ari.getNetworkStatus().then(s => setNetworkStatus(s))
    window.ari.getVrMode().then(v => setVrModeState(v || false))
    window.ari.getBridgeStatus().then(s => setBridgeStatus(s || 'starting'))
  }, [hasElectron])

  // ── Live listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onNetworkStatus(s => setNetworkStatus(s))
    return () => window.ari.removeNetworkStatusListener()
  }, [hasElectron])

  useEffect(() => {
    if (!hasElectron) return
    window.ari.onBridgeStatus(s => setBridgeStatus(s))
    return () => window.ari.removeBridgeStatusListener()
  }, [hasElectron])

  useEffect(() => {
    if (!hasElectron) return
    window.ari.onSessionTypeChange(({ presetKey }) => setCurrentPresetKey(presetKey))
    return () => window.ari.removeSessionTypeListener()
  }, [hasElectron])

  useEffect(() => {
    if (!hasElectron) return
    window.ari.onPresetApplied((key, preset) => {
      const state = {}
      ;(preset.activeOverlays || []).forEach(id => { state[id] = true })
      setActiveOverlays(state)
    })
    return () => window.ari.removePresetAppliedListener()
  }, [hasElectron])


  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleOverlay = async (id) => {
    const isActive = activeOverlays[id]
    if (hasElectron) {
      if (isActive) await window.ari.hideOverlay(id)
      else          await window.ari.showOverlay(id)
    }
    setActiveOverlays(prev => ({ ...prev, [id]: !isActive }))
  }

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

  const resetPositions = async () => {
    if (hasElectron) await window.ari.resetPositions()
  }

  // ── Bottom bar: connection dot + status text ───────────────────────────────
  const activeCount = Object.values(activeOverlays).filter(Boolean).length

  function getConnectionLabel() {
    if (connected) return data?.demo ? 'Demo mode' : 'iRacing connected'
    switch (bridgeStatus) {
      case 'compiling':    return 'Compiling bridge...'
      case 'running':      return 'Waiting for iRacing'
      case 'blocked':      return 'Bridge blocked — add Defender exclusion in Settings'
      case 'compile-error': return 'Bridge compile error — .NET 4 required'
      case 'disconnected': return 'iRacing disconnected'
      default:             return 'Waiting for iRacing'
    }
  }

  const statusColor = connected
    ? '#22C55E'
    : bridgeStatus === 'blocked' || bridgeStatus === 'compile-error'
      ? '#F59E0B'
      : 'rgba(255,255,255,0.3)'

  return (
    <div style={{
      height: '100vh', background: '#0e0e10',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-ui)', overflow: 'hidden',
    }}>

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 36, background: '#0a0a0c',
        borderBottom: '1px solid #E8001D',   /* red accent line */
        display: 'flex', alignItems: 'center',
        WebkitAppRegion: 'drag', flexShrink: 0, userSelect: 'none',
      }}>
        {/* Logo + title — fills remaining space (draggable) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '0 16px', flex: 1, minWidth: 0,
        }}>
          <img src={ariLogo} alt="ARI" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
          <span style={{
            fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-ui)', letterSpacing: '0.01em', whiteSpace: 'nowrap',
          }}>
            Aventa Race Intelligence
          </span>
        </div>

        {/* Window controls — not draggable */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
          <WinBtn onClick={() => window.ari?.windowMinimize()} label="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none"><rect width="10" height="1" fill="currentColor" /></svg>
          </WinBtn>
          <WinBtn onClick={() => window.ari?.windowMaximize()} label="Maximize">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" /></svg>
          </WinBtn>
          <WinBtn onClick={() => window.ari?.windowClose()} label="Close" danger>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </WinBtn>
        </div>
      </div>

      {/* ── Nav tabs ───────────────────────────────────────────────────────── */}
      <div style={{
        height: 52, background: '#0d0d0f',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'stretch',
        WebkitAppRegion: 'no-drag', flexShrink: 0, userSelect: 'none',
      }}>
        {PAGES.map(p => (
          <NavTab
            key={p.id}
            label={p.label}
            icon={p.icon}
            active={page === p.id}
            onClick={() => setPage(p.id)}
          />
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {page === 'home' && (
          <HomePage connected={connected} />
        )}
        {page === 'overlays' && (
          <OverlaysPage activeOverlays={activeOverlays} onToggle={toggleOverlay} />
        )}
        {page === 'settings' && (
          <SettingsPage
            networkStatus={networkStatus}
            vrMode={vrMode}
            onToggleNetwork={toggleNetwork}
            onToggleVr={toggleVrMode}
            onResetPositions={resetPositions}
          />
        )}
      </div>

      {/* ── BottomBar ───────────────────────────────────────────────────────── */}
      <div style={{
        height: 40, background: '#080809',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', flexShrink: 0,
      }}>
        {/* Left: connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? '#22C55E' : (bridgeStatus === 'blocked' || bridgeStatus === 'compile-error' ? '#F59E0B' : '#E8001D'),
            boxShadow: connected ? '0 0 5px #22C55E' : (bridgeStatus === 'blocked' || bridgeStatus === 'compile-error' ? '0 0 5px #F59E0B' : '0 0 5px #E8001D'),
          }} />
          <span style={{ fontSize: 11, color: statusColor }}>
            {getConnectionLabel()}
          </span>
        </div>

        {/* Center: active overlay count */}
        {activeCount > 0 && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            {activeCount} overlay{activeCount !== 1 ? 's' : ''} active
          </span>
        )}

        {/* Right: VR badge + reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {vrMode && (
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: '#C084FC', background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.25)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.08em' }}>
              VR
            </span>
          )}
          <button
            onClick={resetPositions}
            style={{
              fontSize: 10, color: 'rgba(255,255,255,0.2)',
              background: 'none', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 4, padding: '3px 9px', cursor: 'pointer',
              fontFamily: 'var(--font-data)', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            Reset Positions
          </button>
        </div>
      </div>

    </div>
  )
}
