import React from 'react'
import { useTelemetry } from '../../hooks/useTelemetry'
import DragHandle from '../ui/DragHandle'
import ResizeHandles from '../ui/ResizeHandles'

function windDirLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

export default function WeatherOverlay() {
  const { data } = useTelemetry()

  const trackTemp = data?.trackTemp ?? 0
  const airTemp   = data?.airTemp   ?? 0
  const windSpeed = data?.windSpeed ?? 0
  const windDir   = data?.windDir   ?? 0

  const stats = [
    { label: 'TRACK', value: `${trackTemp.toFixed(1)}°C`, color: trackTemp > 40 ? '#F59E0B' : '#fff' },
    { label: 'AIR',   value: `${airTemp.toFixed(1)}°C`,   color: '#fff' },
    { label: 'WIND',  value: `${(windSpeed * 3.6).toFixed(0)} km/h`, color: '#fff' },
    { label: 'DIR',   value: windDirLabel(windDir * 180 / Math.PI), color: '#fff' },
  ]

  return (
    <ResizeHandles overlayId="weather">
      <div className="overlay" style={{ width: 190 }}>
        <DragHandle overlayId="weather" label="Weather" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '8px 10px 10px' }}>
          {stats.map(({ label, value, color }) => (
            <div key={label} style={{ padding: '5px 4px' }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </ResizeHandles>
  )
}
