import React, { useState, useEffect, useCallback } from 'react'
import { OVERLAY_GROUPS, OVERLAYS, OVERLAY_DEFAULTS_RENDERER } from '../../lib/overlayGroups'
import { COLUMN_PICKER_OVERLAYS } from '../../lib/columnDefs'
import OverlayPreviewWrapper from '../ui/OverlayPreviewWrapper'
import ColumnPicker from '../ui/ColumnPicker'

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ active, onChange }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange() }}
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

// ── Size editor ───────────────────────────────────────────────────────────────
function SizeEditor({ overlayId, isActive }) {
  const hasElectron = typeof window !== 'undefined' && window.ari
  const def = OVERLAY_DEFAULTS_RENDERER[overlayId] || { width: 300, height: 200 }

  const [width,  setWidth]  = useState(def.width)
  const [height, setHeight] = useState(def.height)
  const [limits, setLimits] = useState({ minW: 80, minH: 40 })
  const [loaded, setLoaded] = useState(false)

  // Load current saved size from main
  useEffect(() => {
    if (!hasElectron) { setLoaded(true); return }
    window.ari.getOverlaySize(overlayId).then(info => {
      if (!info) { setLoaded(true); return }
      setWidth(info.width)
      setHeight(info.height)
      setLimits({ minW: info.minWidth, minH: info.minHeight })
      setLoaded(true)
    })
  }, [overlayId, hasElectron])

  const apply = useCallback((w, h) => {
    const clampedW = Math.max(limits.minW, Math.round(w))
    const clampedH = Math.max(limits.minH, Math.round(h))
    setWidth(clampedW)
    setHeight(clampedH)
    if (hasElectron) window.ari.setOverlaySize(overlayId, clampedW, clampedH)
  }, [overlayId, hasElectron, limits])

  const reset = () => apply(def.width, def.height)

  const isDefault = width === def.width && height === def.height

  if (!loaded) return null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '14px 18px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        fontFamily: 'var(--font-data)', marginBottom: 12,
      }}>
        Window Size
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Width */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Width</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input
              type="number"
              value={width}
              min={limits.minW}
              step={10}
              onChange={e => setWidth(Number(e.target.value))}
              onBlur={e => apply(Number(e.target.value), height)}
              onKeyDown={e => e.key === 'Enter' && apply(Number(e.target.value), height)}
              style={{
                width: 70, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px 0 0 4px',
                padding: '5px 8px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)',
                outline: 'none', textAlign: 'right',
              }}
            />
            <span style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderLeft: 'none', borderRadius: '0 4px 4px 0',
              padding: '5px 7px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-data)',
            }}>px</span>
          </div>
        </label>

        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginTop: 16 }}>×</span>

        {/* Height */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Height</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input
              type="number"
              value={height}
              min={limits.minH}
              step={10}
              onChange={e => setHeight(Number(e.target.value))}
              onBlur={e => apply(width, Number(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && apply(width, Number(e.target.value))}
              style={{
                width: 70, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px 0 0 4px',
                padding: '5px 8px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)',
                outline: 'none', textAlign: 'right',
              }}
            />
            <span style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderLeft: 'none', borderRadius: '0 4px 4px 0',
              padding: '5px 7px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-data)',
            }}>px</span>
          </div>
        </label>

        {/* Reset button — only visible when custom */}
        {!isDefault && (
          <button
            onClick={reset}
            style={{
              marginTop: 18, padding: '6px 11px', borderRadius: 4, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-ui)',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {!isActive && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.4 }}>
          Enable the overlay to see size changes take effect.
        </p>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 1.4 }}>
        Default: {def.width} × {def.height} px &nbsp;·&nbsp; Content scales automatically to fill any size.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OverlaysPage({ activeOverlays, onToggle }) {
  const [selected, setSelected]       = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  const hasElectron = typeof window !== 'undefined' && window.ari

  const handleSelect = (id) => {
    setSelected(id)
    setShowSettings(false)
  }

  const selectedOverlay = OVERLAYS.find(o => o.id === selected)
  const canConfigure = selected && COLUMN_PICKER_OVERLAYS.has(selected)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left: overlay list ─────────────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
        overflowY: 'auto', padding: '16px 0',
      }}>
        {OVERLAY_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{
              padding: '8px 20px 4px',
              fontSize: 9, color: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              fontFamily: 'var(--font-data)',
            }}>
              {group.label}
            </div>
            {group.overlays.map(({ id, label }) => {
              const active = activeOverlays[id]
              const isSelected = selected === id
              return (
                <div
                  key={id}
                  onClick={() => handleSelect(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 20px', cursor: 'pointer',
                    background: isSelected ? 'rgba(232,0,29,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isSelected ? '#E8001D' : 'transparent'}`,
                    transition: 'background 0.12s',
                  }}
                >
                  <Toggle active={active} onChange={() => onToggle(id)} />
                  <span style={{
                    fontSize: 13, fontWeight: isSelected ? 600 : 400,
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                    flex: 1,
                  }}>
                    {label}
                  </span>
                  {active && (
                    <span style={{
                      fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700,
                      color: '#E8001D', background: 'rgba(232,0,29,0.12)',
                      padding: '1px 5px', borderRadius: 3, letterSpacing: '0.08em',
                    }}>ON</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Right: detail panel ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity={0.2}>
              <rect x="4" y="8" width="32" height="24" rx="3" stroke="white" strokeWidth="2" />
              <line x1="4" y1="14" x2="36" y2="14" stroke="white" strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
              Select an overlay to preview and configure
            </span>
          </div>
        ) : showSettings && canConfigure ? (
          <ColumnPicker
            overlayId={selected}
            overlayLabel={selectedOverlay?.label ?? selected}
            onBack={() => setShowSettings(false)}
          />
        ) : (
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 8 }}>
                  {selectedOverlay?.label}
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
                  {selectedOverlay?.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {canConfigure && (
                  <button
                    onClick={() => setShowSettings(true)}
                    style={{
                      padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--font-ui)',
                    }}
                  >
                    Configure
                  </button>
                )}
                <button
                  onClick={() => onToggle(selected)}
                  style={{
                    padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    background: activeOverlays[selected] ? 'rgba(232,0,29,0.15)' : 'rgba(232,0,29,0.85)',
                    border: `1px solid ${activeOverlays[selected] ? 'rgba(232,0,29,0.35)' : '#E8001D'}`,
                    color: activeOverlays[selected] ? '#E8001D' : '#fff',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {activeOverlays[selected] ? 'Hide Overlay' : 'Show Overlay'}
                </button>
              </div>
            </div>

            {/* Live preview */}
            <OverlayPreviewWrapper overlayId={selected} />

            {/* Size editor */}
            <SizeEditor overlayId={selected} isActive={!!activeOverlays[selected]} />

          </div>
        )}
      </div>
    </div>
  )
}
