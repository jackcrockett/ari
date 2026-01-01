# telemetry/strategy_engine.py
from __future__ import annotations


class StrategyEngine:
    """
    Safe placeholder for session strategy logic.
    Returns stable defaults until fully implemented.
    """

    def __init__(self):
        self.text = "--"
        self.confidence = 0.0
        self.priority = "NORMAL"

    def update(self, race_state, snapshot):
        text = "Hold position"
        confidence = 0.3
        priority = "NORMAL"

        incidents = race_state.your_incidents()

        if incidents >= 8:
            priority = "CRITICAL"
            text = "Incident limit risk"
            confidence = 0.9
        elif incidents >= 5:
            priority = "HIGH"
            text = "Drive clean – incidents accumulating"
            confidence = 0.7

        if snapshot.fuel_est_laps is not None:
            if snapshot.fuel_est_laps < 1.5:
                priority = "CRITICAL"
                text = "Fuel critical"
                confidence = 1.0
            elif snapshot.fuel_est_laps < 3:
                priority = "HIGH"
                text = "Fuel low"
                confidence = max(confidence, 0.8)

        return text, confidence, priority


