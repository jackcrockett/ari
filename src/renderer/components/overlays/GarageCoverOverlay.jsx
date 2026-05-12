/**
 * GarageCoverOverlay — full-screen cover shown while player is in the garage.
 * Displays ARI branding, track name, and session info.
 */
import React, { useState, useEffect } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'

function formatTime(secs) {
  if (!secs || secs <= 0) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ARI wordmark made from styled text — no image dependency
function ARIWordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, userSelect: 'none' }}>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 52, fontWeight: 900,
        color: '#ff2348', lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        A
      </span>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 52, fontWeight: 900,
        color: '#fff', lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        RI
      </span>
    </div>
  )
}

function InfoBlock({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
        color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 16, fontWeight: 800,
        color: accent || '#fff', letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  )
}

export default function GarageCoverOverlay() {
  const { data, connected } = useTelemetry()
  const [visible, setVisible] = useState(true)

  // Auto-show/hide based on isInGarage (when not in preview)
  const isGarage = data?.isInGarage ?? false
  const isPreview = typeof window !== 'undefined' && !window.ari

  // In preview mode always show; in live mode only show when in garage
  const shouldShow = isPreview || isGarage

  const trackName = data?.trackName || '—'
  const trackConfig = data?.trackConfigName
  const displayTrack = trackConfig ? `${trackName} — ${trackConfig}` : trackName
  const sessionType = data?.sessionType || '—'
  const lap = data?.currentLap
  const totalLaps = data?.totalLaps
  const timeRemain = data?.sessionTimeRemain
  const fuel = data?.fuel

  return (
      <div className="overlay" style={{ width: '100%' }}>
        <DragHandle overlayId="garagecover" label="Garage Cover">
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700,
            color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em',
          }}>
            {shouldShow ? 'VISIBLE' : 'HIDDEN — waiting for garage'}
          </span>
        </DragHandle>

        {/* Main content */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '28px 24px 22px',
          gap: 20,
          minHeight: 200,
          opacity: shouldShow ? 1 : 0.25,
          transition: 'opacity 0.4s ease',
        }}>

          {/* ARI wordmark + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <ARIWordmark />
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>
              Aventa Race Intelligence
            </span>
          </div>

          {/* Red separator line */}
          <div style={{ width: 40, height: 2, background: '#ff2348', borderRadius: 1, opacity: 0.8 }} />

          {/* Track name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-data)', fontSize: 18, fontWeight: 800,
              color: '#fff', letterSpacing: '0.01em', lineHeight: 1.2,
            }}>
              {displayTrack}
            </div>
          </div>

          {/* Session info strip */}
          <div style={{
            display: 'flex', gap: 28, alignItems: 'flex-start',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}>
            <InfoBlock label="Session" value={sessionType} />

            {lap != null && (
              <InfoBlock
                label="Lap"
                value={totalLaps ? `${lap} / ${totalLaps}` : String(lap)}
              />
            )}

            {timeRemain != null && timeRemain > 0 && (
              <InfoBlock label="Remaining" value={formatTime(timeRemain)} />
            )}

            {fuel?.level != null && (
              <InfoBlock
                label="Fuel"
                value={`${fuel.level.toFixed(1)}L`}
                accent={fuel.level < (fuel.perLap * 2) ? '#ff2348' : '#22C55E'}
              />
            )}
          </div>

          {/* Connection dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: connected ? '#22C55E' : '#ff2348',
              boxShadow: connected ? '0 0 5px #22C55E' : '0 0 5px #ff2348',
            }} />
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 600,
              color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em',
            }}>
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

        </div>
      </div>
  )
}
