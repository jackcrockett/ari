import React, { useState, useEffect } from 'react'
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
import LayoutEditor from './components/LayoutEditor'

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

  if (route.startsWith('/overlay/relative'))      return <RelativeOverlay />
  if (route.startsWith('/overlay/standings'))     return <StandingsOverlay />
  if (route.startsWith('/overlay/fuel'))          return <FuelOverlay />
  if (route.startsWith('/overlay/trackmap'))      return <TrackMapOverlay />
  if (route.startsWith('/overlay/inputs'))        return <InputsOverlay />
  if (route.startsWith('/overlay/tyres'))         return <TyreOverlay />
  if (route.startsWith('/overlay/radar'))         return <RadarOverlay />
  if (route.startsWith('/overlay/headtohead'))    return <HeadToHeadOverlay />
  if (route.startsWith('/overlay/flags'))         return <FlagsOverlay />
  if (route.startsWith('/overlay/delta'))         return <DeltaOverlay />
  if (route.startsWith('/overlay/lapgraph'))      return <LapTimeGraphOverlay />
  if (route.startsWith('/overlay/laplog'))        return <LapTimeLogOverlay />
  if (route.startsWith('/overlay/sessiontimer'))  return <SessionTimerOverlay />
  if (route.startsWith('/overlay/overtakealert')) return <OvertakeAlertOverlay />
  if (route.startsWith('/overlay/blindspot'))     return <BlindSpotOverlay />
  if (route.startsWith('/overlay/boostbox'))      return <BoostBoxOverlay />
  if (route.startsWith('/overlay/weather'))       return <WeatherOverlay />
  if (route.startsWith('/overlay/raceschedule'))  return <RaceScheduleOverlay />
  if (route.startsWith('/overlay/hstandings'))    return <HorizontalStandingsOverlay />
  if (route.startsWith('/overlay/leaderboard'))   return <LeaderboardOverlay />
  if (route.startsWith('/overlay/flatmap'))       return <FlatMapOverlay />
  if (route.startsWith('/overlay/minimap'))       return <MinimapOverlay />
  if (route.startsWith('/overlay/laptimespread')) return <LaptimeSpreadOverlay />
  if (route.startsWith('/overlay/advancedpanel')) return <AdvancedPanelOverlay />
  if (route.startsWith('/overlay/datablocks'))    return <DataBlocksOverlay />
  if (route.startsWith('/overlay/heartrate'))     return <HeartRateOverlay />
  if (route.startsWith('/overlay/gforce'))        return <GForceOverlay />
  if (route.startsWith('/overlay/digiflag'))      return <DigiflagOverlay />
  if (route.startsWith('/overlay/pitboxhelper'))  return <PitboxHelperOverlay />
  if (route.startsWith('/layout-editor'))          return <LayoutEditor />

  return <ControlPanel />
}
