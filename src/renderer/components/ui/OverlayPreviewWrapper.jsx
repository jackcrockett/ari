/**
 * Renders the actual overlay component inside the OverlaysPage detail panel.
 * Uses OverlayPreviewContext + PreviewTelemetryContext so overlays receive
 * static demo data and skip all IPC side effects (drag, passthrough, etc.).
 */

import React, { useMemo } from 'react'
import { OverlayPreviewContext, PreviewTelemetryContext } from '../OverlayPreviewContext'
import { buildDemoData } from '../../hooks/useTelemetry'
import { OVERLAY_DEFAULTS_RENDERER } from '../../lib/overlayGroups'

// ── Lazy overlay imports ──────────────────────────────────────────────────────
import RelativeOverlay         from '../overlays/RelativeOverlay'
import StandingsOverlay        from '../overlays/StandingsOverlay'
import BattleOverlay           from '../overlays/BattleOverlay'
import RadarOverlay            from '../overlays/RadarOverlay'
import BlindSpotOverlay        from '../overlays/BlindSpotOverlay'
import FlagsOverlay            from '../overlays/FlagsOverlay'
import DeltaOverlay            from '../overlays/DeltaOverlay'
import InputsOverlay           from '../overlays/InputsOverlay'
import GForceOverlay           from '../overlays/GForceOverlay'
import SessionTimerOverlay     from '../overlays/SessionTimerOverlay'
import HorizontalStandingsOverlay from '../overlays/HorizontalStandingsOverlay'
import LeaderboardOverlay      from '../overlays/LeaderboardOverlay'
import HeadToHeadOverlay       from '../overlays/HeadToHeadOverlay'
import OvertakeAlertOverlay    from '../overlays/OvertakeAlertOverlay'
import LapTimeLogOverlay       from '../overlays/LapTimeLogOverlay'
import LapTimeGraphOverlay     from '../overlays/LapTimeGraphOverlay'
import LaptimeSpreadOverlay    from '../overlays/LaptimeSpreadOverlay'
import FuelOverlay             from '../overlays/FuelOverlay'
import TyreOverlay             from '../overlays/TyreOverlay'
import BoostBoxOverlay         from '../overlays/BoostBoxOverlay'
import RaceScheduleOverlay     from '../overlays/RaceScheduleOverlay'
import PitboxHelperOverlay     from '../overlays/PitboxHelperOverlay'
import TrackMapOverlay         from '../overlays/TrackMapOverlay'
import MinimapOverlay          from '../overlays/MinimapOverlay'
import FlatMapOverlay          from '../overlays/FlatMapOverlay'
import WeatherOverlay          from '../overlays/WeatherOverlay'
import AdvancedPanelOverlay    from '../overlays/AdvancedPanelOverlay'
import DataBlocksOverlay       from '../overlays/DataBlocksOverlay'
import IncidentOverlay         from '../overlays/IncidentOverlay'
import DigiflagOverlay         from '../overlays/DigiflagOverlay'
import HeartRateOverlay        from '../overlays/HeartRateOverlay'
import GarageCoverOverlay      from '../overlays/GarageCoverOverlay'

export const OVERLAY_COMPONENTS = {
  relative:      RelativeOverlay,
  standings:     StandingsOverlay,
  battle:        BattleOverlay,
  radar:         RadarOverlay,
  blindspot:     BlindSpotOverlay,
  flags:         FlagsOverlay,
  delta:         DeltaOverlay,
  inputs:        InputsOverlay,
  gforce:        GForceOverlay,
  sessiontimer:  SessionTimerOverlay,
  hstandings:    HorizontalStandingsOverlay,
  leaderboard:   LeaderboardOverlay,
  headtohead:    HeadToHeadOverlay,
  overtakealert: OvertakeAlertOverlay,
  laplog:        LapTimeLogOverlay,
  lapgraph:      LapTimeGraphOverlay,
  laptimespread: LaptimeSpreadOverlay,
  fuel:          FuelOverlay,
  tyres:         TyreOverlay,
  boostbox:      BoostBoxOverlay,
  raceschedule:  RaceScheduleOverlay,
  pitboxhelper:  PitboxHelperOverlay,
  trackmap:      TrackMapOverlay,
  minimap:       MinimapOverlay,
  flatmap:       FlatMapOverlay,
  weather:       WeatherOverlay,
  advancedpanel: AdvancedPanelOverlay,
  datablocks:    DataBlocksOverlay,
  incident:      IncidentOverlay,
  digiflag:      DigiflagOverlay,
  heartrate:     HeartRateOverlay,
  garagecover:   GarageCoverOverlay,
}

// Static demo data — tick=300 puts values mid-range (not all zeros)
export const STATIC_DEMO = buildDemoData(300).telemetry

// Max width available in the detail panel for the preview
const MAX_PREVIEW_WIDTH = 640

export default function OverlayPreviewWrapper({ overlayId }) {
  const Component = OVERLAY_COMPONENTS[overlayId]
  const dims      = OVERLAY_DEFAULTS_RENDERER[overlayId]

  if (!Component || !dims) return null

  const scale  = Math.min(1, MAX_PREVIEW_WIDTH / dims.width)
  const scaledW = Math.round(dims.width  * scale)
  const scaledH = Math.round(dims.height * scale)

  return (
    <OverlayPreviewContext.Provider value={true}>
      <PreviewTelemetryContext.Provider value={STATIC_DEMO}>
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: 'var(--font-data)',
            color: 'rgba(255,255,255,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 10,
          }}>
            Preview
          </div>

          {/* Outer container — sized to the scaled dimensions */}
          <div style={{
            width: scaledW,
            height: scaledH,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Inner div at natural size, scaled down via transform */}
            <div style={{
              width:  dims.width,
              height: dims.height,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              pointerEvents: 'none',
            }}>
              <Component />
            </div>
          </div>

          {scale < 1 && (
            <div style={{
              marginTop: 6,
              fontSize: 9,
              fontFamily: 'var(--font-data)',
              color: 'rgba(255,255,255,0.15)',
              letterSpacing: '0.08em',
            }}>
              {Math.round(scale * 100)}% scale · actual size {dims.width}×{dims.height}px
            </div>
          )}
        </div>
      </PreviewTelemetryContext.Provider>
    </OverlayPreviewContext.Provider>
  )
}
