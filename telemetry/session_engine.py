# telemetry/session_engine.py
from __future__ import annotations


class SessionEngine:
    """
    Minimal session-intelligence state holder.

    Keeps ARI stable even if the strategy/overlay logic is still being built.
    Expand later without changing MainWindow wiring.
    """

    def __init__(self):
        self.current_phase: str = "UNKNOWN"  # e.g., PRACTICE / QUALI / RACE
        self.pit_style: str = "NONE"         # e.g., NONE / SPLASH / FULL
        self.priority: str = "NORMAL"        # e.g., LOW / NORMAL / HIGH
        self.confidence: float = 0.0         # 0.0–1.0
        self.strategy_text: str = "--"

    def update(self, race_state, snapshot) -> None:
        """
        Safe update. Never throws.
        """
        try:
            # Phase (cheap + safe)
            st = getattr(race_state, "session_type", None)
            self.current_phase = st if st else "UNKNOWN"
        except Exception:
            self.current_phase = "UNKNOWN"

