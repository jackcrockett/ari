/**
 * BattleOverlay — shows cars within 2 seconds ahead and behind the player.
 * Highlights the gap and whether it's closing or opening.
 */
import React, { useMemo, useRef, useEffect } from 'react'
import { useTelemetry, formatGap } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'

const BATTLE_THRESHOLD = 2.0   // seconds

// Keep a rolling history to detect gap trend (closing vs opening)
function useGapHistory(gapMap) {
  const histRef = useRef({})  // carIdx → [gap, gap, ...]

  useEffect(() => {
    Object.entries(gapMap).forEach(([idx, gap]) => {
      if (!histRef.current[idx]) histRef.current[idx] = []
      histRef.current[idx].push(gap)
      if (histRef.current[idx].length > 10) histRef.current[idx].shift()
    })
    // Prune stale entries
    Object.keys(histRef.current).forEach(idx => {
      if (!(idx in gapMap)) delete histRef.current[idx]
    })
  })

  return (carIdx) => {
    const hist = histRef.current[carIdx]
    if (!hist || hist.length < 3) return 0
    const recent = hist.slice(-3)
    return recent[2] - recent[0]   // positive = gap growing (pulling away), negative = closing
  }
}

function GapTrend({ trend, absGap }) {
  // Only show trend indicator when meaningfully closing/opening (>0.05s over 3 frames)
  const threshold = 0.03
  if (Math.abs(trend) < threshold) {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.18)', width: 12 }}>·</span>
  }
  const closing = trend < 0
  return (
    <span style={{
      fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800,
      color: closing ? '#ff2348' : '#22C55E',
      width: 12, textAlign: 'center', lineHeight: 1,
      transition: 'color 0.3s ease',
    }}>
      {closing ? '▼' : '▲'}
    </span>
  )
}

function BattleRow({ driver, isAhead, trend, absGap }) {
  const colour = driver.colour || '#64748B'
  const gapColor = isAhead ? '#2DD4BF' : '#F59E0B'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 10px',
      borderLeft: `3px solid ${colour}`,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: driver.isPlayer ? 'rgba(245,158,11,0.07)' : 'transparent',
      transition: 'background 0.25s ease',
    }}>
      {/* Position */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
        color: driver.isPlayer ? '#F59E0B' : 'rgba(255,255,255,0.5)',
        width: 20, textAlign: 'right', flexShrink: 0,
      }}>
        {driver.position}
      </span>

      {/* Driver name */}
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 13,
        fontWeight: driver.isPlayer ? 800 : 600,
        color: driver.isPlayer ? '#fff' : 'rgba(255,255,255,0.85)',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}>
        {driver.driverName}
      </span>

      {/* Car class badge */}
      {driver.carClass && (
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 7, fontWeight: 800,
          background: colour + '28',
          color: colour,
          border: `1px solid ${colour}44`,
          padding: '1px 3px', borderRadius: 2,
          letterSpacing: '0.05em', flexShrink: 0,
          maxWidth: 30, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {driver.carClass}
        </span>
      )}

      {/* Gap + trend */}
      {!driver.isPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <GapTrend trend={trend} absGap={absGap} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
            color: gapColor,
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.3s ease',
          }}>
            {formatGap(Math.abs(driver.gapSeconds))}
          </span>
        </div>
      )}
      {driver.isPlayer && (
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 800,
          color: '#F59E0B', letterSpacing: '0.08em', flexShrink: 0,
        }}>
          YOU
        </span>
      )}
    </div>
  )
}

// Separator bar between ahead/behind sections
function SectionLabel({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '2px 10px',
      background: 'rgba(255,255,255,0.02)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{
        fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700,
        color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export default function BattleOverlay() {
  const { data, connected } = useTelemetry()

  const { ahead, player, behind, gapMap } = useMemo(() => {
    if (!data?.relative) return { ahead: [], player: null, behind: [], gapMap: {} }

    const sorted = [...data.relative].sort((a, b) => a.gapSeconds - b.gapSeconds)
    const p = sorted.find(d => d.isPlayer)

    const map = {}
    sorted.forEach(d => { if (!d.isPlayer) map[d.carIdx] = d.gapSeconds })

    const a = sorted.filter(d => !d.isPlayer && d.gapSeconds < 0 && Math.abs(d.gapSeconds) <= BATTLE_THRESHOLD)
      .sort((x, y) => y.gapSeconds - x.gapSeconds)   // closest first (e.g. -0.3 before -1.8)
    const b = sorted.filter(d => !d.isPlayer && d.gapSeconds > 0 && d.gapSeconds <= BATTLE_THRESHOLD)
      .sort((x, y) => x.gapSeconds - y.gapSeconds)   // closest first (e.g. 0.3 before 1.8)

    return { ahead: a, player: p, behind: b, gapMap: map }
  }, [data])

  const getTrend = useGapHistory(gapMap)

  const isEmpty = ahead.length === 0 && behind.length === 0

  if (!data) {
    return (
      <div className="overlay" style={{ width: '100%', padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Waiting for iRacing...</span>
      </div>
    )
  }

  return (
      <div className="overlay" style={{ width: '100%' }}>
        <DragHandle overlayId="battle" label="Battle">
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700,
            color: connected ? '#22C55E' : '#F59E0B',
            letterSpacing: '0.1em',
            background: connected ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            padding: '1px 5px', borderRadius: 2,
          }}>
            {connected ? 'LIVE' : 'DEMO'}
          </span>
        </DragHandle>

        {isEmpty ? (
          <div style={{
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em',
            }}>
              No cars within {BATTLE_THRESHOLD}s
            </span>
          </div>
        ) : (
          <>
            {ahead.length > 0 && (
              <>
                <SectionLabel label="Ahead" />
                {ahead.map(d => (
                  <BattleRow
                    key={d.carIdx}
                    driver={d}
                    isAhead={true}
                    trend={getTrend(d.carIdx)}
                    absGap={Math.abs(d.gapSeconds)}
                  />
                ))}
              </>
            )}

            {/* Player row */}
            {player && (
              <BattleRow
                key={player.carIdx}
                driver={player}
                isAhead={false}
                trend={0}
                absGap={0}
              />
            )}

            {behind.length > 0 && (
              <>
                <SectionLabel label="Behind" />
                {behind.map(d => (
                  <BattleRow
                    key={d.carIdx}
                    driver={d}
                    isAhead={false}
                    trend={getTrend(d.carIdx)}
                    absGap={d.gapSeconds}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
  )
}
