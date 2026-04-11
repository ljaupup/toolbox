from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QUrl
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QMainWindow

from toolbox_app.bridge import ToolboxBridge


class ToolboxWebPage(QWebEnginePage):
    def javaScriptConsoleMessage(self, level, message, line_number, source_id) -> None:  # type: ignore[override]
        print(f"[web:{level.name}] {source_id}:{line_number} {message}")


class ToolboxWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("自定义工具箱")
        self.resize(1280, 800)
        self.setMinimumSize(960, 640)

        self._bridge = ToolboxBridge(self)
        self._channel = QWebChannel(self)
        self._channel.registerObject("toolboxBridge", self._bridge)

        self._profile = self._build_profile()
        self._view = QWebEngineView(self)
        self._page = ToolboxWebPage(self._profile, self._view)
        self._page.setWebChannel(self._channel)

        settings = self._page.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)

        self._view.setPage(self._page)
        self.setCentralWidget(self._view)
        self._load_frontend()

    def _build_profile(self) -> QWebEngineProfile:
        project_root = Path(__file__).resolve().parents[2]
        cache_root = project_root / ".qtwebengine"
        cache_root.mkdir(exist_ok=True)
        (cache_root / "cache").mkdir(exist_ok=True)
        (cache_root / "storage").mkdir(exist_ok=True)

        profile = QWebEngineProfile("custom-toolbox", self)
        profile.setCachePath(str(cache_root / "cache"))
        profile.setPersistentStoragePath(str(cache_root / "storage"))
        return profile

    def _load_frontend(self) -> None:
        base_dir = Path(__file__).resolve().parent / "web"
        self._view.load(QUrl.fromLocalFile(str(base_dir / "index.html")))
