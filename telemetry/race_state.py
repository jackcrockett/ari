from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
import statistics
import random
import time


# =========================
# DRIVER ENTRY
# =========================

@dataclass
class DriverState:
    car_idx: int
    name: str
    irating: int
    position: int
    gap_to_leader: float
    gap_to_you: float
    last_lap: Optional[float] = None
    best_lap: Optional[float] = None
    incidents: int = 0


# =========================
# RACE STATE (CANONICAL)
# =========================

@dataclass
class RaceState:
    session_type: str = "Race"
    total_laps: int = 40
    current_lap: int = 1
    flag: str = "GREEN"

    your_car_idx: int = 0
    drivers: List[DriverState] = field(default_factory=list)

    sof: Optional[int] = None
    last_update: float = field(default_factory=time.time)

    # ---------------------------
    # Derived helpers
    # ---------------------------

    def your_driver(self) -> Optional[DriverState]:
        for d in self.drivers:
            if d.car_idx == self.your_car_idx:
                return d
        return None
    
    def your_incidents(self) -> int:
        you = self.your_driver()
        return you.incidents if you else 0

    def relative_window(self, span: int = 3) -> List[DriverState]:
        """
        Returns ±N drivers around you.
        """
        you = self.your_driver()
        if not you:
            return []

        idx = self.drivers.index(you)
        start = max(0, idx - span)
        end = min(len(self.drivers), idx + span + 1)
        return self.drivers[start:end]
    
    def car_count(self) -> int:
        return len(self.drivers)
    

    # ---------------------------
    # Strength of Field
    # ---------------------------

    def calculate_sof(self):
        if not self.drivers:
            self.sof = None
            return

        irs = [d.irating for d in self.drivers]
        self.sof = int(statistics.mean(irs))

    # ---------------------------
    # MOCK GENERATION
    # ---------------------------

    def generate_mock_field(self, field_size: int = 24):
        """
        Create a believable mock race field.
        """
        self.drivers.clear()

        base_ir = random.randint(1500, 2800)

        for i in range(field_size):
            ir = int(random.gauss(base_ir, 350))
            gap = max(0.0, i * random.uniform(0.25, 0.8))

            self.drivers.append(
                DriverState(
                    car_idx=i,
                    name=f"Car {i+1}",
                    irating=max(800, ir),
                    position=i + 1,
                    gap_to_leader=gap,
                    gap_to_you=0.0,
                    incidents=random.randint(0, 4),
                )
            )

        self.your_car_idx = random.randint(0, field_size - 1)
        self._recalculate_relative_gaps()
        self.calculate_sof()

    def _recalculate_relative_gaps(self):
        you = self.your_driver()
        if not you:
            return

        for d in self.drivers:
            d.gap_to_you = d.gap_to_leader - you.gap_to_leader

        self.drivers.sort(key=lambda d: d.position)
