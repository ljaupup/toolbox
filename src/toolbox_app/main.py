from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication

from toolbox_app.app import ToolboxWindow


def main() -> int:
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_ShareOpenGLContexts)
    app = QApplication(sys.argv)
    app.setApplicationName("自定义工具箱")

    icon = _load_app_icon()
    app.setWindowIcon(icon)

    window = ToolboxWindow()
    window.setWindowIcon(icon)
    window.show()
    return app.exec()


def _load_app_icon() -> QIcon:
    icon_path = Path(__file__).resolve().parent / "assets" / "icons" / "toolbox.ico"
    if icon_path.exists():
        return QIcon(str(icon_path))
    return QIcon()
