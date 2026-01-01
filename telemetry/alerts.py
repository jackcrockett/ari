from dataclasses import dataclass
import time


@dataclass
class Alert:
    timestamp: float
    level: str        # INFO | WARN | CRITICAL
    message: str

    def age(self) -> float:
        return time.time() - self.timestamp
