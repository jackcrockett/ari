import React, { useState, useEffect, useMemo } from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import DriverRow from '../ui/DriverRow'
import { DEFAULT_COLUMNS } from '../../lib/columnDefs'
import { DEFAULT_VARIANT } from '../../lib/overlayVariants'

export default function LeaderboardOverlay() {
  const { data } = useTelemetry()
  const hasElectron = typeof window !== 'undefined' && window.ari

  const [columns,  setColumns]  = useState(DEFAULT_COLUMNS.leaderboard)
  const [rowCount, setRowCount] = useState(15)
  const [variant,  setVariant]  = useState(DEFAULT_VARIANT)

  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings('leaderboard').then(s => {
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.rowCount)        setRowCount(s.rowCount)
      if (s?.variant)         setVariant(s.variant)
    })
  }, [hasElectron])

  useEffect(() => {
    if (!hasElectron) return
    window.ari.onOverlaySettingsChanged((id, s) => {
      if (id !== 'leaderboard') return
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
    if (hasElectron) window.ari.requestOpenSettings('leaderboard')
  }

  return (
      <div className="overlay" style={{ width: '100%' }}>
        <DragHandle overlayId="leaderboard" label="Leaderboard" onSettings={openSettings}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
            {data?.sessionType || ''}
          </span>
        </DragHandle>

        <div style={{ padding: '4px 0 6px' }}>
          {standings.map((driver, i) => (
            <div
              key={driver.carIdx}
              style={{
                background: i % 2 === 0 && !driver.isPlayer
                  ? 'rgba(255,255,255,0.015)'
                  : undefined,
              }}
            >
              <DriverRow
                driver={driver}
                columns={columns}
                isLast={i === standings.length - 1}
                data={data}
                variant={variant}
              />
            </div>
          ))}
        </div>
      </div>
  )
}
