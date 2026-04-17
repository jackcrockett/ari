import React, { useState } from 'react'
import { useTelemetry } from '../hooks/useTelemetry'
import ariLogo from '../../../assets/ari_logo.png'

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

export default function ControlPanel() {
  const { data, connected } = useTelemetry()
  const [activeOverlays, setActiveOverlays] = useState({})
  const hasElectron = typeof window !== 'undefined' && window.ari

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

      {/* Footer */}
      <div style={{
        padding: '12px 18px',
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
