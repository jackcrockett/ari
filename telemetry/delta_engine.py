# telemetry/delta_engine.py
from __future__ import annotations
from typing import Optional


class DeltaEngine:
    """
    Computes live lap delta vs best lap using lap distance %.
    """

    def __init__(self):
        self._best_lap: Optional[float] = None

    def reset(self):
        self._best_lap = None

    def update(self, snapshot) -> Optional[float]:
        """
        Returns live delta in seconds (+ = slower, - = faster)
        or None if insufficient data.
        """

        # Capture best lap once known
        if snapshot.lap_best and snapshot.lap_best > 0:
            self._best_lap = snapshot.lap_best

        if (
            not self._best_lap
            or not snapshot.lap_current
            or snapshot.lap_dist_pct <= 1.0
        ):
            return None

        # Expected time at this distance on best lap
        expected = self._best_lap * (snapshot.lap_dist_pct / 100.0)

        # Delta = actual - expected
        return snapshot.lap_current - expected
