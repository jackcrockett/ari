import React, { useState, useEffect, useMemo } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import DriverRow from '../ui/DriverRow'
import { DEFAULT_COLUMNS } from '../../lib/columnDefs'
import { DEFAULT_VARIANT } from '../../lib/overlayVariants'

const FLAG_YELLOW    = 0x0002
const FLAG_RED       = 0x0010
const FLAG_CHEQUERED = 0x0080
const FLAG_GREEN     = 0x0004
const FLAG_WHITE     = 0x0040

function formatSessTime(secs) {
  if (secs == null || secs < 0) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function FlagStrip({ flags }) {
  if (!flags) return null
  let label, color
  if (flags & FLAG_CHEQUERED)  { label = 'CHEQUERED'; color = '#fff' }
  else if (flags & FLAG_RED)   { label = 'RED FLAG';  color = '#ff2348' }
  else if (flags & FLAG_YELLOW){ label = 'YELLOW';    color = '#F59E0B' }
  else if (flags & FLAG_WHITE) { label = 'WHITE';     color = '#e0e0e0' }
  else if (flags & FLAG_GREEN) { label = 'GREEN';     color = '#22C55E' }
  else return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2px 10px',
      background: color + '18',
      borderBottom: `1px solid ${color}44`,
    }}>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800,
        color, letterSpacing: '0.12em' }}>
        {label}
      </span>
    </div>
  )
}

function SessionBar({ data, player }) {
  const time   = formatSessTime(data?.sessionTimeRemain)
  const fuel   = data?.fuelPct != null ? `${data.fuelPct}%` : null
  const temp   = data?.trackTemp != null ? `${Math.round(data.trackTemp)}°` : null
  const pos    = player?.position ?? '--'
  const total  = data?.standings?.length ?? '--'
  const irStr  = player?.iRating ? `${(player.iRating / 1000).toFixed(1)}k` : null

  const items = [
    { sym: '⏱', val: time },
    irStr && { sym: '↔', val: irStr },
    fuel  && { sym: '⛽', val: fuel },
    temp  && { sym: '🌡', val: temp },
  ].filter(Boolean)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '3px 8px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {items.map(({ sym, val }) => (
          <span key={sym} style={{
            fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{ fontSize: 9 }}>{sym}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.75)' }}>{val}</span>
          </span>
        ))}
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.7)',
      }}>
        {pos}/{total}
      </span>
    </div>
  )
}

export default function RelativeOverlay() {
  const { data, connected } = useTelemetry()
  const hasElectron = typeof window !== 'undefined' && window.ari

  const [columns, setColumns] = useState(DEFAULT_COLUMNS.relative)
  const [variant, setVariant] = useState(DEFAULT_VARIANT)

  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings('relative').then(s => {
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.variant)         setVariant(s.variant)
    })
  }, [hasElectron])

  useEffect(() => {
    if (!hasElectron) return
    window.ari.onOverlaySettingsChanged((id, s) => {
      if (id !== 'relative') return
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.variant)         setVariant(s.variant)
    })
    return () => window.ari.removeSettingsChangeListener()
  }, [hasElectron])

  const drivers = useMemo(() => {
    if (!data?.relative) return []
    const sorted = [...data.relative].sort((a, b) => a.gapSeconds - b.gapSeconds)
    const selfIdx = sorted.findIndex(d => d.isPlayer)
    if (selfIdx === -1) return sorted.slice(0, 5)
    const start = Math.max(0, selfIdx - 2)
    return sorted.slice(start, start + 5)
  }, [data])

  const player = useMemo(() => drivers.find(d => d.isPlayer), [drivers])

  const openSettings = () => {
    if (hasElectron) window.ari.requestOpenSettings('relative')
  }

  if (!data) {
    return (
      <div className="overlay" style={{ width: '100%', padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  return (
    <div className="overlay" style={{ width: '100%' }}>
      <DragHandle overlayId="relative" label="Relative" onSettings={openSettings} />

      <SessionBar data={data} player={player} />
      <FlagStrip flags={data?.sessionFlags} />

      {drivers.map((driver, i) => (
        <DriverRow
          key={driver.carIdx}
          driver={driver}
          columns={columns}
          isLast={i === drivers.length - 1}
          data={data}
          variant={variant}
        />
      ))}

      {/* LAST / BEST footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '3px 10px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>LAST</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.75)' }}>
            {formatLapTime(player?.lastLapTime)}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>BEST</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            color: '#A78BFA' }}>
            {formatLapTime(player?.bestLapTime)}
          </span>
        </span>
      </div>
    </div>
  )
}
