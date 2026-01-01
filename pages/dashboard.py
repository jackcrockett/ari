from __future__ import annotations

from PyQt6.QtWidgets import (
    QWidget, QLabel, QVBoxLayout, QHBoxLayout, QGridLayout, QFrame
)
from telemetry.delta_renderer import DeltaRenderer
import time


class MetricCard(QFrame):
    def __init__(self, label: str, value: str = "--"):
        super().__init__()
        self.setObjectName("Card")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)

        self.label = QLabel(label)
        self.label.setObjectName("Subtle")

        self.value = QLabel(value)
        self.value.setObjectName("Title")

        layout.addWidget(self.label)
        layout.addWidget(self.value)

    def set_value(self, text: str):
        self.value.setText(text)


class DashboardPage(QWidget):
    def __init__(self):
        super().__init__()
        self._use_mph = True
        self.delta_renderer = DeltaRenderer()

        root = QVBoxLayout(self)
        root.setContentsMargins(18, 18, 18, 18)
        root.setSpacing(14)

        # Header
        header = QHBoxLayout()
        header.addWidget(QLabel("Dashboard"))
        header.addStretch(1)
        root.addLayout(header)

        # ================= PRIMARY METRICS =================
        grid = QGridLayout()

        self.card_speed = MetricCard("Speed")
        self.card_rpm = MetricCard("RPM")
        self.card_gear = MetricCard("Gear")
        self.card_lap = MetricCard("Lap")
        self.card_source = MetricCard("Source")
        self.card_delta = MetricCard("Delta", "--")

        grid.addWidget(self.card_speed, 0, 0)
        grid.addWidget(self.card_rpm, 0, 1)
        grid.addWidget(self.card_gear, 0, 2)
        grid.addWidget(self.card_lap, 1, 0)
        grid.addWidget(self.card_source, 1, 1)
        grid.addWidget(self.card_delta, 1, 2)

        root.addLayout(grid)

        # ================= VEHICLE DYNAMICS =================
        dyn_grid = QGridLayout()

        self.card_steer_rate = MetricCard("Steering Rate (°/s)")
        self.card_throttle_rate = MetricCard("Throttle Rate (%/s)")
        self.card_brake_rate = MetricCard("Brake Rate (%/s)")
        self.card_combined_load = MetricCard("Combined Load (%)")

        dyn_grid.addWidget(self.card_steer_rate, 0, 0)
        dyn_grid.addWidget(self.card_throttle_rate, 0, 1)
        dyn_grid.addWidget(self.card_brake_rate, 0, 2)
        dyn_grid.addWidget(self.card_combined_load, 0, 3)

        root.addLayout(dyn_grid)

        # ================= LAP TIMES =================
        lap_grid = QGridLayout()

        self.card_lap_current = MetricCard("Current Lap")
        self.card_lap_last = MetricCard("Last Lap")
        self.card_lap_best = MetricCard("Best Lap")
        self.card_lap_theoretical = MetricCard("Theoretical Best")
        self.card_delta_pb = MetricCard("Δ Personal Best")
        self.card_delta_sb = MetricCard("Δ Session Best")

        lap_grid.addWidget(self.card_lap_current, 0, 0)
        lap_grid.addWidget(self.card_lap_last, 0, 1)
        lap_grid.addWidget(self.card_lap_best, 0, 2)
        lap_grid.addWidget(self.card_lap_theoretical, 1, 0)
        lap_grid.addWidget(self.card_delta_pb, 1, 1)
        lap_grid.addWidget(self.card_delta_sb, 1, 2)

        root.addLayout(lap_grid)

        # ================= Debug Health Panel =================
        self.health_panel = QFrame()
        self.health_panel.setObjectName("Card")
        self.health_panel.setVisible(False)

        hl = QVBoxLayout(self.health_panel)
        hl.setContentsMargins(12, 12, 12, 12)
        hl.setSpacing(6)

        self.lbl_health_title = QLabel("Telemetry Health")
        self.lbl_health_title.setObjectName("Subtle")

        self.lbl_health_source = QLabel("Source: --")
        self.lbl_health_rate = QLabel("Update Rate: -- Hz")
        self.lbl_health_age = QLabel("Last Packet: -- ms")
        self.lbl_health_delta = QLabel("Delta: --")

        for lbl in (
            self.lbl_health_title,
            self.lbl_health_source,
            self.lbl_health_rate,
            self.lbl_health_age,
            self.lbl_health_delta,
        ):
            lbl.setObjectName("Subtle")
            hl.addWidget(lbl)

        root.addWidget(self.health_panel)

        self._last_tick_time = None
        self._hz = 0.0

        # ================= Strategy Panel =================
        self.strategy_panel = QFrame()
        self.strategy_panel.setObjectName("Card")

        sl = QVBoxLayout(self.strategy_panel)
        sl.setContentsMargins(12, 12, 12, 12)
        sl.setSpacing(6)

        self.lbl_strategy_title = QLabel("Strategy")
        self.lbl_strategy_title.setObjectName("Subtle")

        self.lbl_strategy_text = QLabel("--")
        self.lbl_strategy_text.setWordWrap(True)
        self.lbl_strategy_text.setObjectName("Title")

        self.lbl_strategy_confidence = QLabel("Confidence: --")
        self.lbl_strategy_confidence.setObjectName("Subtle")

        self.lbl_strategy_priority = QLabel("Priority: --")
        self.lbl_strategy_priority.setObjectName("Subtle")

        sl.addWidget(self.lbl_strategy_title)
        sl.addWidget(self.lbl_strategy_text)
        sl.addWidget(self.lbl_strategy_confidence)
        sl.addWidget(self.lbl_strategy_priority)

        root.addWidget(self.strategy_panel)

        # ================= Delta Bar =================
        self.delta_bar = QFrame()
        self.delta_bar.setFixedHeight(10)
        self.delta_bar.setStyleSheet(
            "background: rgba(255,255,255,0.08); border-radius: 5px;"
        )

        self.delta_fill = QFrame(self.delta_bar)
        self.delta_fill.setGeometry(0, 0, 0, 10)

        root.addWidget(self.delta_bar)
        root.addStretch(1)

    # ================= APPLY TELEMETRY =================
    def apply_telemetry(self, snapshot=None, use_mph: bool = True):
        self._use_mph = use_mph

        unit = "MPH" if use_mph else "KM/H"
        self.card_speed.label.setText(f"Speed ({unit})")

        if snapshot is None:
            for card in (
                self.card_speed,
                self.card_rpm,
                self.card_gear,
                self.card_lap,
                self.card_source,
            ):
                card.set_value("--")
            return

        speed = snapshot.speed_mph if use_mph else snapshot.speed_kph
        self.card_speed.set_value(f"{speed:.1f}")
        self.card_rpm.set_value(str(snapshot.rpm))
        self.card_gear.set_value(str(snapshot.gear))
        self.card_lap.set_value(str(snapshot.lap))
        self.card_source.set_value(snapshot.source)

        if snapshot.engine_water_temp is not None:
            self.card_water_temp.set_value(f"{snapshot.engine_water_temp:.1f}°C")

        if snapshot.engine_oil_temp is not None:
            self.card_oil_temp.set_value(f"{snapshot.engine_oil_temp:.1f}°C")

        if snapshot.fuel_level is not None:
            self.card_fuel_remaining.set_value(f"{snapshot.fuel_level:.1f}")

        if snapshot.fuel_used_lap is not None:
            self.card_fuel_per_lap.set_value(f"{snapshot.fuel_used_lap:.2f}")

        if snapshot.fuel_est_laps is not None:
            self.card_fuel_laps.set_value(f"{snapshot.fuel_est_laps:.1f}")

    # ================= APPLY LAP TIMES =================
    def apply_lap_times(
        self,
        current: float,
        last: float,
        best: float,
        theoretical: float,
        delta_pb: float,
        delta_sb: float,
    ):
        def fmt(t: float) -> str:
            if t <= 0:
                return "--:--.---"
            m = int(t // 60)
            s = t % 60
            return f"{m}:{s:06.3f}"

        self.card_lap_current.set_value(fmt(current))
        self.card_lap_last.set_value(fmt(last))
        self.card_lap_best.set_value(fmt(best))
        self.card_lap_theoretical.set_value(fmt(theoretical))

        self.card_delta_pb.set_value(f"{delta_pb:+.3f}")
        self.card_delta_sb.set_value(f"{delta_sb:+.3f}")

    # ================= DELTA =================
    def apply_delta(self, delta):
        self.card_delta.set_value(f"{delta:+.2f}" if delta is not None else "--")
        self.delta_renderer.update(self.delta_fill, self.delta_bar, delta)

    # ================= DEBUG =================
    def set_debug_visible(self, visible: bool):
        self.health_panel.setVisible(visible)

    def apply_health(self, snapshot):
        now = time.time()

        if self._last_tick_time is not None:
            dt = now - self._last_tick_time
            if dt > 0:
                self._hz = 1.0 / dt
        else:
            self._hz = 0.0

        self._last_tick_time = now
        age_ms = max(0, int((now - snapshot.session_time) * 1000))

        self.lbl_health_source.setText(f"Source: {snapshot.source}")
        self.lbl_health_rate.setText(f"Update Rate: {self._hz:.1f} Hz")
        self.lbl_health_age.setText(f"Last Packet: {age_ms} ms")
        self.lbl_health_delta.setText(
            "Delta: OK" if snapshot.predicted_lap is not None else "Delta: --"
        )

    # ================= VEHICLE DYNAMICS =================

    def apply_vehicle_dynamics(self, d: dict):
        self.card_steer_rate.set_value(f"{d['steer_rate']:+.1f}")
        self.card_throttle_rate.set_value(f"{d['throttle_rate']:+.1f}")
        self.card_brake_rate.set_value(f"{d['brake_rate']:+.1f}")
        self.card_combined_load.set_value(f"{d['combined_load']:.0f}")

    # ================= STRATEGY =================
    def apply_strategy(self, text, confidence=None, priority=None):
        self.lbl_strategy_text.setText(text)

        if confidence is not None:
            pct = int(confidence * 100)
            self.lbl_strategy_confidence.setText(f"Confidence: {pct}%")

        if priority is not None:
            self.lbl_strategy_priority.setText(f"Priority: {priority}")
