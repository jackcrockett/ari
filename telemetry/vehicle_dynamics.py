class VehicleDynamics:
    def __init__(self):
        self._last_time = None
        self._last_steer = 0.0
        self._last_throttle = 0.0
        self._last_brake = 0.0

    def update(self, snapshot):
        if self._last_time is None:
            self._prime(snapshot)
            return None

        dt = snapshot.session_time - self._last_time
        if dt <= 0:
            return None

        steer_rate = (snapshot.steer_angle_deg - self._last_steer) / dt
        throttle_rate = (snapshot.throttle_pct - self._last_throttle) / dt
        brake_rate = (snapshot.brake_pct - self._last_brake) / dt

        combined_load = min(
            100.0,
            snapshot.throttle_pct + snapshot.brake_pct
        )

        self._prime(snapshot)

        return {
            "steer_rate": steer_rate,
            "throttle_rate": throttle_rate,
            "brake_rate": brake_rate,
            "combined_load": combined_load,
        }

    def _prime(self, snapshot):
        self._last_time = snapshot.session_time
        self._last_steer = snapshot.steer_angle_deg
        self._last_throttle = snapshot.throttle_pct
        self._last_brake = snapshot.brake_pct
