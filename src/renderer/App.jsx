import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useTelemetry } from './hooks/useTelemetry'
import ControlPanel from './components/ControlPanel'
import RelativeOverlay from './components/overlays/RelativeOverlay'
import StandingsOverlay from './components/overlays/StandingsOverlay'
import FuelOverlay from './components/overlays/FuelOverlay'
import TyreOverlay from './components/overlays/TyreOverlay'
import TrackMapOverlay from './components/overlays/TrackMapOverlay'
import InputsOverlay from './components/overlays/InputsOverlay'
import RadarOverlay from './components/overlays/RadarOverlay'
import HeadToHeadOverlay from './components/overlays/HeadToHeadOverlay'
import FlagsOverlay from './components/overlays/FlagsOverlay'
import DeltaOverlay from './components/overlays/DeltaOverlay'
import LapTimeGraphOverlay from './components/overlays/LapTimeGraphOverlay'
import LapTimeLogOverlay from './components/overlays/LapTimeLogOverlay'
import SessionTimerOverlay from './components/overlays/SessionTimerOverlay'
import OvertakeAlertOverlay from './components/overlays/OvertakeAlertOverlay'
import BlindSpotOverlay from './components/overlays/BlindSpotOverlay'
import BoostBoxOverlay from './components/overlays/BoostBoxOverlay'
import WeatherOverlay from './components/overlays/WeatherOverlay'
import RaceScheduleOverlay from './components/overlays/RaceScheduleOverlay'
import HorizontalStandingsOverlay from './components/overlays/HorizontalStandingsOverlay'
import LeaderboardOverlay from './components/overlays/LeaderboardOverlay'
import FlatMapOverlay from './components/overlays/FlatMapOverlay'
import MinimapOverlay from './components/overlays/MinimapOverlay'
import LaptimeSpreadOverlay from './components/overlays/LaptimeSpreadOverlay'
import AdvancedPanelOverlay from './components/overlays/AdvancedPanelOverlay'
import DataBlocksOverlay from './components/overlays/DataBlocksOverlay'
import HeartRateOverlay from './components/overlays/HeartRateOverlay'
import GForceOverlay from './components/overlays/GForceOverlay'
import DigiflagOverlay from './components/overlays/DigiflagOverlay'
import PitboxHelperOverlay from './components/overlays/PitboxHelperOverlay'
import IncidentOverlay from './components/overlays/IncidentOverlay'
import BattleOverlay from './components/overlays/BattleOverlay'
import GarageCoverOverlay from './components/overlays/GarageCoverOverlay'
import { OVERLAY_DEFAULTS_RENDERER } from './lib/overlayGroups'

// Fades overlays in when iRacing is live, out when disconnected.
// Grace period prevents flicker on brief data drops during session loading.
function ConnectedFade({ children }) {
  const { connected } = useTelemetry()
  const inCar = connected
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (inCar) {
      setVisible(true)
    } else {
      timerRef.current = setTimeout(() => setVisible(false), 3000)
    }
    return () => clearTimeout(timerRef.current)
  }, [inCar])

  return (
    <div style={{
      width: '100%', height: '100%',
      opacity: visible ? 1 : 0,
      transition: visible ? 'opacity 0.6s ease' : 'opacity 1.5s ease',
    }}>
      {children}
    </div>
  )
}

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

  // Overlay windows get dynamic zoom scaled to window width; control panel does not
  useLayoutEffect(() => {
    const isOverlay = route.startsWith('/overlay/')
    document.body.classList.toggle('is-overlay', isOverlay)
    if (!isOverlay) {
      document.body.style.zoom = ''
      return
    }
    const overlayId = route.slice('/overlay/'.length)
    const def = OVERLAY_DEFAULTS_RENDERER[overlayId]
    if (!def) return

    const applyZoom = () => {
      const physW = window.outerWidth
      if (!physW) return
      document.body.style.zoom = (physW / def.width) * 1.4
    }
    applyZoom()
    window.addEventListener('resize', applyZoom)
    return () => window.removeEventListener('resize', applyZoom)
  }, [route])

  if (route.startsWith('/overlay/')) {
    let overlay = null
    if (route.startsWith('/overlay/relative'))      overlay = <RelativeOverlay />
    else if (route.startsWith('/overlay/standings'))     overlay = <StandingsOverlay />
    else if (route.startsWith('/overlay/fuel'))          overlay = <FuelOverlay />
    else if (route.startsWith('/overlay/trackmap'))      overlay = <TrackMapOverlay />
    else if (route.startsWith('/overlay/inputs'))        overlay = <InputsOverlay />
    else if (route.startsWith('/overlay/tyres'))         overlay = <TyreOverlay />
    else if (route.startsWith('/overlay/radar'))         overlay = <RadarOverlay />
    else if (route.startsWith('/overlay/headtohead'))    overlay = <HeadToHeadOverlay />
    else if (route.startsWith('/overlay/flags'))         overlay = <FlagsOverlay />
    else if (route.startsWith('/overlay/delta'))         overlay = <DeltaOverlay />
    else if (route.startsWith('/overlay/lapgraph'))      overlay = <LapTimeGraphOverlay />
    else if (route.startsWith('/overlay/laplog'))        overlay = <LapTimeLogOverlay />
    else if (route.startsWith('/overlay/sessiontimer'))  overlay = <SessionTimerOverlay />
    else if (route.startsWith('/overlay/overtakealert')) overlay = <OvertakeAlertOverlay />
    else if (route.startsWith('/overlay/blindspot'))     overlay = <BlindSpotOverlay />
    else if (route.startsWith('/overlay/boostbox'))      overlay = <BoostBoxOverlay />
    else if (route.startsWith('/overlay/weather'))       overlay = <WeatherOverlay />
    else if (route.startsWith('/overlay/raceschedule'))  overlay = <RaceScheduleOverlay />
    else if (route.startsWith('/overlay/hstandings'))    overlay = <HorizontalStandingsOverlay />
    else if (route.startsWith('/overlay/leaderboard'))   overlay = <LeaderboardOverlay />
    else if (route.startsWith('/overlay/flatmap'))       overlay = <FlatMapOverlay />
    else if (route.startsWith('/overlay/minimap'))       overlay = <MinimapOverlay />
    else if (route.startsWith('/overlay/laptimespread')) overlay = <LaptimeSpreadOverlay />
    else if (route.startsWith('/overlay/advancedpanel')) overlay = <AdvancedPanelOverlay />
    else if (route.startsWith('/overlay/datablocks'))    overlay = <DataBlocksOverlay />
    else if (route.startsWith('/overlay/heartrate'))     overlay = <HeartRateOverlay />
    else if (route.startsWith('/overlay/gforce'))        overlay = <GForceOverlay />
    else if (route.startsWith('/overlay/digiflag'))      overlay = <DigiflagOverlay />
    else if (route.startsWith('/overlay/pitboxhelper'))  overlay = <PitboxHelperOverlay />
    else if (route.startsWith('/overlay/incident'))      overlay = <IncidentOverlay />
    else if (route.startsWith('/overlay/battle'))        overlay = <BattleOverlay />
    else if (route.startsWith('/overlay/garagecover'))   overlay = <GarageCoverOverlay />
    if (overlay) return <ConnectedFade>{overlay}</ConnectedFade>
  }

  return <ControlPanel />
}
