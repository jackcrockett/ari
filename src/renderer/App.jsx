import React, { useState, useEffect } from 'react'
import ControlPanel from './components/ControlPanel'
import RelativeOverlay from './components/overlays/RelativeOverlay'
import StandingsOverlay from './components/overlays/StandingsOverlay'
import FuelOverlay from './components/overlays/FuelOverlay'
import TrackMapOverlay from './components/overlays/TrackMapOverlay'
import InputsOverlay from './components/overlays/InputsOverlay'

function getRoute() {
  return window.location.hash.replace(/^#/, '') || '/'
}

export default function App() {
  const [route, setRoute] = useState(getRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route.startsWith('/overlay/relative'))  return <RelativeOverlay />
  if (route.startsWith('/overlay/standings')) return <StandingsOverlay />
  if (route.startsWith('/overlay/fuel'))      return <FuelOverlay />
  if (route.startsWith('/overlay/trackmap'))  return <TrackMapOverlay />
  if (route.startsWith('/overlay/inputs'))    return <InputsOverlay />

  return <ControlPanel />
}
