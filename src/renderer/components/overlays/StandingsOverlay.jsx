import React, { useState, useEffect, useMemo } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import DriverRow from '../ui/DriverRow'
import { DEFAULT_COLUMNS } from '../../lib/columnDefs'
import { DEFAULT_VARIANT } from '../../lib/overlayVariants'

function formatSessTime(secs) {
  if (!secs || secs <= 0) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function ClassHeader({ cls, colour, drivers, data }) {
  const sof = drivers.length
    ? Math.round(drivers.reduce((s, d) => s + (d.iRating || 1500), 0) / drivers.length / 100) * 100
    : null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '3px 10px',
      background: colour ? colour + '22' : 'rgba(255,255,255,0.04)',
      borderBottom: `1px solid ${colour ? colour + '44' : 'rgba(255,255,255,0.08)'}`,
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800,
          background: colour || 'rgba(255,255,255,0.15)',
          color: '#fff',
          padding: '1px 5px', borderRadius: 2, letterSpacing: '0.08em',
        }}>
          {cls}
        </span>
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600,
          color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em',
        }}>
          {drivers.length} cars
        </span>
      </div>
      {sof && (
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600,
          color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em',
        }}>
          SOF {sof}
        </span>
      )}
    </div>
  )
}

export default function StandingsOverlay() {
  const { data } = useTelemetry()
  const hasElectron = typeof window !== 'undefined' && window.ari

  const [columns,  setColumns]  = useState(DEFAULT_COLUMNS.standings)
  const [rowCount, setRowCount] = useState(10)
  const [variant,  setVariant]  = useState(DEFAULT_VARIANT)

  useEffect(() => {
    if (!hasElectron) return
    window.ari.getOverlaySettings('standings').then(s => {
      if (s?.columns?.length) setColumns(s.columns)
      if (s?.rowCount)        setRowCount(s.rowCount)
      if (s?.variant)         setVariant(s.variant)
    })
  }, [hasElectron])

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

  // Group standings by car class
  const classGroups = useMemo(() => {
    if (!data?.standings) return []
    const seen = new Map()
    data.standings.slice(0, rowCount).forEach(driver => {
      const cls = driver.carClass || ''
      if (!seen.has(cls)) seen.set(cls, { drivers: [], colour: driver.colour })
      seen.get(cls).drivers.push(driver)
    })
    return [...seen.entries()].map(([cls, { drivers, colour }]) => ({ cls, drivers, colour }))
  }, [data, rowCount])

  const multiClass = classGroups.length > 1

  const openSettings = () => {
    if (hasElectron) window.ari.requestOpenSettings('standings')
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
      <DragHandle overlayId="standings" label="Standings" onSettings={openSettings} />

      {/* Session header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3px 10px',
        background: 'rgba(255,255,255,0.015)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
          color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em',
        }}>
          {(data.sessionType || 'RACE').toUpperCase()}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
            Lap
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {data.currentLap ?? '--'}
          </span>
          {data.totalLaps ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
              /{data.totalLaps}
            </span>
          ) : null}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginLeft: 4 }}>
            {formatSessTime(data.sessionTimeRemain)}
          </span>
        </div>
      </div>

      {classGroups.map(({ cls, drivers, colour }, gi) => (
        <React.Fragment key={cls || gi}>
          {multiClass && (
            <ClassHeader cls={cls} colour={colour} drivers={drivers} data={data} />
          )}
          {drivers.map((driver, i) => (
            <div
              key={driver.carIdx}
              style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent' }}
            >
              <DriverRow
                driver={driver}
                columns={columns}
                isLast={!multiClass && i === drivers.length - 1}
                data={data}
                variant={variant}
              />
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
