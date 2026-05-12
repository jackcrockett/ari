/**
 * columnDefs.jsx -- single source of truth for all driver-row column definitions.
 *
 * Each entry in COLUMN_DEFS has:
 *   label       {string}  Short header label ('' for icon-only columns)
 *   width       {number|null}  Fixed pixel width; null = flex-1 (fills remaining space)
 *   renderCell  {fn(driver, data) => JSX}  Returns JSX for one table cell
 *
 * Columns with width=null (driverName) flex to fill remaining row space.
 * All other columns are fixed-width and flexShrink:0.
 */

import React from 'react'
import { formatGap, formatLapTime, licenseColor, licenseTextColor } from '../hooks/useTelemetry'

export const DRIVER_COLOURS = [
  '#F59E0B','#64748B','#3B82F6','#FF6B35',
  '#E8001D','#22C55E','#A855F7','#EC4899',
]

function colourFor(driver) {
  return driver.colour || DRIVER_COLOURS[driver.carIdx % DRIVER_COLOURS.length]
}

// iRating badge — license-colored background
function iRatingBadge(driver) {
  const ir    = driver.iRating || 0
  const label = ir >= 1000 ? `${(ir / 1000).toFixed(1)}k` : (ir > 0 ? String(ir) : '--')
  const bg    = licenseColor(driver.licenseString || 'D')
  const pg    = driver.positionsGained
  const hasDelta = pg != null && pg !== 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
        background: bg, color: '#fff',
        padding: '1px 4px', borderRadius: 2,
        display: 'inline-block', letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {hasDelta && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
          color: pg > 0 ? '#22C55E' : '#E8001D',
          lineHeight: 1,
        }}>
          {pg > 0 ? '▲' : '▼'}{Math.abs(pg)}
        </span>
      )}
    </div>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

export const COLUMN_DEFS = {

  position: {
    label: 'Pos',
    width: 22,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
        color: driver.isPlayer ? '#F59E0B' : 'rgba(255,255,255,0.85)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.position}
      </span>
    ),
  },

  classPosition: {
    label: 'CL',
    width: 20,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.classPosition ?? '--'}
      </span>
    ),
  },

  colorDot: {
    label: '',
    width: 10,
    renderCell: (driver) => (
      <div style={{
        width: 3, height: 16, borderRadius: 2,
        background: colourFor(driver), margin: 'auto',
        flexShrink: 0,
      }} />
    ),
  },

  carNumber: {
    label: '#',
    width: 30,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700,
        color: colourFor(driver),
        display: 'block',
      }}>
        #{driver.carNumber ?? '--'}
      </span>
    ),
  },

  driverName: {
    label: 'Driver',
    width: null, // flex-1
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 13,
        fontWeight: driver.isPlayer ? 800 : 600,
        color: driver.isPlayer ? '#fff' : 'rgba(255,255,255,0.82)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block', letterSpacing: '0.01em',
      }}>
        {driver.driverName}
      </span>
    ),
  },

  license: {
    label: 'Lic',
    width: 48,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800,
        background: licenseColor(driver.licenseString),
        color: licenseTextColor(driver.licenseString),
        padding: '1px 5px', borderRadius: 2,
        display: 'inline-block', letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}>
        {driver.licenseString}{driver.safetyRating != null ? ` ${driver.safetyRating.toFixed(2)}` : ''}
      </span>
    ),
  },

  iRating: {
    label: 'iR',
    width: 52,
    renderCell: (driver) => iRatingBadge(driver),
  },

  trackStatus: {
    label: '',
    width: 28,
    renderCell: (driver) => {
      const surf = driver.trackSurface
      if (surf === 2 || surf === 3) return (
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.02em' }}>pit</span>
      )
      if (surf === 5) return (
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>
          L{driver.currentLap ?? '--'}
        </span>
      )
      return (
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.22)' }}>out</span>
      )
    },
  },

  carClass: {
    label: 'Class',
    width: 44,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600,
        color: 'rgba(255,255,255,0.45)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {driver.carClass || '--'}
      </span>
    ),
  },

  // Colored class badge — uses driver.colour (car class color from iRacing)
  carClassBadge: {
    label: 'CL',
    width: 36,
    renderCell: (driver) => {
      if (!driver.carClass) return null
      const bg = colourFor(driver)
      return (
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 800,
          background: bg + '33',
          color: bg,
          border: `1px solid ${bg}55`,
          padding: '1px 4px', borderRadius: 2,
          display: 'inline-block', letterSpacing: '0.04em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 34,
        }}>
          {driver.carClass}
        </span>
      )
    },
  },

  // gap: relative to the player car (used in Relative overlay)
  gap: {
    label: 'Gap',
    width: 52,
    renderCell: (driver) => {
      if (driver.isPlayer) {
        return (
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700,
            color: '#F59E0B',
            display: 'block', textAlign: 'right', letterSpacing: '0.06em',
          }}>
            YOU
          </span>
        )
      }
      const isAhead = driver.gapSeconds < 0
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
          color: isAhead ? '#2DD4BF' : '#F59E0B',
          display: 'block', textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.3s ease',
        }}>
          {formatGap(driver.gapSeconds)}
        </span>
      )
    },
  },

  // gapToLeader: gap to race leader (used in Standings overlay)
  gapToLeader: {
    label: 'Gap',
    width: 56,
    renderCell: (driver) => {
      const isLeader = driver.gapToLeader === 0
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
          color: isLeader ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)',
          display: 'block', textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {isLeader ? '—' : driver.gapToLeader != null ? formatGap(driver.gapToLeader) : '--'}
        </span>
      )
    },
  },

  intervalToNext: {
    label: 'Int',
    width: 52,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
        color: 'rgba(255,255,255,0.55)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.intervalToNext != null ? formatGap(driver.intervalToNext) : '--'}
      </span>
    ),
  },

  lastLapTime: {
    label: 'Last',
    width: 64,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
        color: 'rgba(255,255,255,0.65)',
        display: 'block', textAlign: 'right',
      }}>
        {formatLapTime(driver.lastLapTime)}
      </span>
    ),
  },

  bestLapTime: {
    label: 'Best',
    width: 64,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
        color: driver.isFastestLap ? '#C084FC' : 'rgba(255,255,255,0.55)',
        display: 'block', textAlign: 'right',
      }}>
        {formatLapTime(driver.bestLapTime)}
      </span>
    ),
  },

  estimatedLapTime: {
    label: 'Est',
    width: 64,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        display: 'block', textAlign: 'right',
      }}>
        {formatLapTime(driver.estimatedLapTime)}
      </span>
    ),
  },

  pitStatus: {
    label: 'Pit',
    width: 32,
    renderCell: (driver) => driver.onPitRoad ? (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800,
        color: '#F59E0B', background: 'rgba(245,158,11,0.15)',
        border: '1px solid rgba(245,158,11,0.3)',
        padding: '1px 4px', borderRadius: 2, display: 'inline-block',
        letterSpacing: '0.06em',
      }}>
        PIT
      </span>
    ) : null,
  },

  pitStopCount: {
    label: 'Pits',
    width: 22,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.pitStopCount ?? 0}
      </span>
    ),
  },

  fastRepairs: {
    label: 'FR',
    width: 20,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.fastRepairsUsed ?? 0}
      </span>
    ),
  },

  currentLap: {
    label: 'Lap',
    width: 28,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.currentLap ?? '--'}
      </span>
    ),
  },

  lapsCompleted: {
    label: 'Done',
    width: 28,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.lapsCompleted ?? '--'}
      </span>
    ),
  },

  tyreCompound: {
    label: 'Tyre',
    width: 24,
    renderCell: (driver) => {
      const raw = driver.tyreCompoundRaw
      const label = raw == null || raw === 0 ? '--' : String(raw)
      return (
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600,
          color: 'rgba(255,255,255,0.45)',
          display: 'block', textAlign: 'center',
        }}>
          {label}
        </span>
      )
    },
  },

  trackSurface: {
    label: 'Surf',
    width: 20,
    renderCell: (driver) => {
      const surf = driver.trackSurface
      // 5=on track, 2=pit lane, 3=pit stall, -1=unknown
      const color = surf === 5 ? '#22C55E' : (surf === 2 || surf === 3) ? '#F59E0B' : 'rgba(255,255,255,0.15)'
      return <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, margin: 'auto' }} />
    },
  },

  incidentCount: {
    label: 'Inc',
    width: 26,
    renderCell: (driver) => {
      const inc = driver.incidentCount ?? 0
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          color: inc > 0 ? '#F59E0B' : 'rgba(255,255,255,0.25)',
          display: 'block', textAlign: 'right',
        }}>
          {inc}x
        </span>
      )
    },
  },

  isFastestLap: {
    label: '',
    width: 14,
    renderCell: (driver) => driver.isFastestLap ? (
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: '#C084FC', margin: 'auto',
        boxShadow: '0 0 5px #C084FC',
      }} />
    ) : (
      <div style={{ width: 7, height: 7 }} />
    ),
  },

  positionsGained: {
    label: '+/-',
    width: 30,
    renderCell: (driver) => {
      const pg = driver.positionsGained
      if (pg == null) {
        return (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            display: 'block', textAlign: 'right',
          }}>
            —
          </span>
        )
      }
      const color = pg > 0 ? '#22C55E' : pg < 0 ? '#E8001D' : 'rgba(255,255,255,0.25)'
      const arrow = pg > 0 ? '▲' : pg < 0 ? '▼' : '·'
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          color, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1,
        }}>
          <span style={{ fontSize: 8 }}>{arrow}</span>
          {pg !== 0 ? Math.abs(pg) : ''}
        </span>
      )
    },
  },

  teamName: {
    label: 'Team',
    width: 72,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 500,
        color: 'rgba(255,255,255,0.35)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {driver.teamName || '--'}
      </span>
    ),
  },

}

// ─── Column groups (for picker UI) ───────────────────────────────────────────

export const COLUMN_GROUPS = [
  { label: 'Identity',      ids: ['position', 'classPosition', 'colorDot', 'carNumber', 'driverName', 'license', 'iRating', 'trackStatus', 'carClass', 'carClassBadge'] },
  { label: 'Gaps',          ids: ['gap', 'gapToLeader', 'intervalToNext'] },
  { label: 'Lap Times',     ids: ['lastLapTime', 'bestLapTime', 'estimatedLapTime'] },
  { label: 'Pit/Strategy',  ids: ['pitStatus', 'pitStopCount', 'fastRepairs', 'tyreCompound'] },
  { label: 'Progress',      ids: ['currentLap', 'lapsCompleted', 'incidentCount', 'positionsGained'] },
  { label: 'Status',        ids: ['trackSurface', 'isFastestLap'] },
  { label: 'Team',          ids: ['teamName'] },
]

// ─── Default column sets per overlay ─────────────────────────────────────────

export const DEFAULT_COLUMNS = {
  standings:   ['position', 'carNumber', 'driverName', 'positionsGained', 'iRating', 'gapToLeader', 'lastLapTime'],
  relative:    ['position', 'carNumber', 'driverName', 'trackStatus', 'iRating', 'gap'],
  leaderboard: ['position', 'colorDot', 'driverName', 'pitStatus', 'bestLapTime'],
}

// Overlays that support the column picker
export const COLUMN_PICKER_OVERLAYS = new Set(['standings', 'relative', 'leaderboard'])
