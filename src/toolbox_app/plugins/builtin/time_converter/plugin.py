from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin


class TimeConverterPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._status_text = "待命"
        self._input_value = ""
        self._output_value = ""
        self._last_direction = "ts_to_iso"
        self._now_iso = ""
        self._now_ts = 0

    def actions(self) -> list[str]:
        return ["now", "convert", "clear"]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "clear":
            self._status_text = "已清空"
            self._input_value = ""
            self._output_value = ""
            self.emit_state_changed()
            return {"state": self.export_state()}

        if action == "now":
            now = datetime.now().astimezone()
            self._now_iso = now.isoformat(timespec="seconds")
            self._now_ts = int(now.timestamp())
            self._status_text = "已刷新当前时间"
            self.emit_state_changed()
            return {"state": self.export_state()}

        if action != "convert":
            raise ValueError(f"unknown action: {action}")

        direction = str(payload.get("direction", "ts_to_iso")).strip().lower()
        use_utc = bool(payload.get("use_utc", False))
        value = str(payload.get("value", "")).strip()
        if not value:
            raise ValueError("value 不能为空")

        self._input_value = value
        self._last_direction = direction

        if direction == "ts_to_iso":
            timestamp = float(value)
            tz = timezone.utc if use_utc else None
            dt = datetime.fromtimestamp(timestamp, tz=tz).astimezone() if tz is None else datetime.fromtimestamp(timestamp, tz=tz)
            self._output_value = dt.isoformat(timespec="seconds")
            self._status_text = "转换完成（时间戳 -> ISO）"
        elif direction == "iso_to_ts":
            normalized = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalized)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc if use_utc else datetime.now().astimezone().tzinfo)
            self._output_value = str(int(dt.timestamp()))
            self._status_text = "转换完成（ISO -> 时间戳）"
        else:
            raise ValueError("direction 仅支持 ts_to_iso 或 iso_to_ts")

        self.emit_state_changed()
        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return {
            "statusText": self._status_text,
            "lastDirection": self._last_direction,
            "inputValue": self._input_value,
            "outputValue": self._output_value,
            "nowIso": self._now_iso,
            "nowTimestamp": self._now_ts,
        }
