import React, { useState } from 'react'
import { useTelemetry, formatLapTime } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

function Stat({ label, mine, theirs, lowerBetter = false }) {
  const mineN   = parseFloat(mine)
  const theirsN = parseFloat(theirs)
  const mineWins  = !isNaN(mineN) && !isNaN(theirsN) && (lowerBetter ? mineN < theirsN : mineN > theirsN)
  const theirWins = !isNaN(mineN) && !isNaN(theirsN) && (lowerBetter ? theirsN < mineN : theirsN > mineN)
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: mineWins ? '#22C55E' : '#fff', width: 70, textAlign: 'right' }}>{mine}</span>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', flex: 1, textAlign: 'center', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: theirWins ? '#22C55E' : 'rgba(255,255,255,0.6)', width: 70 }}>{theirs}</span>
    </div>
  )
}

export default function HeadToHeadOverlay() {
  const { data } = useTelemetry()
  const [pinnedIdx, setPinnedIdx] = useState(null)

  const drivers  = data?.relative ?? []
  const player   = drivers.find(d => d.isPlayer)
  const standings = data?.standings ?? []

  // Pinned target or default to car immediately ahead
  const ahead   = drivers.filter(d => !d.isPlayer && d.gapSeconds < 0)
  const target  = pinnedIdx != null
    ? standings.find(d => d.carIdx === pinnedIdx)
    : (ahead.length ? ahead[ahead.length - 1] : standings[0])

  if (!player || !target || target === player) {
    return (
      <ResizeHandles overlayId="headtohead">
        <div className="overlay" style={{ width: 290 }}>
          <DragHandle overlayId="headtohead" label="Head to Head" />
          <div style={{ padding: '10px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            No target driver
          </div>
        </div>
      </ResizeHandles>
    )
  }

  const gap = Math.abs(target.gapSeconds)
  const gapSign = target.gapSeconds < 0 ? 'ahead' : 'behind'

  return (
    <ResizeHandles overlayId="headtohead">
      <div className="overlay" style={{ width: 290 }}>
        <DragHandle overlayId="headtohead" label="Head to Head" />

        {/* Driver headers */}
        <div style={{ display: 'flex', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: 8 }}>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600, color: '#E8001D' }}>YOU</div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>P{player.position}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600, color: target.colour, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {target.driverName}
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>P{target.position}</div>
          </div>
        </div>

        {/* Gap banner */}
        <div style={{ padding: '4px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: gap < 1 ? '#F59E0B' : '#fff' }}>
            {gap.toFixed(3)}s {gapSign}
          </span>
        </div>

        {/* Stats */}
        <div style={{ paddingBottom: 4 }}>
          <Stat label="Best Lap"  mine={formatLapTime(player.bestLapTime)}  theirs={formatLapTime(target.bestLapTime)} lowerBetter />
          <Stat label="Last Lap"  mine={formatLapTime(player.lastLapTime)}  theirs={formatLapTime(target.lastLapTime)} lowerBetter />
          <Stat label="iRating"   mine={player.iRating}  theirs={target.iRating} />
          <Stat label="License"   mine={player.licenseString} theirs={target.licenseString} />
        </div>

        {/* Pin picker */}
        <div style={{ padding: '4px 10px 6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginBottom: 3 }}>PIN TARGET</div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <div
              onClick={() => setPinnedIdx(null)}
              style={{ fontFamily: 'var(--font-data)', fontSize: 8, padding: '2px 5px', borderRadius: 3, cursor: 'pointer',
                background: pinnedIdx == null ? 'rgba(232,0,29,0.2)' : 'rgba(255,255,255,0.05)',
                color: pinnedIdx == null ? '#E8001D' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${pinnedIdx == null ? 'rgba(232,0,29,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
              AUTO
            </div>
            {standings.filter(d => !d.isPlayer).slice(0, 8).map(d => (
              <div key={d.carIdx}
                onClick={() => setPinnedIdx(d.carIdx)}
                style={{ fontFamily: 'var(--font-data)', fontSize: 8, padding: '2px 5px', borderRadius: 3, cursor: 'pointer',
                  background: pinnedIdx === d.carIdx ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                  color: pinnedIdx === d.carIdx ? '#3B82F6' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${pinnedIdx === d.carIdx ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                P{d.position}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ResizeHandles>
  )
}
