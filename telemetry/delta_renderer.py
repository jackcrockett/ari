# telemetry/delta_renderer.py
from __future__ import annotations


class DeltaRenderer:
    """
    Shared delta bar renderer.
    Single source of truth for delta visuals.
    """

    def __init__(self, max_delta: float = 2.0, smooth_alpha: float = 0.2):
        self.max_delta = max_delta
        self.alpha = smooth_alpha
        self._visual = 0.0

    def update(self, fill, container, delta: float | None):
        if container.width() <= 0:
            return

        h = container.height()
        w = container.width()
        mid = w // 2

        if delta is None:
            fill.setStyleSheet("background-color: rgba(255,255,255,0.25);")
            fill.setGeometry(mid, 0, 0, h)
            return

        delta = max(-self.max_delta, min(self.max_delta, delta))
        self._visual += self.alpha * (delta - self._visual)

        px = int((abs(self._visual) / self.max_delta) * mid)

        if self._visual < 0:
            fill.setStyleSheet("background-color: #4cff4c;")  # gain
            fill.setGeometry(mid - px, 0, px, h)
        else:
            fill.setStyleSheet("background-color: #ff4d4d;")  # loss
            fill.setGeometry(mid, 0, px, h)

        fill.repaint()
