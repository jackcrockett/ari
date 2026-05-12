/**
 * Static mock previews shown in the OverlaysPage detail panel.
 * Purpose: show users what data they'll see before enabling an overlay.
 * All data is hardcoded — no live telemetry.
 */

import React from 'react'

// ── Shared primitives ─────────────────────────────────────────────────────────

const mono  = 'var(--font-mono)'
const ui    = 'var(--font-ui)'
const data  = 'var(--font-data)'
const RED   = '#E8001D'
const GREEN = '#22C55E'
const DIM   = 'rgba(255,255,255,0.25)'
const MID   = 'rgba(255,255,255,0.55)'
const FULL  = 'rgba(255,255,255,0.85)'

function Wrap({ children, style }) {
  return (
    <div style={{
      background: '#0c0c0e',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 6,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: mono,
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 9, fontFamily: data, color: DIM, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Bar({ pct, color = GREEN, height = 8 }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 2, height, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'none' }} />
    </div>
  )
}

function Pill({ children, bg, color }) {
  return (
    <span style={{
      fontFamily: data, fontSize: 9, fontWeight: 700,
      background: bg, color, padding: '1px 5px', borderRadius: 2,
      display: 'inline-block', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ── Per-overlay mocks ─────────────────────────────────────────────────────────

function MockRelative() {
  const rows = [
    { pos: 3,  name: 'M. Hamilton',   lic: 'A 4.35', ir: '8.4k', gap: '-2.4',  player: false },
    { pos: 4,  name: 'C. Leclerc',    lic: 'A 3.91', ir: '7.1k', gap: '-0.8',  player: false },
    { pos: 5,  name: 'YOU',           lic: 'B 2.20', ir: '2.8k', gap: '±0.0',  player: true  },
    { pos: 6,  name: 'L. Norris',     lic: 'A 3.10', ir: '4.4k', gap: '+1.2',  player: false },
    { pos: 7,  name: 'O. Piastri',    lic: 'B 1.95', ir: '3.2k', gap: '+3.8',  player: false },
  ]
  return (
    <Wrap>
      <SectionLabel>Relative</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rows.map(r => (
          <div key={r.pos} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 6px', borderRadius: 4,
            background: r.player ? 'rgba(232,0,29,0.12)' : 'transparent',
            borderLeft: `2px solid ${r.player ? RED : 'transparent'}`,
          }}>
            <span style={{ fontSize: 10, color: DIM, width: 14, textAlign: 'right', fontFamily: mono }}>{r.pos}</span>
            <Pill bg={r.player ? '#E8001D' : '#1A5FA8'} color="#fff">{r.lic}</Pill>
            <span style={{ fontSize: 11, color: r.player ? '#fff' : MID, flex: 1, fontFamily: ui }}>{r.name}</span>
            <Pill bg="#ffffff" color="#000">{r.ir}</Pill>
            <span style={{ fontSize: 11, color: r.gap.startsWith('-') ? GREEN : r.gap.startsWith('+') ? '#F59E0B' : '#fff', fontFamily: mono, width: 36, textAlign: 'right' }}>{r.gap}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockStandings() {
  const rows = [
    { pos: 1, name: 'M. Hamilton',  gap: 'Leader',  pit: false },
    { pos: 2, name: 'C. Leclerc',   gap: '+12.4',   pit: false },
    { pos: 3, name: 'YOU',          gap: '+24.1',   pit: false, player: true },
    { pos: 4, name: 'L. Norris',    gap: '+31.8',   pit: true  },
    { pos: 5, name: 'O. Piastri',   gap: '+48.2',   pit: false },
  ]
  return (
    <Wrap>
      <SectionLabel>Standings</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rows.map(r => (
          <div key={r.pos} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 6px', borderRadius: 4,
            background: r.player ? 'rgba(232,0,29,0.12)' : 'transparent',
          }}>
            <span style={{ fontSize: 10, color: DIM, width: 14, textAlign: 'right', fontFamily: mono }}>{r.pos}</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.player ? RED : '#3B82F6', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: r.player ? '#fff' : MID, flex: 1, fontFamily: ui }}>{r.name}</span>
            {r.pit && <Pill bg="rgba(245,158,11,0.2)" color="#F59E0B">PIT</Pill>}
            <span style={{ fontSize: 11, color: r.pos === 1 ? GREEN : DIM, fontFamily: mono }}>{r.gap}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockBattle() {
  const rows = [
    { name: 'C. Leclerc', gap: '-0.8s', closing: true  },
    { name: 'YOU',         gap: '±0.0', closing: false, player: true },
    { name: 'L. Norris',  gap: '+1.1s', closing: true  },
  ]
  return (
    <Wrap>
      <SectionLabel>Battle — cars within 2s</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 8px', borderRadius: 5,
            background: r.player ? 'rgba(232,0,29,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${r.player ? 'rgba(232,0,29,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <span style={{ fontSize: 12, color: r.player ? '#fff' : MID, flex: 1, fontFamily: ui }}>{r.name}</span>
            {r.closing && !r.player && <span style={{ fontSize: 9, color: RED, fontFamily: data }}>▲ CLOSING</span>}
            <span style={{ fontSize: 12, color: r.player ? '#fff' : r.gap.startsWith('-') ? GREEN : '#F59E0B', fontFamily: mono }}>{r.gap}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockRadar() {
  return (
    <Wrap style={{ alignItems: 'center' }}>
      <SectionLabel>Proximity Radar</SectionLabel>
      <svg width={120} height={120} viewBox="0 0 120 120">
        {[40, 28, 16].map(r => (
          <circle key={r} cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        ))}
        <line x1={60} y1={0} x2={60} y2={120} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <line x1={0} y1={60} x2={120} y2={60} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        {/* Player car */}
        <rect x={54} y={52} width={12} height={16} rx={2} fill={RED} />
        {/* Car ahead */}
        <rect x={54} y={20} width={12} height={16} rx={2} fill="rgba(255,255,255,0.5)" />
        {/* Car right */}
        <rect x={84} y={50} width={12} height={16} rx={2} fill="#F59E0B" />
      </svg>
      <span style={{ fontSize: 10, color: DIM, fontFamily: ui }}>Red = you · White = nearby · Amber = close</span>
    </Wrap>
  )
}

function MockBlindspot() {
  return (
    <Wrap>
      <SectionLabel>Blind Spot Monitor</SectionLabel>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        {[
          { side: 'LEFT',  active: false },
          { side: 'RIGHT', active: true  },
        ].map(({ side, active }) => (
          <div key={side} style={{
            flex: 1, padding: '12px 8px', borderRadius: 6, textAlign: 'center',
            background: active ? 'rgba(232,0,29,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active ? 'rgba(232,0,29,0.4)' : 'rgba(255,255,255,0.07)'}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{side === 'LEFT' ? '◄' : '►'}</div>
            <div style={{ fontSize: 9, fontFamily: data, color: active ? RED : DIM }}>{side}</div>
            {active && <div style={{ fontSize: 8, color: RED, fontFamily: data, marginTop: 2 }}>CAR ALONGSIDE</div>}
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockFlags() {
  const flags = [
    { color: GREEN,     label: 'GREEN',     active: true  },
    { color: '#F59E0B', label: 'YELLOW',    active: false },
    { color: '#ffffff', label: 'WHITE',     active: false },
    { color: '#111',    label: 'CHECKERED', active: false, border: true },
  ]
  return (
    <Wrap>
      <SectionLabel>Race Flags</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {flags.map(f => (
          <div key={f.label} style={{
            padding: '8px 10px', borderRadius: 5, textAlign: 'center',
            background: f.active ? f.color + '22' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${f.active ? f.color : 'rgba(255,255,255,0.06)'}`,
          }}>
            <div style={{ width: 20, height: 14, borderRadius: 2, background: f.color, margin: '0 auto 4px', border: f.border ? '1px solid rgba(255,255,255,0.2)' : 'none',
              backgroundImage: f.label === 'CHECKERED' ? 'repeating-conic-gradient(#fff 0% 25%,#111 0% 50%) 0 0/10px 10px' : undefined }} />
            <div style={{ fontSize: 8, fontFamily: data, color: f.active ? f.color : DIM, letterSpacing: '0.1em' }}>{f.label}</div>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockDelta() {
  const delta = 0.18  // positive = behind reference
  return (
    <Wrap>
      <SectionLabel>Lap Delta</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22, fontFamily: mono, color: delta > 0 ? '#F59E0B' : GREEN, fontWeight: 700, minWidth: 70 }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
        </span>
        <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{
            position: 'absolute',
            left: delta > 0 ? '50%' : `calc(50% - ${Math.min(Math.abs(delta) / 0.5, 1) * 50}%)`,
            width: `${Math.min(Math.abs(delta) / 0.5, 1) * 50}%`,
            height: '100%',
            background: delta > 0 ? '#F59E0B' : GREEN,
          }} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: DIM, fontFamily: ui }}>vs. best session lap</div>
    </Wrap>
  )
}

function MockInputs() {
  const items = [
    { label: 'THROTTLE', pct: 0.82, color: GREEN    },
    { label: 'BRAKE',    pct: 0.00, color: RED       },
    { label: 'CLUTCH',   pct: 0.00, color: '#A855F7' },
  ]
  return (
    <Wrap>
      <SectionLabel>Inputs + Steering</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(({ label, pct, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 8, fontFamily: data, color: DIM, width: 56, letterSpacing: '0.08em' }}>{label}</span>
            <Bar pct={pct} color={color} height={10} />
            <span style={{ fontSize: 10, fontFamily: mono, color: MID, width: 32, textAlign: 'right' }}>{Math.round(pct * 100)}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 8, fontFamily: data, color: DIM, width: 56, letterSpacing: '0.08em' }}>STEERING</span>
        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ position: 'absolute', left: '50%', width: '12%', height: '100%', background: '#38BDF8', borderRadius: 1 }} />
        </div>
        <span style={{ fontSize: 10, fontFamily: mono, color: MID, width: 32, textAlign: 'right' }}>+8°</span>
      </div>
    </Wrap>
  )
}

function MockGforce() {
  return (
    <Wrap style={{ alignItems: 'center' }}>
      <SectionLabel>G-Force Plot</SectionLabel>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={48} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <circle cx={55} cy={55} r={32} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <circle cx={55} cy={55} r={16} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <line x1={7} y1={55} x2={103} y2={55} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <line x1={55} y1={7} x2={55} y2={103} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        {/* Trace dots */}
        {[[55,40],[57,38],[62,36],[66,35],[68,36]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={2} fill={`rgba(232,0,29,${0.3 + i * 0.15})`} />
        ))}
        {/* Current position */}
        <circle cx={68} cy={36} r={4} fill={RED} />
        <text x={2} y={58} fontSize={8} fill={DIM}>L</text>
        <text x={100} y={58} fontSize={8} fill={DIM}>R</text>
        <text x={50} y={10} fontSize={8} fill={DIM}>ACC</text>
        <text x={46} y={106} fontSize={8} fill={DIM}>BRK</text>
      </svg>
    </Wrap>
  )
}

function MockSessionTimer() {
  return (
    <Wrap style={{ alignItems: 'center', padding: '20px 24px' }}>
      <SectionLabel>Session Timer</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 32, fontFamily: mono, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
          24:12
        </div>
        <div style={{ fontSize: 10, fontFamily: data, color: DIM, letterSpacing: '0.1em' }}>REMAINING</div>
        <div style={{ fontSize: 11, fontFamily: mono, color: MID, marginTop: 4 }}>Lap 8 / ≈35</div>
      </div>
    </Wrap>
  )
}

function MockHstandings() {
  const drivers = [
    { pos: 1, name: 'Hamilton',   color: '#F59E0B' },
    { pos: 2, name: 'Leclerc',    color: '#3B82F6' },
    { pos: 3, name: 'YOU',        color: RED, player: true },
    { pos: 4, name: 'Norris',     color: '#22C55E' },
    { pos: 5, name: 'Piastri',    color: '#A855F7' },
  ]
  return (
    <Wrap style={{ padding: '10px 12px' }}>
      <SectionLabel>Horizontal Standings Strip</SectionLabel>
      <div style={{ display: 'flex', gap: 4, overflowX: 'hidden' }}>
        {drivers.map(d => (
          <div key={d.pos} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '5px 8px', borderRadius: 4,
            background: d.player ? 'rgba(232,0,29,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${d.player ? 'rgba(232,0,29,0.3)' : 'rgba(255,255,255,0.06)'}`,
            flex: 1, minWidth: 0,
          }}>
            <span style={{ fontSize: 8, color: DIM, fontFamily: mono }}>{d.pos}</span>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: d.color }} />
            <span style={{ fontSize: 8, color: d.player ? '#fff' : MID, fontFamily: ui, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.name}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockLeaderboard() {
  const rows = [
    { pos: 1, name: 'Hamilton',  best: '1:40.3', color: '#F59E0B' },
    { pos: 2, name: 'Leclerc',   best: '1:40.7', color: '#3B82F6' },
    { pos: 3, name: 'YOU',       best: '1:41.2', color: RED, player: true },
    { pos: 4, name: 'Norris',    best: '1:41.5', color: GREEN },
  ]
  return (
    <Wrap>
      <SectionLabel>Leaderboard</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rows.map(r => (
          <div key={r.pos} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 8px', borderRadius: 4,
            background: r.player ? 'rgba(232,0,29,0.1)' : 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 700, color: '#000' }}>{r.pos}</span>
            </div>
            <span style={{ fontSize: 11, color: r.player ? '#fff' : MID, flex: 1, fontFamily: ui }}>{r.name}</span>
            <span style={{ fontSize: 10, fontFamily: mono, color: DIM }}>{r.best}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockHeadToHead() {
  const stats = [
    { label: 'Gap',      you: '±0.0',    them: '-1.2s' },
    { label: 'Best Lap', you: '1:41.2',  them: '1:40.7' },
    { label: 'iRating',  you: '2.8k',    them: '3.4k' },
    { label: 'Laps',     you: '12',      them: '12' },
  ]
  return (
    <Wrap>
      <SectionLabel>Head to Head</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '3px 8px', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontFamily: data, color: RED, textAlign: 'center', letterSpacing: '0.06em' }}>YOU</span>
        <span />
        <span style={{ fontSize: 9, fontFamily: data, color: '#3B82F6', textAlign: 'center', letterSpacing: '0.06em' }}>LECLERC</span>
        {stats.map(({ label, you, them }) => (
          <React.Fragment key={label}>
            <span style={{ fontSize: 11, fontFamily: mono, color: FULL, textAlign: 'right' }}>{you}</span>
            <span style={{ fontSize: 8, fontFamily: data, color: DIM, textAlign: 'center', letterSpacing: '0.06em' }}>{label}</span>
            <span style={{ fontSize: 11, fontFamily: mono, color: MID, textAlign: 'left' }}>{them}</span>
          </React.Fragment>
        ))}
      </div>
    </Wrap>
  )
}

function MockOvertakeAlert() {
  return (
    <Wrap style={{ padding: '14px 18px' }}>
      <SectionLabel>Overtake Alert</SectionLabel>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(232,0,29,0.12)', border: '1px solid rgba(232,0,29,0.35)',
        borderRadius: 6, padding: '10px 14px',
      }}>
        <span style={{ fontSize: 16 }}>⚠</span>
        <div>
          <div style={{ fontSize: 11, fontFamily: ui, color: '#fff', fontWeight: 600 }}>LMP1 APPROACHING</div>
          <div style={{ fontSize: 10, fontFamily: mono, color: RED }}>−4.2s and closing</div>
        </div>
      </div>
    </Wrap>
  )
}

function MockLapLog() {
  const laps = [
    { n: 9,  time: '1:41.847', delta: '+0.647', best: false },
    { n: 10, time: '1:41.408', delta: '+0.208', best: false },
    { n: 11, time: '1:41.200', delta: '±0.000', best: true  },
    { n: 12, time: '1:41.532', delta: '+0.332', best: false },
  ]
  return (
    <Wrap>
      <SectionLabel>Lap Log</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', gap: 8, padding: '2px 6px' }}>
          <span style={{ fontSize: 8, color: DIM, fontFamily: data, width: 20 }}>LAP</span>
          <span style={{ fontSize: 8, color: DIM, fontFamily: data, flex: 1 }}>TIME</span>
          <span style={{ fontSize: 8, color: DIM, fontFamily: data, width: 48, textAlign: 'right' }}>DELTA</span>
        </div>
        {laps.map(l => (
          <div key={l.n} style={{
            display: 'flex', gap: 8, padding: '4px 6px', borderRadius: 3,
            background: l.best ? 'rgba(168,85,247,0.1)' : 'transparent',
            border: `1px solid ${l.best ? 'rgba(168,85,247,0.25)' : 'transparent'}`,
          }}>
            <span style={{ fontSize: 10, fontFamily: mono, color: DIM, width: 20 }}>{l.n}</span>
            <span style={{ fontSize: 10, fontFamily: mono, color: l.best ? '#A855F7' : MID, flex: 1 }}>{l.time}</span>
            <span style={{ fontSize: 10, fontFamily: mono, color: l.best ? '#A855F7' : DIM, width: 48, textAlign: 'right' }}>{l.delta}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockLapGraph() {
  const times = [41.8, 41.4, 41.2, 41.5, 41.3, 41.9, 41.1, 41.6]
  const min = Math.min(...times), max = Math.max(...times) + 0.2
  const W = 220, H = 70
  const pts = times.map((t, i) => [
    (i / (times.length - 1)) * W,
    H - ((t - min) / (max - min)) * (H - 10) - 5,
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  return (
    <Wrap>
      <SectionLabel>Lap Graph</SectionLabel>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lgfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity="0.25" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={d + ` L${W},${H} L0,${H} Z`} fill="url(#lgfill)" />
        <path d={d} fill="none" stroke={RED} strokeWidth={1.5} strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill={i === 6 ? '#A855F7' : RED} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontFamily: mono, color: DIM }}>Lap 9</span>
        <span style={{ fontSize: 9, fontFamily: mono, color: '#A855F7' }}>Best: 1:41.1</span>
        <span style={{ fontSize: 9, fontFamily: mono, color: DIM }}>Lap 16</span>
      </div>
    </Wrap>
  )
}

function MockLapSpread() {
  const bars = [
    { label: '41.0', count: 1 },
    { label: '41.2', count: 3 },
    { label: '41.4', count: 6 },
    { label: '41.6', count: 4 },
    { label: '41.8', count: 2 },
    { label: '42.0', count: 1 },
  ]
  const peak = Math.max(...bars.map(b => b.count))
  return (
    <Wrap>
      <SectionLabel>Lap Time Distribution</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
        {bars.map(b => (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', background: RED, borderRadius: '2px 2px 0 0', height: `${(b.count / peak) * 48}px`, opacity: 0.7 + (b.count / peak) * 0.3 }} />
            <span style={{ fontSize: 7, fontFamily: mono, color: DIM, whiteSpace: 'nowrap' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockFuel() {
  const level = 42.3, total = 60
  const stats = [
    { label: 'FUEL LEVEL',    value: '42.3 L' },
    { label: 'PER LAP',       value: '2.41 L' },
    { label: 'LAPS REMAIN',   value: '17.5' },
    { label: 'LAPS TO FINISH',value: '18' },
    { label: 'NEEDED',        value: '0.0 L' },
  ]
  return (
    <Wrap>
      <SectionLabel>Fuel Calculator</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Bar pct={level / total} color={level / total > 0.3 ? GREEN : RED} height={12} />
        <span style={{ fontSize: 11, fontFamily: mono, color: FULL, flexShrink: 0 }}>{level}L</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 8, fontFamily: data, color: DIM, letterSpacing: '0.06em' }}>{label}</span>
            <span style={{ fontSize: 11, fontFamily: mono, color: FULL }}>{value}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockTyres() {
  const tyres = [
    { pos: 'LF', tempL: 88, tempM: 91, tempR: 87, wear: 0.82 },
    { pos: 'RF', tempL: 90, tempM: 94, tempR: 89, wear: 0.79 },
    { pos: 'LR', tempL: 84, tempM: 88, tempR: 85, wear: 0.88 },
    { pos: 'RR', tempL: 86, tempM: 90, tempR: 87, wear: 0.85 },
  ]
  function tempColor(t) {
    if (t > 95) return '#E8001D'
    if (t > 85) return '#22C55E'
    return '#38BDF8'
  }
  return (
    <Wrap>
      <SectionLabel>Tyre Temperatures &amp; Wear</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {tyres.map(t => (
          <div key={t.pos} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '8px' }}>
            <div style={{ fontSize: 9, fontFamily: data, color: DIM, marginBottom: 6 }}>{t.pos}</div>
            <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
              {[t.tempL, t.tempM, t.tempR].map((temp, i) => (
                <div key={i} style={{ flex: 1, background: tempColor(temp), borderRadius: 2, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 7, fontFamily: mono, color: '#000', fontWeight: 700 }}>{temp}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, fontFamily: data, color: DIM }}>WEAR</span>
              <Bar pct={t.wear} color={t.wear > 0.5 ? GREEN : '#F59E0B'} height={5} />
              <span style={{ fontSize: 8, fontFamily: mono, color: MID }}>{Math.round(t.wear * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockBoostBox() {
  return (
    <Wrap>
      <SectionLabel>ERS / Boost</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontFamily: data, color: DIM, letterSpacing: '0.08em' }}>BATTERY</span>
            <span style={{ fontSize: 11, fontFamily: mono, color: '#A855F7' }}>68%</span>
          </div>
          <Bar pct={0.68} color="#A855F7" height={10} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontFamily: data, color: DIM, letterSpacing: '0.08em' }}>DEPLOY THIS LAP</span>
            <span style={{ fontSize: 11, fontFamily: mono, color: '#38BDF8' }}>35%</span>
          </div>
          <Bar pct={0.35} color="#38BDF8" height={10} />
        </div>
      </div>
    </Wrap>
  )
}

function MockRaceSchedule() {
  const rows = [
    { lap: 10, action: 'Pit open',   note: 'Earliest pit lap' },
    { lap: 14, action: 'Optimal pit',note: 'Best strategy' },
    { lap: 18, action: 'Pit close',  note: 'Latest safe lap' },
  ]
  return (
    <Wrap>
      <SectionLabel>Pit Window</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 8px', borderRadius: 4,
            background: i === 1 ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${i === 1 ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <span style={{ fontSize: 12, fontFamily: mono, color: i === 1 ? GREEN : MID, width: 24 }}>L{r.lap}</span>
            <span style={{ fontSize: 11, fontFamily: ui, color: i === 1 ? GREEN : MID, flex: 1 }}>{r.action}</span>
            <span style={{ fontSize: 9, fontFamily: data, color: DIM }}>{r.note}</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockPitboxHelper() {
  return (
    <Wrap>
      <SectionLabel>Pitbox Helper</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: data, color: DIM, marginBottom: 2 }}>SPEED</div>
            <div style={{ fontSize: 22, fontFamily: mono, color: GREEN, fontWeight: 700 }}>57</div>
            <div style={{ fontSize: 9, fontFamily: data, color: DIM }}>km/h</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: data, color: DIM, marginBottom: 2 }}>LIMIT</div>
            <div style={{ fontSize: 22, fontFamily: mono, color: MID, fontWeight: 700 }}>60</div>
            <div style={{ fontSize: 9, fontFamily: data, color: DIM }}>km/h</div>
          </div>
        </div>
        <Bar pct={57 / 60} color={GREEN} height={8} />
        <div style={{ fontSize: 10, fontFamily: ui, color: GREEN }}>Within pit speed limit</div>
      </div>
    </Wrap>
  )
}

function MockTrackmap() {
  return (
    <Wrap style={{ alignItems: 'center' }}>
      <SectionLabel>Track Map — Live Car Positions</SectionLabel>
      <svg width={160} height={140} viewBox="0 0 160 140">
        <path d="M80,10 Q140,10 150,50 Q160,90 120,110 Q80,130 40,110 Q10,90 10,50 Q20,10 80,10 Z"
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={14} strokeLinejoin="round" />
        <path d="M80,10 Q140,10 150,50 Q160,90 120,110 Q80,130 40,110 Q10,90 10,50 Q20,10 80,10 Z"
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={12} strokeLinejoin="round" />
        {/* Cars */}
        <circle cx={85} cy={12} r={5} fill="#F59E0B" />
        <circle cx={110} cy={24} r={5} fill="#3B82F6" />
        <circle cx={148} cy={62} r={5} fill={RED} />
        <circle cx={135} cy={104} r={5} fill={GREEN} />
        <circle cx={82} cy={128} r={5} fill="#A855F7" />
      </svg>
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ fontSize: 9, fontFamily: data, color: DIM }}>Spa-Francorchamps</span>
      </div>
    </Wrap>
  )
}

function MockMinimap() {
  return (
    <Wrap style={{ alignItems: 'center' }}>
      <SectionLabel>Minimap — Compact</SectionLabel>
      <svg width={90} height={80} viewBox="0 0 90 80">
        <path d="M45,6 Q80,6 84,30 Q88,55 65,65 Q45,74 25,65 Q6,55 6,30 Q10,6 45,6 Z"
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={8} strokeLinejoin="round" />
        <circle cx={46} cy={8} r={3.5} fill="#F59E0B" />
        <circle cx={83} cy={38} r={3.5} fill={RED} />
        <circle cx={56} cy={70} r={3.5} fill={GREEN} />
      </svg>
    </Wrap>
  )
}

function MockFlatmap() {
  return (
    <Wrap style={{ alignItems: 'center' }}>
      <SectionLabel>Flat Map — Schematic</SectionLabel>
      <svg width={150} height={120} viewBox="0 0 150 120">
        <path d="M20,60 L40,20 L80,10 L120,20 L140,50 L130,90 L90,110 L50,110 L20,80 Z"
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={3} strokeLinejoin="round" />
        <circle cx={42} cy={20} r={4} fill="#F59E0B" />
        <circle cx={140} cy={50} r={4} fill={RED} />
        <circle cx={90} cy={110} r={4} fill={GREEN} />
        <text x={14} y={56} fontSize={8} fill={DIM}>T1</text>
        <text x={75} y={6} fontSize={8} fill={DIM}>T4</text>
        <text x={137} y={44} fontSize={8} fill={DIM}>T8</text>
      </svg>
    </Wrap>
  )
}

function MockWeather() {
  const stats = [
    { label: 'TRACK TEMP', value: '38°C' },
    { label: 'AIR TEMP',   value: '22°C' },
    { label: 'WIND',       value: '12 km/h NW' },
    { label: 'CONDITIONS', value: 'Clear' },
  ]
  return (
    <Wrap>
      <SectionLabel>Weather &amp; Environment</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
            <div style={{ fontSize: 8, fontFamily: data, color: DIM, marginBottom: 2, letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: 13, fontFamily: mono, color: FULL }}>{value}</div>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockAdvancedPanel() {
  const stats = [
    { label: 'SPEED',   value: '218', unit: 'km/h' },
    { label: 'RPM',     value: '9,400', unit: '' },
    { label: 'GEAR',    value: '5', unit: '' },
    { label: 'LAP',     value: '12 / 30', unit: '' },
    { label: 'THROTTLE',value: '82', unit: '%' },
    { label: 'BRAKE',   value: '0', unit: '%' },
  ]
  return (
    <Wrap>
      <SectionLabel>Advanced Panel — Configurable Stats</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {stats.map(({ label, value, unit }) => (
          <div key={label} style={{ padding: '8px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontFamily: data, color: DIM, marginBottom: 2, letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: 14, fontFamily: mono, color: FULL, fontWeight: 700 }}>{value}<span style={{ fontSize: 9, color: DIM, marginLeft: 2 }}>{unit}</span></div>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockDataBlocks() {
  return (
    <Wrap>
      <SectionLabel>Data Blocks — Freeform Widgets</SectionLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'SPEED', value: '218', color: '#38BDF8' },
          { label: 'GEAR',  value: '5',   color: GREEN },
          { label: 'RPM',   value: '9.4k',color: '#F59E0B' },
        ].map(b => (
          <div key={b.label} style={{
            flex: 1, padding: '10px 8px', textAlign: 'center',
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${b.color}22`, borderRadius: 6,
          }}>
            <div style={{ fontSize: 8, fontFamily: data, color: DIM, marginBottom: 4 }}>{b.label}</div>
            <div style={{ fontSize: 20, fontFamily: mono, color: b.color, fontWeight: 700 }}>{b.value}</div>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockIncident() {
  const rows = [
    { name: 'M. Hamilton',  count: 0,  color: GREEN },
    { name: 'C. Leclerc',   count: 2,  color: '#F59E0B' },
    { name: 'YOU',          count: 4,  color: RED, player: true },
    { name: 'L. Norris',    count: 6,  color: RED },
  ]
  return (
    <Wrap>
      <SectionLabel>Incident Counter</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 6px', borderRadius: 3,
            background: r.player ? 'rgba(232,0,29,0.08)' : 'transparent',
          }}>
            <span style={{ fontSize: 11, fontFamily: ui, color: r.player ? '#fff' : MID, flex: 1 }}>{r.name}</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: r.count }).map((_, j) => (
                <div key={j} style={{ width: 6, height: 6, borderRadius: 1, background: r.color, opacity: 0.8 }} />
              ))}
            </div>
            <span style={{ fontSize: 11, fontFamily: mono, color: r.color, width: 16, textAlign: 'right' }}>{r.count}x</span>
          </div>
        ))}
      </div>
    </Wrap>
  )
}

function MockDigiflag() {
  return (
    <Wrap style={{ alignItems: 'center', padding: '20px 24px' }}>
      <SectionLabel>Broadcast Flag Display</SectionLabel>
      <div style={{
        width: '100%', padding: '16px 24px', borderRadius: 6, textAlign: 'center',
        background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)',
      }}>
        <div style={{ fontSize: 28, fontFamily: data, fontWeight: 900, color: GREEN, letterSpacing: '0.12em' }}>
          GREEN
        </div>
        <div style={{ fontSize: 11, fontFamily: data, color: 'rgba(34,197,94,0.6)', marginTop: 4 }}>RACE IN PROGRESS</div>
      </div>
    </Wrap>
  )
}

function MockHeartRate() {
  const bpms = [88, 92, 96, 94, 98, 102, 99, 104, 100, 97]
  const W = 200, H = 50
  const min = 80, max = 115
  const pts = bpms.map((b, i) => [
    (i / (bpms.length - 1)) * W,
    H - ((b - min) / (max - min)) * (H - 8) - 4,
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  return (
    <Wrap>
      <SectionLabel>Heart Rate Monitor</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <span style={{ fontSize: 28, fontFamily: mono, fontWeight: 700, color: RED }}>104</span>
        <span style={{ fontSize: 11, fontFamily: data, color: DIM }}>BPM</span>
        <span style={{ fontSize: 18 }}>♥</span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={d} fill="none" stroke={RED} strokeWidth={1.5} strokeLinejoin="round" />
        {pts.map(([x, y], i) => i === bpms.length - 1 && <circle key={i} cx={x} cy={y} r={3} fill={RED} />)}
      </svg>
    </Wrap>
  )
}

function MockGarageCover() {
  return (
    <Wrap style={{ alignItems: 'center', padding: '24px', textAlign: 'center' }}>
      <SectionLabel>Garage Cover — Stream Overlay</SectionLabel>
      <div style={{
        width: '100%', padding: '24px 16px', borderRadius: 8,
        background: 'rgba(232,0,29,0.06)', border: '1px solid rgba(232,0,29,0.2)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 11, fontFamily: data, color: DIM, letterSpacing: '0.14em' }}>AVENTA RACE INTELLIGENCE</div>
        <div style={{ fontSize: 18, fontFamily: data, fontWeight: 800, color: RED, letterSpacing: '0.08em' }}>IN THE GARAGE</div>
        <div style={{ width: 40, height: 2, background: 'rgba(232,0,29,0.4)', borderRadius: 1 }} />
        <div style={{ fontSize: 10, fontFamily: ui, color: DIM }}>Covers the screen while in garage/pits</div>
      </div>
    </Wrap>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

const MOCK_MAP = {
  relative:      <MockRelative />,
  standings:     <MockStandings />,
  battle:        <MockBattle />,
  radar:         <MockRadar />,
  blindspot:     <MockBlindspot />,
  flags:         <MockFlags />,
  delta:         <MockDelta />,
  inputs:        <MockInputs />,
  gforce:        <MockGforce />,
  sessiontimer:  <MockSessionTimer />,
  hstandings:    <MockHstandings />,
  leaderboard:   <MockLeaderboard />,
  headtohead:    <MockHeadToHead />,
  overtakealert: <MockOvertakeAlert />,
  laplog:        <MockLapLog />,
  lapgraph:      <MockLapGraph />,
  laptimespread: <MockLapSpread />,
  fuel:          <MockFuel />,
  tyres:         <MockTyres />,
  boostbox:      <MockBoostBox />,
  raceschedule:  <MockRaceSchedule />,
  pitboxhelper:  <MockPitboxHelper />,
  trackmap:      <MockTrackmap />,
  minimap:       <MockMinimap />,
  flatmap:       <MockFlatmap />,
  weather:       <MockWeather />,
  advancedpanel: <MockAdvancedPanel />,
  datablocks:    <MockDataBlocks />,
  incident:      <MockIncident />,
  digiflag:      <MockDigiflag />,
  heartrate:     <MockHeartRate />,
  garagecover:   <MockGarageCover />,
}

export function getOverlayMock(id) {
  return MOCK_MAP[id] || null
}
