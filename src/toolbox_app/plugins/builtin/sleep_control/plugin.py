from __future__ import annotations

from typing import Any

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin

from .service import SleepService


class SleepControlPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._service = SleepService(self)
        self._service.state_changed.connect(self.emit_state_changed)
        self._service.toast_raised.connect(self.emit_toast)

    def actions(self) -> list[str]:
        return [
            "start_countdown",
            "cancel_plan",
            "sleep_now",
        ]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "start_countdown":
            minutes = int(payload.get("minutes", 20))
            self._service.start_countdown(minutes)
        elif action == "cancel_plan":
            self._service.cancel()
        elif action == "sleep_now":
            self._service.sleep_now()
        else:
            raise ValueError(f"unknown action: {action}")

        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return self._service.export_state()
