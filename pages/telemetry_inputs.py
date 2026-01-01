from __future__ import annotations

from PyQt6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame
from PyQt6.QtCore import Qt

import pyqtgraph as pg
from collections import deque


class TelemetryInputsPage(QWidget):
    """
    Live driver input visualisation.
    Presentation-only.
    """

    def __init__(self):
        super().__init__()

         # ---- Smoothed input state ----
        self._s_throttle = 0.0
        self._s_brake = 0.0
        self._s_steer = 0.0

        self._smooth_alpha = 0.15  # lower = smoother (0.1–0.2 sweet spot)

        # After smoothing
        throttle = round(self._s_throttle, 3)
        brake = round(self._s_brake, 3)
        steer = round(self._s_steer, 3)

        root = QVBoxLayout(self)
        root.setContentsMargins(18, 18, 18, 18)
        root.setSpacing(14)

        # ---------- Header ----------
        header = QHBoxLayout()
        title = QLabel("Telemetry Inputs")
        title.setObjectName("Title")

        subtitle = QLabel("Live driver control inputs")
        subtitle.setObjectName("Subtle")

        header.addWidget(title)
        header.addStretch(1)
        header.addWidget(subtitle)
        root.addLayout(header)

        # ---------- Input Bars ----------
        bars_card = QFrame()
        bars_card.setObjectName("Card")
        bars_layout = QVBoxLayout(bars_card)
        bars_layout.setContentsMargins(12, 12, 12, 12)
        bars_layout.setSpacing(10)

        (self.throttle_row,
        self.throttle_bar,
        self.throttle_fill) = self._make_bar("Throttle", "rgba(44, 255, 20, 0.9)")

        (self.brake_row,
        self.brake_bar,
        self.brake_fill) = self._make_bar("Brake", "rgba(255, 49, 49, 0.9)")

        (self.steer_row,
        self.steer_bar,
        self.steer_fill) = self._make_bar("Steering", "rgba(0, 140, 255, 0.9)")

        bars_layout.addLayout(self.throttle_row)
        bars_layout.addLayout(self.brake_row)
        bars_layout.addLayout(self.steer_row)

        root.addWidget(bars_card)

        # ---------- Plot ----------
        plot_card = QFrame()
        plot_card.setObjectName("Card")
        plot_layout = QVBoxLayout(plot_card)

        self.plot = pg.PlotWidget()
        self.plot.setAntialiasing(True)
        self.plot.setBackground(None)
        self.plot.showGrid(x=True, y=True, alpha=0.3)
        self.plot.setYRange(-1, 1)


        plot_layout.addWidget(self.plot)
        root.addWidget(plot_card)

        # ---------- Data buffers ----------
        self._max_samples = 180
        self._throttle = deque(maxlen=self._max_samples)
        self._brake = deque(maxlen=self._max_samples)
        self._steer = deque(maxlen=self._max_samples)

        # ---------- Plot lines ----------
        self.curve_throttle = self.plot.plot(
            pen=pg.mkPen(color=(44, 255, 20), width=2),
            name="Throttle"
        )

        self.curve_brake = self.plot.plot(
            pen=pg.mkPen(color=(255, 49, 49), width=2),
            name="Brake"
        )

        self.curve_steer = self.plot.plot(
            pen=pg.mkPen(color=(0, 140, 255), width=1),
            name="Steering"
        )

        self.plot.addLegend()

    # ---------- Helpers ----------

    def _make_bar(self, label_text: str, color: str):
        row = QHBoxLayout()

        label = QLabel(label_text)
        label.setFixedWidth(80)

        bar = QFrame()
        bar.setFixedHeight(16)
        bar.setStyleSheet("""
            QFrame {
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
            }
        """)

        fill = QFrame(bar)
        fill.setGeometry(0, 0, 0, 16)
        fill.setStyleSheet(f"""
            QFrame {{
                background: {color};
                border-radius: 8px;
            }}
        """)


        row.addWidget(label)
        row.addWidget(bar, 1)

        return row, bar, fill

    def _set_bar(self, fill: QFrame, container: QFrame, value: float):
        value = max(-1.0, min(1.0, value))

        width = container.width()
        height = container.height()
        mid = width // 2

        if value >= 0:
            fill.setGeometry(mid, 0, int(mid * value), height)
        else:
            fill.setGeometry(int(mid * (1 + value)), 0, int(mid * -value), height)

    # ---------- Telemetry ----------

    def apply_telemetry(self, snapshot):
        if snapshot is None:
            self._set_bar(self.throttle_fill, self.throttle_bar, 0.0)
            self._set_bar(self.brake_fill, self.brake_bar, 0.0)
            self._set_bar(self.steer_fill, self.steer_bar, 0.0)
            return

        raw_throttle = float(snapshot.__dict__.get("throttle", 0.0))
        raw_brake = float(snapshot.__dict__.get("brake", 0.0))
        raw_steer = float(snapshot.__dict__.get("steer", 0.0))

        a = self._smooth_alpha

        self._s_throttle += a * (raw_throttle - self._s_throttle)
        self._s_brake += a * (raw_brake - self._s_brake)
        self._s_steer += a * (raw_steer - self._s_steer)

        # ✅ USE SMOOTHED VALUES
        throttle = self._s_throttle
        brake = self._s_brake
        steer = self._s_steer

        # ---- Bars ----
        self._set_bar(self.throttle_fill, self.throttle_bar, throttle)
        self._set_bar(self.brake_fill, self.brake_bar, brake)
        self._set_bar(self.steer_fill, self.steer_bar, steer)

        # ---- Graph buffers ----
        self._throttle.append(throttle)
        self._brake.append(brake)
        self._steer.append(steer)

        x = list(range(len(self._throttle)))

        # ---- Update curves ----
        self.curve_throttle.setData(x, self._throttle)
        self.curve_brake.setData(x, self._brake)
        self.curve_steer.setData(x, self._steer)

