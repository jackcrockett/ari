from __future__ import annotations

import random
import math
import time


from PyQt6.QtCore import QObject, pyqtSignal

# ============================================================
# TELEMETRY CLIENT (UNCHANGED LOGIC)
# ============================================================

class TelemetryClient(QObject):
    telemetry_updated = pyqtSignal(dict)
    status_changed = pyqtSignal(str)

    def __init__(self):
        super().__init__()
        self._use_mock = True
        self._connected = False
        self._ir = None
        self._last_update = time.time()

        # MOCK STATE
        self._mock_speed = 0.0
        self._mock_rpm = 1200
        self._mock_gear = 2
        self._mock_lap = 1
        self._mock_dist = 0.0
        self._mock_lap_time = 0.0
        self._mock_last = None
        self._mock_best = None
        self._mock_fuel = 50.0
        self._mock_burn = 0.045
        self._mock_throttle = 0.0
        self._mock_brake = 0.0
        self._mock_steer = 0.0
        self._mock_field = None
        self._mock_last_positions = None


    def connect(self):
        try:
            import irsdk
            self._ir = irsdk.IRSDK()
            self._connected = self._ir.startup()
            self._use_mock = not self._connected
        except Exception:
            self._connected = False
            self._use_mock = True
            self._ir = None

        self.status_changed.emit(
            "Connected to iRacing" if self._connected else "MOCK mode"
        )

    def disconnect(self):
        self._connected = False
        self._use_mock = True
        self._ir = None
        self.status_changed.emit("Disconnected")

    def update(self):
        now = time.time()
        dt = now - self._last_update
        self._last_update = now

        if self._use_mock:
            self._update_mock(dt)
        else:
            self._update_iracing()

    # ---------------- MOCK ----------------
    def get_mock_field(self):
        """
        Returns mock field deltas per tick.
        """
        if self._mock_field is None:
            return None

        # Simulate small gap changes
        for d in self._mock_field.drivers:
            delta = random.uniform(-0.05, 0.08)
            d.gap_to_leader = max(0.0, d.gap_to_leader + delta)

        # Re-sort by gap
        self._mock_field.drivers.sort(key=lambda d: d.gap_to_leader)

        # Reassign positions
        for i, d in enumerate(self._mock_field.drivers):
            d.position = i + 1

        self._mock_field._recalculate_relative_gaps()
        return self._mock_field

    def _update_mock(self, dt):
        # ---------------- Speed / RPM ----------------
        self._mock_speed += random.uniform(-5, 8)
        self._mock_speed = max(0, min(290, self._mock_speed))
        self._mock_rpm = int(900 + self._mock_speed * 25)

        # ---------------- Distance / Laps ----------------
        self._mock_dist += dt * (self._mock_speed / 260) * 32
        self._mock_lap_time += dt

        if self._mock_dist >= 100:
            self._mock_dist -= 100
            self._mock_last = self._mock_lap_time
            if self._mock_best is None or self._mock_lap_time < self._mock_best:
                self._mock_best = self._mock_lap_time
            self._mock_lap_time = 0
            self._mock_lap += 1

        predicted = (
            self._mock_lap_time / (self._mock_dist / 100)
            if self._mock_dist > 1 else None
        )

        # ---------------- Fuel ----------------
        self._mock_fuel = max(0.0, self._mock_fuel - self._mock_burn * dt)
        est_laps = (
            self._mock_fuel / (predicted * self._mock_burn)
            if predicted else None
        )

        # ===============================
        # MOCK DRIVER INPUTS (NEW)
        # ===============================
        t = time.time()

        # Throttle: smooth 0 → 1
        self._mock_throttle = max(0.0, math.sin(t * 0.8))

        # Brake: inverse of throttle (never both high)
        self._mock_brake = max(0.0, math.sin(t * 0.8 + math.pi))

        # Steering: faster oscillation (-1 → +1)
        self._mock_steer = math.sin(t * 1.6)

        # ---------------- INCIDENT SIMULATION ----------------
        # Small chance of incident per tick (realistic)
        if random.random() < 0.002:  # ~1 incident every ~500 ticks
            you = self._mock_field.your_driver()
            if you:
                you.incidents += 1

        # ---------------- Emit ----------------
        self.telemetry_updated.emit({
            "source": "MOCK",
            "speed_kph": self._mock_speed,
            "speed_mph": self._mock_speed * 0.621371,
            "rpm": self._mock_rpm,
            "gear": self._mock_gear,
            "lap": self._mock_lap,
            "session_time": time.time(),
            "lap_last": self._mock_last,
            "lap_best": self._mock_best,
            "lap_current": self._mock_lap_time,
            "lap_dist_pct": self._mock_dist,
            "predicted_lap": predicted,
            "fuel_level": self._mock_fuel,
            "fuel_est_laps": est_laps,

            # 🔹 NEW INPUT CHANNELS
            "throttle": self._mock_throttle,
            "brake": self._mock_brake,
            "steer": self._mock_steer,
        })


    # ---------------- IRACING ----------------

    def _update_iracing(self):
        ir = self._ir
        if not ir or not ir.is_initialized:
            self.disconnect()
            return

        try:
            speed_mps = ir["Speed"]
            lap_cur = ir["LapCurrentLapTime"]
            lap_pct = ir["LapDistPct"] * 100

            predicted = (
                lap_cur / (lap_pct / 100)
                if lap_pct > 1 else None
            )

            self.telemetry_updated.emit({
                "source": "iRacing",
                "speed_kph": speed_mps * 3.6,
                "speed_mph": speed_mps * 2.236936,
                "rpm": int(ir["RPM"]),
                "gear": int(ir["Gear"]),
                "lap": int(ir["Lap"]),
                "session_time": ir["SessionTime"],
                "lap_last": ir["LapLastLapTime"],
                "lap_best": ir["LapBestLapTime"],
                "lap_current": lap_cur,
                "lap_dist_pct": lap_pct,
                "predicted_lap": predicted,
                "fuel_level": ir["FuelLevel"],
                "fuel_est_laps": None,
            })
        except Exception:
            self.disconnect()