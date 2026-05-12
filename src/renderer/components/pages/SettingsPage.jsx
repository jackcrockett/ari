import React, { useState, useCallback } from 'react'

function Toggle({ active, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
        background: active ? '#E8001D' : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s', cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: active ? 18 : 3,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

const CATEGORIES = ['General', 'Network', 'Overlays', 'About']

export default function SettingsPage({
  networkStatus, vrMode, onToggleNetwork, onToggleVr, onResetPositions,
}) {
  const [category, setCategory]         = useState('General')
  const [defenderState, setDefenderState] = useState('idle') // idle | running | ok | error
  const hasElectron = typeof window !== 'undefined' && window.ari

  const addDefenderExclusion = useCallback(async () => {
    if (!hasElectron || defenderState === 'running') return
    setDefenderState('running')
    try {
      const result = await window.ari.addDefenderExclusion()
      setDefenderState(result.ok ? 'ok' : 'error')
    } catch (_) {
      setDefenderState('error')
    }
  }, [hasElectron, defenderState])

  const copyUrl = (url) => navigator.clipboard?.writeText(url).catch(() => {})

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Left: category sidebar */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 0', overflowY: 'auto',
      }}>
        <div style={{ padding: '0 16px 12px', fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-data)' }}>
          Categories
        </div>
        {CATEGORIES.map(cat => (
          <div
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '9px 20px', cursor: 'pointer', fontSize: 13,
              color: category === cat ? '#fff' : 'rgba(255,255,255,0.5)',
              background: category === cat ? 'rgba(232,0,29,0.08)' : 'transparent',
              borderLeft: `2px solid ${category === cat ? '#E8001D' : 'transparent'}`,
              fontWeight: category === cat ? 600 : 400,
              transition: 'background 0.12s',
            }}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Right: settings content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>

        {category === 'General' && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>General</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Application-wide settings
            </p>

            <SettingRow
              label="VR Mode"
              description="Sets overlay windows to 'normal' always-on-top level — required for OpenVR/SteamVR capture"
            >
              <Toggle active={vrMode} onChange={onToggleVr} />
            </SettingRow>

            <SettingRow
              label="Reset Overlay Positions"
              description="Move all overlay windows back to their default screen positions"
            >
              <button
                onClick={onResetPositions}
                style={{
                  padding: '6px 14px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 12,
                }}
              >
                Reset
              </button>
            </SettingRow>

            <SettingRow
              label="Windows Defender — Add Exclusion"
              description="If Windows Defender is blocking ari_bridge.exe, click this to add an exclusion for the ARI data folder. A UAC prompt will appear requesting administrator permission."
            >
              <button
                onClick={addDefenderExclusion}
                disabled={defenderState === 'running' || defenderState === 'ok'}
                style={{
                  padding: '6px 14px', borderRadius: 5, fontFamily: 'var(--font-ui)', fontSize: 12,
                  cursor: defenderState === 'running' || defenderState === 'ok' ? 'default' : 'pointer',
                  background: defenderState === 'ok'
                    ? 'rgba(34,197,94,0.12)'
                    : defenderState === 'error'
                      ? 'rgba(232,0,29,0.12)'
                      : 'rgba(255,255,255,0.06)',
                  border: defenderState === 'ok'
                    ? '1px solid rgba(34,197,94,0.3)'
                    : defenderState === 'error'
                      ? '1px solid rgba(232,0,29,0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                  color: defenderState === 'ok'
                    ? '#22C55E'
                    : defenderState === 'error'
                      ? '#E8001D'
                      : 'rgba(255,255,255,0.55)',
                  minWidth: 100,
                }}
              >
                {defenderState === 'running' ? 'Adding...'
                  : defenderState === 'ok'   ? 'Added'
                  : defenderState === 'error' ? 'Failed — retry?'
                  : 'Add Exclusion'}
              </button>
            </SettingRow>
          </>
        )}

        {category === 'Network' && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Network Streaming</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Broadcast live telemetry to other devices on your local network over HTTP.
            </p>

            <SettingRow label="Enable HTTP server" description="Starts a local HTTP server on port 7001 to stream telemetry JSON">
              <Toggle active={networkStatus.active} onChange={onToggleNetwork} />
            </SettingRow>

            {networkStatus.active && networkStatus.urls?.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {networkStatus.urls.map((u, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)',
                    borderRadius: 7, padding: '10px 14px',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22C55E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.http}
                    </span>
                    <button
                      onClick={() => copyUrl(u.http)}
                      style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-data)', letterSpacing: '0.06em', flexShrink: 0 }}
                    >
                      COPY
                    </button>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  {networkStatus.clients} connected client{networkStatus.clients !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </>
        )}

        {category === 'Overlays' && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Overlay Display</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Settings that affect how overlays appear on screen.
            </p>

            <SettingRow
              label="Borderless windowed mode"
              description="iRacing must be running in borderless windowed mode for overlays to appear on top of it"
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-data)' }}>REQUIRED</span>
            </SettingRow>

            <SettingRow
              label="Reset all positions"
              description="Return every overlay to its factory default screen position"
            >
              <button
                onClick={onResetPositions}
                style={{
                  padding: '6px 14px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 12,
                }}
              >
                Reset
              </button>
            </SettingRow>
          </>
        )}

        {category === 'About' && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>About ARI</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 28px', lineHeight: 1.5 }}>
              Aventa Race Intelligence — iRacing telemetry overlay suite
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Application', value: 'Aventa Race Intelligence (ARI)' },
                { label: 'Stack', value: 'Electron · React · Vite' },
                { label: 'Data source', value: 'iRacing SDK via C# bridge (ari_bridge.exe)' },
                { label: 'Simulator', value: 'iRacing' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 120, flexShrink: 0, fontFamily: 'var(--font-data)', letterSpacing: '0.04em', paddingTop: 1 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{value}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
