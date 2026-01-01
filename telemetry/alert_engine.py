# telemetry/alert_engine.py
from __future__ import annotations

from telemetry.alerts import Alert
import time


class AlertEngine:
    def __init__(self):
        self._alerts: list[Alert] = []
        self._last_incidents: int | None = None

    def alerts(self) -> list[Alert]:
        return list(self._alerts)

    def clear(self) -> None:
        self._alerts.clear()

    def process(self, race_state, telemetry_snapshot) -> list[Alert]:
        """
        Called every telemetry tick.
        Returns ONLY newly-generated alerts for this tick.
        """
        new_alerts: list[Alert] = []
        now = time.time()

        # ---------- Incident escalation ----------
        inc = int(race_state.your_incidents())

        # First ever tick: prime baseline (no alert)
        if self._last_incidents is None:
            self._last_incidents = inc
            return new_alerts

        # Only alert when it increases
        if inc > self._last_incidents:
            level = "WARN" if inc < 9 else "CRITICAL"
            a = Alert(timestamp=now, level=level, message=f"Incident count increased to {inc}")
            self._alerts.append(a)
            new_alerts.append(a)
            self._last_incidents = inc

        return new_alerts
