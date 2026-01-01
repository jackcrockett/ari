from __future__ import annotations

from PyQt6.QtWidgets import (
    QWidget,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QHBoxLayout,
    QSpinBox,
    QFrame,
)
from PyQt6.QtCore import pyqtSignal



class ControlsPage(QWidget):
    debug_mode_changed = pyqtSignal(bool)
    
    """
    Controls page.
    Emits signals only — no telemetry ownership.
    """

    connect_requested = pyqtSignal()
    disconnect_requested = pyqtSignal()
    start_updates_requested = pyqtSignal()
    stop_updates_requested = pyqtSignal()
    update_rate_changed = pyqtSignal(int)
    use_mph_changed = pyqtSignal(bool)

    def __init__(self):
        super().__init__()

        root = QVBoxLayout(self)
        root.setContentsMargins(18, 18, 18, 18)
        root.setSpacing(14)

        # -------- Header --------
        title_row = QHBoxLayout()

        title = QLabel("Controls")
        title.setObjectName("Title")

        subtitle = QLabel("Connection & update settings")
        subtitle.setObjectName("Subtle")

        title_row.addWidget(title)
        title_row.addStretch(1)
        title_row.addWidget(subtitle)

        root.addLayout(title_row)

        # -------- Card --------
        card = QFrame()
        card.setObjectName("Card")

        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(14, 12, 14, 12)
        card_layout.setSpacing(12)

        # ---- Connect / Disconnect ----
        btn_row = QHBoxLayout()

        btn_connect = QPushButton("Connect to iRacing")
        btn_disconnect = QPushButton("Disconnect")

        btn_connect.clicked.connect(self.connect_requested.emit)
        btn_disconnect.clicked.connect(self.disconnect_requested.emit)

        btn_row.addWidget(btn_connect)
        btn_row.addWidget(btn_disconnect)

        card_layout.addLayout(btn_row)

        # ---- Start / Stop ----
        upd_row = QHBoxLayout()

        btn_start = QPushButton("Start Updates")
        btn_stop = QPushButton("Stop Updates")

        btn_start.clicked.connect(self.start_updates_requested.emit)
        btn_stop.clicked.connect(self.stop_updates_requested.emit)

        upd_row.addWidget(btn_start)
        upd_row.addWidget(btn_stop)

        card_layout.addLayout(upd_row)

        # ---- Update rate ----
        rate_row = QHBoxLayout()
        rate_row.addWidget(QLabel("Update rate (ms):"))

        self.spin_rate = QSpinBox()
        self.spin_rate.setRange(50, 2000)
        self.spin_rate.setSingleStep(50)
        self.spin_rate.setValue(100)

        self.spin_rate.valueChanged.connect(self.update_rate_changed.emit)

        rate_row.addWidget(self.spin_rate)
        rate_row.addStretch(1)

        card_layout.addLayout(rate_row)

        root.addWidget(card)
        root.addStretch(1)

        # ---- Speed Unit ----
        unit_label = QLabel("Speed Unit")
        unit_label.setObjectName("Subtle")
        card_layout.addWidget(unit_label)

        self.chk_mph = QPushButton("MPH")
        self.chk_kmh = QPushButton("KM/H")

        for chk in (self.chk_mph, self.chk_kmh):
            chk.setCheckable(True)
            card_layout.addWidget(chk)

        # Default: MPH
        self.chk_mph.setChecked(True)
        self.chk_kmh.setChecked(False)

        self.chk_mph.clicked.connect(lambda: self._set_unit(True))
        self.chk_kmh.clicked.connect(lambda: self._set_unit(False))
    
        # ---- Debug Mode ----
        self.chk_debug = QPushButton("Debug Mode")
        self.chk_debug.setCheckable(True)
        self.chk_debug.setChecked(False)
        self.layout().addWidget(self.chk_debug)

        self.chk_debug.toggled.connect(self.debug_mode_changed.emit)

    def _set_unit(self, use_mph: bool):
        self.chk_mph.setChecked(use_mph)
        self.chk_kmh.setChecked(not use_mph)
        self.use_mph_changed.emit(use_mph)

    def set_unit_state(self, use_mph: bool):
        """
        Sync UI with canonical unit state.
        """
        self.chk_mph.setChecked(use_mph)
        self.chk_kmh.setChecked(not use_mph)



