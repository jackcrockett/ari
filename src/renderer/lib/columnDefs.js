/**
 * columnDefs.js -- single source of truth for all driver-row column definitions.
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
import { formatGap, formatLapTime, licenseColor } from '../hooks/useTelemetry'

export const DRIVER_COLOURS = [
  '#F59E0B','#64748B','#3B82F6','#FF6B35',
  '#E8001D','#22C55E','#A855F7','#EC4899',
]

function colourFor(driver) {
  return driver.colour || DRIVER_COLOURS[driver.carIdx % DRIVER_COLOURS.length]
}

// ─── Column definitions ───────────────────────────────────────────────────────

export const COLUMN_DEFS = {

  position: {
    label: 'Pos',
    width: 20,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 600,
        color: driver.isPlayer ? '#E8001D' : 'rgba(255,255,255,0.3)',
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
        fontFamily: 'var(--font-data)', fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.classPosition ?? '--'}
      </span>
    ),
  },

  colorDot: {
    label: '',
    width: 12,
    renderCell: (driver) => (
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: colourFor(driver), margin: 'auto',
      }} />
    ),
  },

  carNumber: {
    label: '#',
    width: 28,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        display: 'block',
      }}>
        {driver.carNumber ?? '--'}
      </span>
    ),
  },

  driverName: {
    label: 'Driver',
    width: null, // flex-1
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 12,
        fontWeight: driver.isPlayer ? 600 : 400,
        color: driver.isPlayer ? '#fff' : 'rgba(255,255,255,0.72)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {driver.driverName}
      </span>
    ),
  },

  license: {
    label: 'Lic',
    width: 26,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
        background: licenseColor(driver.licenseString),
        color: '#fff', padding: '1px 3px', borderRadius: 2,
        display: 'inline-block',
      }}>
        {driver.licenseString}
      </span>
    ),
  },

  iRating: {
    label: 'iR',
    width: 36,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.iRating >= 1000 ? `${(driver.iRating / 1000).toFixed(1)}k` : driver.iRating}
      </span>
    ),
  },

  carClass: {
    label: 'Class',
    width: 44,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9,
        color: 'rgba(255,255,255,0.4)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {driver.carClass || '--'}
      </span>
    ),
  },

  // gap: relative to the player car (used in Relative overlay)
  gap: {
    label: 'Gap',
    width: 54,
    renderCell: (driver) => {
      if (driver.isPlayer) {
        return (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            display: 'block', textAlign: 'right',
          }}>
            YOU
          </span>
        )
      }
      const isAhead = driver.gapSeconds < 0
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
          color: isAhead ? '#94D2BD' : '#F59E0B',
          display: 'block', textAlign: 'right',
        }}>
          {formatGap(driver.gapSeconds)}
        </span>
      )
    },
  },

  // gapToLeader: gap to race leader (used in Standings overlay)
  gapToLeader: {
    label: 'Gap',
    width: 58,
    renderCell: (driver) => {
      const isLeader = driver.gapToLeader === 0
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: isLeader ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
          display: 'block', textAlign: 'right',
        }}>
          {isLeader ? 'Leader' : driver.gapToLeader != null ? formatGap(driver.gapToLeader) : '--'}
        </span>
      )
    },
  },

  intervalToNext: {
    label: 'Int',
    width: 54,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        display: 'block', textAlign: 'right',
      }}>
        {driver.intervalToNext != null ? formatGap(driver.intervalToNext) : '--'}
      </span>
    ),
  },

  lastLapTime: {
    label: 'Last',
    width: 62,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        display: 'block', textAlign: 'right',
      }}>
        {formatLapTime(driver.lastLapTime)}
      </span>
    ),
  },

  bestLapTime: {
    label: 'Best',
    width: 62,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: driver.isFastestLap ? '#C084FC' : 'rgba(255,255,255,0.5)',
        display: 'block', textAlign: 'right',
      }}>
        {formatLapTime(driver.bestLapTime)}
      </span>
    ),
  },

  estimatedLapTime: {
    label: 'Est',
    width: 62,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        display: 'block', textAlign: 'right',
      }}>
        {formatLapTime(driver.estimatedLapTime)}
      </span>
    ),
  },

  pitStatus: {
    label: 'Pit',
    width: 30,
    renderCell: (driver) => driver.onPitRoad ? (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700,
        color: '#F59E0B', background: 'rgba(245,158,11,0.12)',
        padding: '1px 4px', borderRadius: 2, display: 'inline-block',
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
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
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
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'rgba(255,255,255,0.45)',
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
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'rgba(255,255,255,0.45)',
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
          fontFamily: 'var(--font-data)', fontSize: 9,
          color: 'rgba(255,255,255,0.4)',
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
    width: 24,
    renderCell: (driver) => {
      const inc = driver.incidentCount ?? 0
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
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
        boxShadow: '0 0 4px #C084FC',
      }} />
    ) : (
      <div style={{ width: 7, height: 7 }} />
    ),
  },

  positionsGained: {
    label: '+/-',
    width: 28,
    renderCell: (driver) => {
      const pg = driver.positionsGained
      if (pg == null) {
        return (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            display: 'block', textAlign: 'right',
          }}>
            --
          </span>
        )
      }
      const color = pg > 0 ? '#22C55E' : pg < 0 ? '#E8001D' : 'rgba(255,255,255,0.25)'
      const prefix = pg > 0 ? '+' : ''
      return (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color, display: 'block', textAlign: 'right',
        }}>
          {prefix}{pg}
        </span>
      )
    },
  },

  teamName: {
    label: 'Team',
    width: 72,
    renderCell: (driver) => (
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 9,
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
  { label: 'Identity',      ids: ['position', 'classPosition', 'colorDot', 'carNumber', 'driverName', 'license', 'iRating', 'carClass'] },
  { label: 'Gaps',          ids: ['gap', 'gapToLeader', 'intervalToNext'] },
  { label: 'Lap Times',     ids: ['lastLapTime', 'bestLapTime', 'estimatedLapTime'] },
  { label: 'Pit/Strategy',  ids: ['pitStatus', 'pitStopCount', 'fastRepairs', 'tyreCompound'] },
  { label: 'Progress',      ids: ['currentLap', 'lapsCompleted', 'incidentCount', 'positionsGained'] },
  { label: 'Status',        ids: ['trackSurface', 'isFastestLap'] },
  { label: 'Team',          ids: ['teamName'] },
]

// ─── Default column sets per overlay ─────────────────────────────────────────

export const DEFAULT_COLUMNS = {
  standings:   ['position', 'colorDot', 'driverName', 'pitStatus', 'gapToLeader'],
  relative:    ['position', 'colorDot', 'license', 'driverName', 'iRating', 'gap'],
  leaderboard: ['position', 'colorDot', 'driverName', 'pitStatus', 'bestLapTime'],
}

// Overlays that support the column picker
export const COLUMN_PICKER_OVERLAYS = new Set(['standings', 'relative', 'leaderboard'])
