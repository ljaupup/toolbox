from __future__ import annotations

from typing import Any

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin

from .service import TimeConverterService


class TimeConverterPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._service = TimeConverterService(self)
        self._service.state_changed.connect(self.emit_state_changed)

    def actions(self) -> list[str]:
        return ["now", "convert", "clear"]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "clear":
            self._service.clear()
            return {"state": self.export_state()}

        if action == "now":
            self._service.refresh_now()
            return {"state": self.export_state()}

        if action != "convert":
            raise ValueError(f"unknown action: {action}")

        mode = str(payload.get("mode", "timestamp_to_datetime")).strip().lower()
        timestamp_unit = str(payload.get("timestamp_unit", "auto")).strip().lower()
        timezone_mode = str(payload.get("timezone", "local")).strip().lower()
        value = str(payload.get("value", "")).strip()
        self._service.convert(
            mode=mode,
            value=value,
            timestamp_unit=timestamp_unit,
            timezone_mode=timezone_mode,
        )

        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return self._service.export_state()
