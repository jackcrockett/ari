import React, { useState, useEffect, useMemo } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import DriverRow from '../ui/DriverRow'
import { DEFAULT_COLUMNS } from '../../lib/columnDefs'

export default function RelativeOverlay() {
  const { data, connected } = useTelemetry()
  const hasElectron = typeof window !== 'undefined' && window.ari

  const [columns, setColumns] = useState(DEFAULT_COLUMNS.relative)

  // Load persisted column settings on mount
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings('relative').then(s => {
      if (s?.columns?.length) setColumns(s.columns)
    })
  }, [hasElectron])

  // Live-update when user changes settings in the column picker
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onOverlaySettingsChanged((id, s) => {
      if (id !== 'relative') return
      if (s?.columns?.length) setColumns(s.columns)
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

  const openSettings = () => {
    if (hasElectron) window.ari.requestOpenSettings('relative')
  }

  if (!data) {
    return (
      <div className="overlay" style={{ width: 290, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  return (
    <ResizeHandles overlayId="relative">
      <div className="overlay" style={{ width: 290 }}>
        <DragHandle overlayId="relative" label="Relative" onSettings={openSettings}>
          <span className="live-badge" style={{
            background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
            color: connected ? '#22C55E' : '#F59E0B',
          }}>
            {connected ? 'LIVE' : 'DEMO'}
          </span>
        </DragHandle>

        {drivers.map((driver, i) => (
          <DriverRow
            key={driver.carIdx}
            driver={driver}
            columns={columns}
            isLast={i === drivers.length - 1}
            data={data}
          />
        ))}
      </div>
    </ResizeHandles>
  )
}
