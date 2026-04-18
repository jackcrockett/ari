import React, { useState, useEffect, useMemo } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'
import DriverRow from '../ui/DriverRow'
import { DEFAULT_COLUMNS } from '../../lib/columnDefs'
import { DEFAULT_VARIANT } from '../../lib/overlayVariants'

export default function StandingsOverlay() {
  const { data } = useTelemetry()
  const hasElectron = typeof window !== 'undefined' && window.ari

  const [columns,  setColumns]  = useState(DEFAULT_COLUMNS.standings)
  const [rowCount, setRowCount] = useState(10)
  const [variant,  setVariant]  = useState(DEFAULT_VARIANT)

  // Load persisted column settings on mount
  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings('standings').then(s => {
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.rowCount)        setRowCount(s.rowCount)
      if (s?.variant)         setVariant(s.variant)
    })
  }, [hasElectron])

  // Live-update when user changes settings in the column picker
  useEffect(() => {
    if (!hasElectron) return
    window.ari.onOverlaySettingsChanged((id, s) => {
      if (id !== 'standings') return
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.rowCount)        setRowCount(s.rowCount)
      if (s?.variant)         setVariant(s.variant)
    })
    return () => window.ari.removeSettingsChangeListener()
  }, [hasElectron])

  const standings = useMemo(() => {
    if (!data?.standings) return []
    return data.standings.slice(0, rowCount)
  }, [data, rowCount])

  const openSettings = () => {
    if (hasElectron) window.ari.requestOpenSettings('standings')
  }

  if (!data) {
    return (
      <div className="overlay" style={{ width: 300, padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  return (
    <ResizeHandles overlayId="standings">
      <div className="overlay" style={{ width: 300 }}>
        <DragHandle overlayId="standings" label="Standings" onSettings={openSettings}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Lap <strong style={{ color: '#fff' }}>{data.currentLap}</strong>
            {data.totalLaps ? ` / ${data.totalLaps}` : ''}
          </span>
        </DragHandle>

        {standings.map((driver, i) => (
          <DriverRow
            key={driver.carIdx}
            driver={driver}
            columns={columns}
            isLast={i === standings.length - 1}
            data={data}
            variant={variant}
          />
        ))}
      </div>
    </ResizeHandles>
  )
}
