from PyQt6.QtWidgets import (
    QWidget, QLabel, QPushButton, QVBoxLayout, QGraphicsOpacityEffect
)
from PyQt6.QtCore import (
    Qt, pyqtSignal, QPropertyAnimation, QUrl, QTimer
)
from PyQt6.QtGui import QPixmap, QFont, QColor
from PyQt6.QtMultimedia import QSoundEffect
from PyQt6.QtCore import QEasingCurve
from PyQt6.QtWidgets import QGraphicsDropShadowEffect
from PyQt6.QtGui import QFontDatabase


class WelcomePage(QWidget):
    """
    Welcome / Launch Screen for ARI
    Emits start_requested AFTER fade-out
    """

    start_requested = pyqtSignal()

    def __init__(self, background_path: str | None = None):
        super().__init__()

        self.setObjectName("WelcomePage")
        self.setMinimumSize(1280, 720)

        # ================= FONT =================
        font_id = QFontDatabase.addApplicationFont(
            "assets/fonts/akira-expanded.otf"
        )

        if font_id == -1:
            print("❌ Failed to load Akira Expanded")
            self.akira_family = "Arial"
        else:
            self.akira_family = QFontDatabase.applicationFontFamilies(font_id)[0]

        creato_font_id = QFontDatabase.addApplicationFont(
            "assets/fonts/creatodisplay-bold.otf"
        )

        if creato_font_id == -1:
            print("❌ Failed to load Creato Display Bold")
            self.creato_family = "Arial"
        else:
            self.creato_family = QFontDatabase.applicationFontFamilies(creato_font_id)[0]

        # ================= BACKGROUND =================
        if background_path:
            self._set_background(background_path)

        # ================= ROOT LAYOUT =================
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # =====================================================
        # CENTER CONTAINER (HOLDS LOGO + CTA, STAYS CENTERED)
        # =====================================================
        center_container = QWidget(self)
        center_layout = QVBoxLayout(center_container)
        center_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        center_layout.setSpacing(6)

        # ================= FOOTER (ABSOLUTE, ALWAYS VISIBLE) =================
        self.footer = QLabel("© 2026 Aventa Race Intelligence. All rights reserved.", self)
        self.footer.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.footer.setFont(QFont(self.creato_family, 8))
        self.footer.setStyleSheet("""
            color: rgba(255, 255, 255, 120);
            letter-spacing: 1px;
        """)
        self.footer.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.footer.raise_()

        # ================= TITLE LAYER =================
        self.title_layer = QWidget(center_container)
        title_layout = QVBoxLayout(self.title_layer)
        title_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_layout.setSpacing(2)

        # ================= LOGO =================
        self.logo = QLabel(self.title_layer)
        self.logo.setAlignment(Qt.AlignmentFlag.AlignCenter)

        pixmap = QPixmap("assets/ari_logo.png")
        scaled_pixmap = pixmap.scaledToHeight(
            100, Qt.TransformationMode.SmoothTransformation
        )

        self.logo.setPixmap(scaled_pixmap)
        self.logo.setFixedSize(scaled_pixmap.size())
        self.logo.setScaledContents(False)

        title_layout.addWidget(self.logo)

        # ================= LOGO DEPTH LIGHTING =================
        self.logo_glow_red = QGraphicsDropShadowEffect(self.logo)
        self.logo_glow_red.setOffset(0, 0)
        self.logo_glow_red.setBlurRadius(34)
        self.logo_glow_red.setColor(QColor(225, 6, 0, 70))

        self.logo_glow_white = QGraphicsDropShadowEffect(self.logo)
        self.logo_glow_white.setOffset(0, 0)
        self.logo_glow_white.setBlurRadius(16)
        self.logo_glow_white.setColor(QColor(255, 255, 255, 90))

        self.logo.setGraphicsEffect(self.logo_glow_white)
        self.logo_glow_red.setParent(self.logo)

        # ================= BREATHING ANIMATION =================
        self.red_glow_anim = QPropertyAnimation(
            self.logo_glow_red, b"blurRadius"
        )
        self.red_glow_anim.setDuration(2600)
        self.red_glow_anim.setStartValue(30)
        self.red_glow_anim.setEndValue(36)
        self.red_glow_anim.setEasingCurve(QEasingCurve.Type.InOutSine)
        self.red_glow_anim.setLoopCount(-1)
        self.red_glow_anim.start()

        self.white_glow_anim = QPropertyAnimation(
            self.logo_glow_white, b"blurRadius"
        )
        self.white_glow_anim.setDuration(2600)
        self.white_glow_anim.setStartValue(18)
        self.white_glow_anim.setEndValue(14)
        self.white_glow_anim.setEasingCurve(QEasingCurve.Type.InOutSine)
        self.white_glow_anim.setLoopCount(-1)
        self.white_glow_anim.start()

        # ================= CTA =================
        self.cta_layer = QWidget(center_container)
        cta_layout = QVBoxLayout(self.cta_layer)
        cta_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        cta_layout.setContentsMargins(0, 0, 0, 0)

        self.start_btn = QPushButton("Race")
        self.start_btn.setFixedSize(220, 56)
        self.start_btn.setFont(QFont(self.akira_family, 11))
        self.start_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.start_btn.clicked.connect(self._on_start)

        self.start_btn.setStyleSheet("""
            QPushButton {
                background-color: #E10600;
                color: #FFFFFF;
                border: none;
                border-radius: 8px;
            }
            QPushButton:hover {
                background-color: #FF1E1E;
            }
            QPushButton:pressed {
                background-color: #B80000;
            }
        """)

        cta_layout.addWidget(self.start_btn)

        # ================= BUTTON GLOW =================
        self.glow = QGraphicsDropShadowEffect(self.start_btn)
        self.glow.setBlurRadius(8)
        self.glow.setOffset(0, 0)
        self.glow.setColor(Qt.GlobalColor.red)
        self.start_btn.setGraphicsEffect(self.glow)

        self.glow_anim = QPropertyAnimation(self.glow, b"blurRadius")
        self.glow_anim.setDuration(220)
        self.glow_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

        self.start_btn.enterEvent = self._on_btn_hover
        self.start_btn.leaveEvent = self._on_btn_leave

        # ================= CENTER STACK =================
        center_layout.addWidget(self.title_layer)
        center_layout.addWidget(self.cta_layer)

        # ================= FINAL ROOT STACK =================
        root.addWidget(center_container, 1)
        center_container.raise_()

        # ================= SOUND =================
        self.start_sound = QSoundEffect(self)
        self.start_sound.setSource(QUrl.fromLocalFile("assets/ui_start.wav"))
        self.start_sound.setVolume(0.6)

        # ================= FADE =================
        self.cta_opacity = QGraphicsOpacityEffect(self.cta_layer)
        self.cta_layer.setGraphicsEffect(self.cta_opacity)

        self.fade_out = QPropertyAnimation(self.cta_opacity, b"opacity")
        self.fade_out.setDuration(400)
        self.fade_out.setStartValue(1.0)
        self.fade_out.setEndValue(0.0)
        self.fade_out.setEasingCurve(QEasingCurve.Type.OutCubic)
        self.fade_out.finished.connect(self.start_requested.emit)

    # ---------------- Hover In ----------------
    def _on_btn_hover(self, event):
        self.glow_anim.stop()
        self.glow_anim.setStartValue(self.glow.blurRadius())
        self.glow_anim.setEndValue(28)
        self.glow_anim.start()
        event.accept()

    # ---------------- Hover Out ----------------
    def _on_btn_leave(self, event):
        self.glow_anim.stop()
        self.glow_anim.setStartValue(self.glow.blurRadius())
        self.glow_anim.setEndValue(8)
        self.glow_anim.start()
        event.accept()

    # ---------------- BACKGROUND ----------------
    def _set_background(self, image_path: str):
        pixmap = QPixmap(image_path)
        self.bg = QLabel(self)
        self.bg.setPixmap(pixmap)
        self.bg.setScaledContents(True)
        self.bg.setGeometry(self.rect())
        self.bg.lower()
        
        self.overlay = QLabel(self.bg)
        self.overlay.setStyleSheet("background-color: rgba(0, 0, 0, 120);")
        self.overlay.setGeometry(self.bg.rect())

    def resizeEvent(self, event):
        super().resizeEvent(event)

        # Background + overlay
        if hasattr(self, "bg"):
            self.bg.setGeometry(self.rect())
            self.overlay.setGeometry(self.bg.rect())

        # Footer geometry (THIS IS THE MISSING PIECE)
        footer_height = 50
        self.footer.setGeometry(
            0,
            self.height() - footer_height - 10,
            self.width(),
            footer_height
        )

    # ---------------- START ----------------
    def _on_start(self):
        self.start_btn.setEnabled(False)

        if self.start_sound.status() == QSoundEffect.Status.Ready:
            self.start_sound.play()

        QTimer.singleShot(40, self.fade_out.start)

        self.red_glow_anim.stop()
        self.white_glow_anim.stop()
