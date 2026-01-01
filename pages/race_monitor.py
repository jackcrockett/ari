from PyQt6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame
from PyQt6.QtCore import Qt
from telemetry.delta_renderer import DeltaRenderer



class RaceMonitorPage(QWidget):
    """
    Read-only race monitor.
    Displays relative positions, race status, and delta.
    """

    def __init__(self):
        super().__init__()

        self.delta_renderer = DeltaRenderer()

        root = QVBoxLayout(self)
        root.setContentsMargins(18, 18, 18, 18)
        root.setSpacing(14)

        # ---------- Header ----------
        header = QHBoxLayout()
        title = QLabel("Race Monitor")
        title.setObjectName("Title")
        header.addWidget(title)
        header.addStretch(1)
        root.addLayout(header)

        # ==================================================
        # Relative Panel (±3)
        # ==================================================
        self.panel_relative = self._panel("Relative (±3)")
        self.relative_rows = []

        for _ in range(7):  # ±3 + YOU
            row = QHBoxLayout()

            lbl_pos = QLabel("--")
            lbl_name = QLabel("--")
            lbl_gap = QLabel("--")

            lbl_pos.setFixedWidth(40)
            lbl_gap.setFixedWidth(80)
            lbl_gap.setAlignment(Qt.AlignmentFlag.AlignRight)

            row.addWidget(lbl_pos)
            row.addWidget(lbl_name)
            row.addStretch(1)
            row.addWidget(lbl_gap)

            self.panel_relative.layout().addLayout(row)
            self.relative_rows.append((lbl_pos, lbl_name, lbl_gap))

        root.addWidget(self.panel_relative)

        # ==================================================
        # Status Panel
        # ==================================================
        self.panel_status = self._panel("Status")

        self.lbl_flag = QLabel("Flag: --")
        self.lbl_laps = QLabel("Lap: -- / --")
        self.lbl_incidents = QLabel("Incidents: --")
        self.lbl_delta = QLabel("Delta: --")

        for lbl in (self.lbl_flag, self.lbl_laps, self.lbl_incidents, self.lbl_delta):
            lbl.setObjectName("Subtle")
            self.panel_status.layout().addWidget(lbl)

        # Delta bar
        self.delta_bar = QFrame()
        self.delta_bar.setFixedHeight(8)
        self.delta_bar.setStyleSheet("""
            QFrame {
                background: rgba(255,255,255,0.08);
                border-radius: 4px;
            }
        """)

        self.delta_fill = QFrame(self.delta_bar)
        self.delta_fill.setGeometry(0, 0, 0, 8)

        self.panel_status.layout().addWidget(self.delta_bar)
        root.addWidget(self.panel_status)

        root.addStretch(1)

    # ==================================================
    # Helpers
    # ==================================================
    def _panel(self, title: str) -> QFrame:
        frame = QFrame()
        frame.setObjectName("Card")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(6)

        lbl = QLabel(title)
        lbl.setObjectName("Subtle")
        layout.addWidget(lbl)

        return frame

    # ==================================================
    # Apply Methods (CALLED BY MainWindow)
    # ==================================================
    def apply_relative(self, state):
        window = state.relative_window(span=3)
        you = state.your_driver()

        for i, (lbl_pos, lbl_name, lbl_gap) in enumerate(self.relative_rows):
            if i >= len(window):
                lbl_pos.setText("--")
                lbl_name.setText("--")
                lbl_gap.setText("--")
                lbl_name.setStyleSheet("")
                continue

            d = window[i]
            lbl_pos.setText(f"P{d.position}")
            lbl_name.setText(d.name)

            if d is you:
                lbl_gap.setText("0.00")
                lbl_name.setStyleSheet("font-weight: 700;")
            else:
                lbl_name.setStyleSheet("")
                sign = "+" if d.gap_to_you > 0 else ""
                lbl_gap.setText(f"{sign}{d.gap_to_you:.2f}")

    def apply_race_info(self, state):
        self.lbl_flag.setText(f"Flag: {state.flag}")
        self.lbl_laps.setText(f"Lap: {state.current_lap} / {state.total_laps}")
        self.lbl_incidents.setText(f"Incidents: {state.your_incidents()}")

    def apply_delta(self, delta):
        if delta is None:
            self.lbl_delta.setText("Delta: --")
        else:
            self.lbl_delta.setText(f"Delta: {delta:+.2f}")

        self.delta_renderer.update(
            self.delta_fill,
            self.delta_bar,
            delta
        )

    def apply_events(self, alerts):
        """
        Update events feed.
        Safe no-op if events UI is not present yet.
        """

        # If this page doesn't currently render events,
        # we intentionally do nothing to avoid breaking ARI.
        return


