import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

export default function BoostBoxOverlay() {
  const { data } = useTelemetry()

  const ersRemaining = data?.ersRemaining   // null = car has no ERS
  const ersDeployPct = data?.ersDeployPct ?? 0

  const hasERS = ersRemaining != null

  return (
    <ResizeHandles overlayId="boostbox">
      <div className="overlay" style={{ width: 190 }}>
        <DragHandle overlayId="boostbox" label="Boost / ERS" />
        {!hasERS ? (
          <div style={{ padding: '10px 12px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            No ERS on this car
          </div>
        ) : (
          <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Battery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>BATTERY</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: ersRemaining > 0.3 ? '#22C55E' : '#F59E0B' }}>
                  {(ersRemaining * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${ersRemaining * 100}%`,
                  background: ersRemaining > 0.5 ? '#22C55E' : ersRemaining > 0.25 ? '#F59E0B' : '#E8001D',
                  borderRadius: 3, transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
            {/* Deploy this lap */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>DEPLOYED</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#A855F7' }}>
                  {(ersDeployPct * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${ersDeployPct * 100}%`,
                  background: '#A855F7', borderRadius: 3, transition: 'width 0.2s ease',
                }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </ResizeHandles>
  )
}
