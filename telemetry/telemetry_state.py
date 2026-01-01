# telemetry/telemetry_state.py

from dataclasses import dataclass


@dataclass
class LapPerformance:
    current_lap_time: float = 0.0
    last_lap_time: float = 0.0
    best_lap_time: float = 0.0

    best_sector_1: float = 0.0
    best_sector_2: float = 0.0
    best_sector_3: float = 0.0

    theoretical_best_lap: float = 0.0

    delta_session_best: float = 0.0
    delta_personal_best: float = 0.0


class TelemetryState:
    """
    Central state container for all ARI telemetry
    """

    def __init__(self):
        self.lap = LapPerformance()

    def update_lap_times(
        self,
        current_lap: float,
        last_lap: float,
        best_lap: float,
        s1: float,
        s2: float,
        s3: float,
        session_best: float,
    ):
        self.lap.current_lap_time = current_lap
        self.lap.last_lap_time = last_lap
        self.lap.best_lap_time = best_lap

        self.lap.best_sector_1 = s1
        self.lap.best_sector_2 = s2
        self.lap.best_sector_3 = s3

        # Theoretical best
        if s1 > 0 and s2 > 0 and s3 > 0:
            self.lap.theoretical_best_lap = s1 + s2 + s3
        else:
            self.lap.theoretical_best_lap = 0.0

        # Deltas (guarded)
        if current_lap > 0 and session_best > 0:
            self.lap.delta_session_best = current_lap - session_best
        else:
            self.lap.delta_session_best = 0.0

        if current_lap > 0 and best_lap > 0:
            self.lap.delta_personal_best = current_lap - best_lap
        else:
            self.lap.delta_personal_best = 0.0
