import React from 'react'
import { COLUMN_DEFS } from '../../lib/columnDefs'

/**
 * DriverRow -- renders one driver row from an ordered list of column IDs.
 *
 * Props:
 *   driver   {object}   Driver data object from telemetry
 *   columns  {string[]} Ordered array of column IDs from columnDefs
 *   isLast   {boolean}  Suppress bottom border on the last row
 *   data     {object}   Full telemetry data (passed through to renderCell)
 */
export default function DriverRow({ driver, columns, isLast, data }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '4px 10px',
      gap: 6,
      background: driver.isPlayer ? 'rgba(232,0,29,0.08)' : 'transparent',
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
      borderLeft: driver.isPlayer ? '2px solid #E8001D' : '2px solid transparent',
    }}>
      {columns.map(colId => {
        const def = COLUMN_DEFS[colId]
        if (!def) return null
        const isFlex = def.width === null
        return (
          <div
            key={colId}
            style={{
              width:     isFlex ? undefined : def.width,
              flex:      isFlex ? 1 : undefined,
              flexShrink: isFlex ? 1 : 0,
              minWidth:  isFlex ? 50 : undefined,
              overflow:  isFlex ? 'hidden' : undefined,
              display:   'flex',
              alignItems: 'center',
            }}
          >
            {def.renderCell(driver, data)}
          </div>
        )
      })}
    </div>
  )
}
