import React, { useState, useEffect } from 'react'
import { useTelemetry } from '../hooks/useTelemetry'

const OVERLAYS = [
  { id: 'relative',  label: 'Relative',  description: 'Cars ahead & behind with gap times' },
  { id: 'standings', label: 'Standings', description: 'Full race order with gaps to leader' },
  { id: 'fuel',      label: 'Fuel Calc', description: 'Fuel usage, laps remaining, pit strategy' },
  { id: 'trackmap',  label: 'Track Map', description: 'Live car positions on track' },
  { id: 'inputs',    label: 'Inputs',    description: 'Throttle, brake, steering & delta' },
]

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
      {/* Title bar */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        WebkitAppRegion: 'drag',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: '#E8001D',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-data)' }}>A</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>
              Aventa Race Intelligence
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginTop: 1 }}>
              ARI v0.1.0
            </div>
          </div>
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

      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
        {OVERLAYS.map(({ id, label, description }) => {
          const active = activeOverlays[id]
          return (
            <div
              key={id}
              onClick={() => toggleOverlay(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: active ? 'rgba(232,0,29,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(232,0,29,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Toggle pill */}
              <div style={{
                width: 32, height: 18,
                background: active ? '#E8001D' : 'rgba(255,255,255,0.1)',
                borderRadius: 9,
                position: 'relative',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 2, left: active ? 16 : 2,
                  width: 14, height: 14,
                  background: '#fff',
                  borderRadius: '50%',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                  marginBottom: 2
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)'
                }}>
                  {description}
                </div>
              </div>

              {active && (
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#E8001D',
                  background: 'rgba(232,0,29,0.12)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  letterSpacing: '0.08em'
                }}>
                  ON
                </span>
              )}
            </div>
          )
        })}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={async () => {
              if (hasElectron) await window.ari.resetPositions()
            }}
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
              textTransform: 'uppercase'
            }}
          >
            Reset layout
          </button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            {data?.demo ? 'DEMO' : 'LIVE'}
          </span>
        </div>
      </div>
    </div>
  )
}
