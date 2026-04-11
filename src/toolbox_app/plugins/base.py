from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from PySide6.QtCore import QObject, Signal

from toolbox_app.logging.core import LogCore


@dataclass(slots=True)
class ToolManifest:
    id: str
    name: str
    entry: str
    summary: str = ""
    eyebrow: str = "TOOL"
    version: str = "0.1.0"
    category: str = "general"
    permissions: list[str] = field(default_factory=list)
    ui: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ToolContext:
    logger: LogCore


class ToolPlugin(QObject):
    state_changed = Signal()
    toast_raised = Signal(str, str)

    def __init__(self, manifest: ToolManifest, context: ToolContext, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._manifest = manifest
        self._context = context

    @property
    def manifest(self) -> ToolManifest:
        return self._manifest

    @property
    def context(self) -> ToolContext:
        return self._context

    def actions(self) -> list[str]:
        raise NotImplementedError

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    def export_state(self) -> dict[str, Any]:
        raise NotImplementedError

    def on_startup(self) -> None:
        pass

    def on_shutdown(self) -> None:
        pass

    def to_tool_card(self) -> dict[str, Any]:
        return {
            "key": self._manifest.id,
            "id": self._manifest.id,
            "title": self._manifest.name,
            "summary": self._manifest.summary,
            "eyebrow": self._manifest.eyebrow,
            "category": self._manifest.category,
            "version": self._manifest.version,
            "permissions": self._manifest.permissions,
            "ui": self._manifest.ui,
            "actions": self.actions(),
        }

    def emit_state_changed(self) -> None:
        self.state_changed.emit()

    def emit_toast(self, level: str, message: str) -> None:
        self.toast_raised.emit(level, message)
