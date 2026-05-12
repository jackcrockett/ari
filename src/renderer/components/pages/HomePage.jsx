import React from 'react'
import ariLogo from '../../../../assets/ari_logo.png'

export default function HomePage({ connected }) {
  return (
    <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 28, height: '100%', overflowY: 'auto' }}>

      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: connected ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
        border: `1px solid ${connected ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
        borderRadius: 10, padding: '14px 20px',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: connected ? '#22C55E' : '#F59E0B',
          boxShadow: connected ? '0 0 7px #22C55E' : '0 0 7px #F59E0B',
        }} />
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: connected ? '#22C55E' : '#F59E0B',
        }}>
          {connected ? 'Connected to iRacing' : 'Waiting for iRacing — launch iRacing to begin'}
        </span>
      </div>

      {/* Getting started */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '28px 32px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>
          Getting Started
        </div>
        {[
          { step: '1', text: 'Launch iRacing in borderless windowed mode' },
          { step: '2', text: 'Join a session — practice, qualify, or race' },
          { step: '3', text: 'Go to Overlays and enable the ones you want' },
          { step: '4', text: 'Drag overlays on screen to position them' },
          { step: '5', text: 'Save your arrangement as a named layout for quick recall' },
        ].map(({ step, text }) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(232,0,29,0.12)', border: '1px solid rgba(232,0,29,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 800, color: '#E8001D',
            }}>
              {step}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{text}</span>
          </div>
        ))}
      </div>


    </div>
  )
}
