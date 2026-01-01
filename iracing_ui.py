# ================================================================
# AVENTA RACE INTELLIGENCE (ARI)
# WELCOME-GATED STABLE FOUNDATION
# ================================================================
from __future__ import annotations

import sys
import time
from dataclasses import dataclass
from typing import Optional
import random

from PyQt6.QtCore import Qt, QTimer, QEasingCurve
from PyQt6.QtGui import QPixmap, QFont, QIcon
from PyQt6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QFrame,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QHBoxLayout,
    QStackedWidget,
)

# ---- Pages ----
from pages.welcome import WelcomePage
from pages.dashboard import DashboardPage
from pages.controls import ControlsPage
from pages.telemetry_inputs import TelemetryInputsPage
from pages.race_monitor import RaceMonitorPage

# ---- Telemetry ----
from telemetry.client import TelemetryClient
from telemetry.alert_engine import AlertEngine
from telemetry.delta_engine import DeltaEngine
from telemetry.strategy_engine import StrategyEngine
from telemetry.session_engine import SessionEngine
from telemetry.race_state import RaceState
from telemetry.telemetry_state import TelemetryState

# =========================
# BRANDING
# =========================

@dataclass
class Branding:
    app_title: str = "Aventa Race Intelligence (ARI)"
    team_name: str = "Oracle RedBull Racing"
    logo_path: str = "assets/logo.jpg"
    app_icon_path: str = "assets/app_icon.jpg"

    color_bg: str = "#272727"
    color_panel: str = "#353535"
    color_panel_2: str = "#121212"
    color_text: str = "#f0f0f0"
    color_muted: str = "#ee304c"

    font_family: str = "Akira Expanded, Segoe UI, Arial, sans-serif"
    font_size: int = 10

    sidebar_width: int = 180
    header_height: int = 64


BRAND = Branding()

# =========================
# STYLESHEET
# =========================

def build_stylesheet(b: Branding) -> str:
    return f"""
    * {{
        font-family: "{b.font_family}";
        font-size: {b.font_size}pt;
        color: {b.color_text};
    }}

    QMainWindow {{
        background: {b.color_bg};
    }}

    QFrame#Header {{
        background: {b.color_panel};
        border-bottom: 1px solid rgba(255,255,255,0.06);
    }}

    QFrame#Sidebar {{
        background: {b.color_panel_2};
        border-right: 1px solid rgba(255,255,255,0.06);
    }}

    QPushButton {{
        background: rgba(255,255,255,0.04);
        border-radius: 10px;
        padding: 10px 12px;
        border: 1px solid transparent;
        text-align: left;
    }}

    QPushButton:hover {{
        background: rgba(238, 48, 76, 0.85);
        color: #ffffff;
    }}

    QPushButton:checked {{
        background: rgba(238, 48, 76, 0.85);
        font-weight: 600;
        color: #ffffff;
    }}

    QFrame#Card {{
        background: {b.color_panel};
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.08);
    }}

    QLabel#Title {{
        font-size: 14pt;
        font-weight: 700;
    }}

    QLabel#Subtle {{
        color: {b.color_muted};
    }}
    """

# =========================
# TELEMETRY SNAPSHOT
# =========================

@dataclass
class TelemetrySnapshot:
    source: str
    speed_kph: float
    speed_mph: float
    rpm: int
    gear: int
    lap: int
    session_time: float

    lap_last: Optional[float]
    lap_best: Optional[float]
    lap_current: Optional[float]
    lap_dist_pct: float
    predicted_lap: Optional[float]

    throttle: float
    brake: float
    steer: float

    wheel_fl: float
    wheel_fr: float
    wheel_rl: float
    wheel_rr: float

    brake_pct: float
    throttle_pct: float
    steer_angle_deg: float

    engine_water_temp: Optional[float]
    engine_oil_temp: Optional[float]

    fuel_level: Optional[float]
    fuel_used_lap: Optional[float]
    fuel_est_laps: Optional[float]


    @staticmethod
    def from_dict(d: dict) -> "TelemetrySnapshot":
        return TelemetrySnapshot(
            # --- Core ---
            source=d.get("source", "UNKNOWN"),
            speed_kph=float(d.get("speed_kph", 0.0)),
            speed_mph=float(d.get("speed_mph", 0.0)),
            rpm=int(d.get("rpm", 0)),
            gear=int(d.get("gear", 0)),
            lap=int(d.get("lap", 0)),
            session_time=float(d.get("session_time", 0.0)),

            # --- Lap Timing ---
            lap_last=d.get("LapLastLapTime"),
            lap_best=d.get("LapBestLapTime"),
            lap_current=d.get("LapCurrentLapTime"),
            lap_dist_pct=float(d.get("lap_dist_pct", 0.0)),
            predicted_lap=d.get("predicted_lap"),

            # --- Driver Inputs ---
            throttle=float(d.get("throttle", 0.0)),
            brake=float(d.get("brake", 0.0)),
            steer=float(d.get("steer", 0.0)),

            # --- Wheel Speeds ---
            wheel_fl=float(d.get("WheelSpeedFL", 0.0)),
            wheel_fr=float(d.get("WheelSpeedFR", 0.0)),
            wheel_rl=float(d.get("WheelSpeedRL", 0.0)),
            wheel_rr=float(d.get("WheelSpeedRR", 0.0)),

            # --- Derived Inputs ---
            brake_pct=float(d.get("brake", 0.0)),
            throttle_pct=float(d.get("throttle", 0.0)),
            steer_angle_deg=float(d.get("steer", 0.0)),

            # --- Powertrain ---
            engine_water_temp=d.get("engine_water_temp"),
            engine_oil_temp=d.get("engine_oil_temp"),

            # --- Fuel ---
            fuel_level=d.get("fuel_level"),
            fuel_used_lap=d.get("fuel_used_lap"),
            fuel_est_laps=d.get("fuel_est_laps"),
        )


# =========================
# MAIN WINDOW
# =========================

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle(BRAND.app_title)
        self.setWindowIcon(QIcon(BRAND.app_icon_path))
        self.setMinimumSize(1200, 700)

        # ---- Root Stack ----
        self.root_stack = QStackedWidget()
        self.setCentralWidget(self.root_stack)

        # ---- Welcome ----
        self.page_welcome = WelcomePage(background_path="assets/welcome_bg.png")
        self.page_welcome.start_requested.connect(self._enter_ari)
        self.root_stack.addWidget(self.page_welcome)

        # ---- ARI Container (must exist BEFORE enter_ari) ----
        self._ari_container = QWidget()
        self.root_stack.addWidget(self._ari_container)

        self.root_stack.setCurrentWidget(self.page_welcome)

        self._ari_built = False

        from PyQt6.QtWidgets import QGraphicsOpacityEffect
        from PyQt6.QtCore import QPropertyAnimation

        self.ari_opacity = QGraphicsOpacityEffect(self._ari_container)
        self._ari_container.setGraphicsEffect(self.ari_opacity)
        self.ari_opacity.setOpacity(0.0)

        self.ari_fade_in = QPropertyAnimation(self.ari_opacity, b"opacity")
        self.ari_fade_in.setDuration(400)
        self.ari_fade_in.setStartValue(0.0)
        self.ari_fade_in.setEndValue(1.0)
        self.ari_fade_in.setEasingCurve(QEasingCurve.Type.InOutCubic)


    # =========================
    # BUILD ARI
    # =========================

    def _enter_ari(self):
        if self._ari_container.layout() is None:
            layout = QVBoxLayout(self._ari_container)
            layout.setContentsMargins(0, 0, 0, 0)

            self._build_ari_ui()
            layout.addWidget(self.ari_root)

        # Switch first (opacity = 0)
        self.root_stack.setCurrentWidget(self._ari_container)

        # Fade ARI in
        self.ari_fade_in.start()

        # Init telemetry AFTER fade begins
        self._init_telemetry()

        from telemetry.vehicle_dynamics import VehicleDynamics
        self.vehicle_dynamics = VehicleDynamics()

        

        # ================= MOCK LAP STATE =================
        self._mock_enabled = True  # toggle later via UI

        self._mock_lap_time = 0.0
        self._mock_last_lap = 0.0
        self._mock_best_lap = 0.0
        self._mock_session_best = 0.0

        self._mock_sector_times = [30.2, 28.9, 31.4]

    def _apply_mock_lap_progression(self, data: dict):
        """
        Mutates telemetry dict in-place to simulate lap timing
        """
        dt = self.timer.interval() / 1000.0  # ms → seconds
        self._mock_lap_time += dt

        # Simulate lap completion at ~90s
        if self._mock_lap_time >= 90.0:
            self._mock_last_lap = self._mock_lap_time

            if self._mock_best_lap == 0.0 or self._mock_last_lap < self._mock_best_lap:
                self._mock_best_lap = self._mock_last_lap

            if self._mock_session_best == 0.0 or self._mock_last_lap < self._mock_session_best:
                self._mock_session_best = self._mock_last_lap

            self._mock_lap_time = 0.0

        # Inject mock values
        data["LapCurrentLapTime"] = self._mock_lap_time
        data["LapLastLapTime"] = self._mock_last_lap
        data["LapBestLapTime"] = self._mock_best_lap
        data["SessionBestLapTime"] = self._mock_session_best

        data["LapBestLapTimeSector1"] = self._mock_sector_times[0]
        data["LapBestLapTimeSector2"] = self._mock_sector_times[1]
        data["LapBestLapTimeSector3"] = self._mock_sector_times[2]

        data["engine_water_temp"] = 92.0 + random.uniform(-1.5, 1.5)
        data["engine_oil_temp"] = 105.0 + random.uniform(-2.0, 2.0)

        data["fuel_level"] = max(0.0, self._mock_fuel_remaining)
        data["fuel_used_lap"] = self._mock_fuel_per_lap
        data["fuel_est_laps"] = (
            self._mock_fuel_remaining / self._mock_fuel_per_lap
            if self._mock_fuel_per_lap > 0 else 0.0
        )

        self._mock_fuel_remaining -= (
        self._mock_fuel_per_lap * (dt / self._mock_lap_target_time)
    )


    def _build_ari_ui(self):
        self.ari_root = QWidget(self._ari_container)

        layout = QVBoxLayout(self.ari_root)
        layout.setContentsMargins(0, 0, 0, 0)

        # ---------- Header ----------
        header = QFrame()
        header.setObjectName("Header")
        header.setFixedHeight(BRAND.header_height)

        hl = QHBoxLayout(header)

        self.logo = QLabel()
        self.logo.setFixedSize(44, 44)
        self.logo.setScaledContents(True)

        pm = QPixmap(BRAND.logo_path)
        if not pm.isNull():
            self.logo.setPixmap(pm)

        self.header_title = QLabel(BRAND.team_name)
        self.header_title.setObjectName("Title")

        self.header_status = QLabel("Idle")
        self.header_status.setObjectName("Subtle")
        self.header_status.setAlignment(Qt.AlignmentFlag.AlignRight)

        hl.addWidget(self.logo)
        hl.addWidget(self.header_title)
        hl.addStretch(1)
        hl.addWidget(self.header_status)

        layout.addWidget(header)

        # ---------- Body ----------
        body = QHBoxLayout()

        sidebar = QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(BRAND.sidebar_width)
        sl = QVBoxLayout(sidebar)

        self.sidebar_buttons = []

        def nav(text, page):
            btn = QPushButton(text)
            btn.setCheckable(True)
            btn.clicked.connect(lambda: self._set_page(page, btn))
            self.sidebar_buttons.append(btn)
            sl.addWidget(btn)
            return btn

        self.stack = QStackedWidget()

        self.page_dashboard = DashboardPage()
        self.page_controls = ControlsPage()
        self.page_inputs = TelemetryInputsPage()
        self.page_race = RaceMonitorPage()

        nav("Dashboard", self.page_dashboard).setChecked(True)
        nav("Controls", self.page_controls)
        nav("Inputs", self.page_inputs)
        nav("Race", self.page_race)

        sl.addStretch(1)

        self.stack.addWidget(self.page_dashboard)
        self.stack.addWidget(self.page_controls)
        self.stack.addWidget(self.page_inputs)
        self.stack.addWidget(self.page_race)

        body.addWidget(sidebar)
        body.addWidget(self.stack)

        layout.addLayout(body)

        QApplication.instance().setStyleSheet(build_stylesheet(BRAND))

    # =========================
    # TELEMETRY
    # =========================

    def _init_telemetry(self):
        self.telemetry = TelemetryClient()
        self.timer = QTimer(self)
        self.timer.setInterval(33)
        self.timer.timeout.connect(self.telemetry.update)

        self.telemetry.telemetry_updated.connect(self._on_telemetry)
        self.telemetry.status_changed.connect(self._on_status)

        self.race_state = RaceState()
        self.race_state.generate_mock_field()
        self.telemetry._mock_field = self.race_state

        self.alert_engine = AlertEngine()
        self.delta_engine = DeltaEngine()
        self.strategy_engine = StrategyEngine()
        self.session_engine = SessionEngine()

        self.page_controls.start_updates_requested.connect(self._start_updates)
        self.page_controls.stop_updates_requested.connect(self._stop_updates)
        self.page_controls.use_mph_changed.connect(self._set_speed_unit)

    # =========================
    # HANDLERS
    # =========================

    def _on_status(self, text):
        self.header_status.setText(text)

    def _on_telemetry(self, data):

        # 1️⃣ Inject mock lap progression FIRST
        if self._mock_enabled:
            self._apply_mock_lap_progression(data)
            self._mock_fuel_remaining = 45.0   # litres
            self._mock_fuel_per_lap = 2.1      # litres/lap
            self._mock_lap_target_time = 90.0  # seconds

        # 2️⃣ Build snapshot AFTER data is final
        snap = TelemetrySnapshot.from_dict(data)

        dynamics = self.vehicle_dynamics.update(snap)

        if dynamics:
            self.page_dashboard.apply_vehicle_dynamics(dynamics)

        # ================= CORE TELEMETRY =================
        self.page_dashboard.apply_telemetry(
            snap, self.page_controls.chk_mph.isChecked()
        )
        self.page_inputs.apply_telemetry(snap)

        self.page_race.apply_relative(self.race_state)
        self.page_race.apply_race_info(self.race_state)

        delta = self.delta_engine.update(snap)
        self.page_dashboard.apply_delta(delta)
        self.page_race.apply_delta(delta)

        text, conf, prio = self.strategy_engine.update(self.race_state, snap)
        self.page_dashboard.apply_strategy(text, conf, prio)

        # ================= LAP TIMES =================
        current = data.get("LapCurrentLapTime", 0.0)
        last = data.get("LapLastLapTime", 0.0)
        best = data.get("LapBestLapTime", 0.0)

        s1 = data.get("LapBestLapTimeSector1", 0.0)
        s2 = data.get("LapBestLapTimeSector2", 0.0)
        s3 = data.get("LapBestLapTimeSector3", 0.0)

        theoretical = s1 + s2 + s3 if s1 > 0 and s2 > 0 and s3 > 0 else 0.0

        session_best = data.get("SessionBestLapTime", 0.0)

        delta_sb = (
            current - session_best
            if current > 0 and session_best > 0
            else 0.0
        )

        delta_pb = (
            current - best
            if current > 0 and best > 0
            else 0.0
        )

        # 3️⃣ THIS IS THE MISSING LINK
        self.page_dashboard.apply_lap_times(
            current=current,
            last=last,
            best=best,
            theoretical=theoretical,
            delta_pb=delta_pb,
            delta_sb=delta_sb,
        )


    def _set_page(self, page, btn):
        self.stack.setCurrentWidget(page)
        for b in self.sidebar_buttons:
            b.setChecked(b is btn)

    def _set_speed_unit(self, use_mph):
        self.page_dashboard.apply_telemetry(None, use_mph)

    def _start_updates(self):
        self.telemetry.connect()
        self.timer.start()

    def _stop_updates(self):
        self.timer.stop()

# =========================
# ENTRY
# =========================

def main():
    app = QApplication(sys.argv)
    app.setFont(QFont(BRAND.font_family, BRAND.font_size))
    win = MainWindow()
    win.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
