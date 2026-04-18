import React from 'react'
import { COLUMN_DEFS } from '../../lib/columnDefs'
import { VARIANTS, DEFAULT_VARIANT } from '../../lib/overlayVariants'

const DRIVER_COLOURS = ['#F59E0B','#64748B','#3B82F6','#FF6B35','#E8001D','#22C55E','#A855F7','#EC4899']

/**
 * DriverRow -- renders one driver row from an ordered list of column IDs.
 *
 * Props:
 *   driver   {object}   Driver data object from telemetry
 *   columns  {string[]} Ordered array of column IDs from columnDefs
 *   isLast   {boolean}  Suppress bottom border on the last row
 *   data     {object}   Full telemetry data (passed through to renderCell)
 *   variant  {string}   Style variant id from overlayVariants (default: 'default')
 */
export default function DriverRow({ driver, columns, isLast, data, variant = DEFAULT_VARIANT }) {
  const vt     = VARIANTS[variant] || VARIANTS.default
  const colour = driver.colour || DRIVER_COLOURS[driver.carIdx % DRIVER_COLOURS.length]

  const leftAccent = vt.leftAccentMode === 'all'
    ? colour
    : driver.isPlayer ? '#E8001D' : 'transparent'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: `${vt.rowPaddingV}px ${vt.rowPaddingH}px`,
      gap: vt.gap,
      background: driver.isPlayer ? `rgba(232,0,29,${vt.playerBgOpacity})` : 'transparent',
      borderBottom: isLast || !vt.showRowBorder ? 'none' : '1px solid rgba(255,255,255,0.04)',
      borderLeft: `2px solid ${leftAccent}`,
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
