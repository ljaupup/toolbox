from __future__ import annotations

import json
from typing import Any

import yaml

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin


class FormatValidatorPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._last_mode = "json"
        self._last_operation = "format"
        self._is_valid = True
        self._message = "待命"
        self._output = ""

    def actions(self) -> list[str]:
        return ["process", "clear"]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "clear":
            self._output = ""
            self._is_valid = True
            self._message = "已清空"
            self.emit_state_changed()
            return {"state": self.export_state()}

        if action != "process":
            raise ValueError(f"unknown action: {action}")

        mode = str(payload.get("mode", "json")).strip().lower()
        operation = str(payload.get("operation", "format")).strip().lower()
        text = str(payload.get("text", ""))
        indent = max(2, min(int(payload.get("indent", 2)), 8))

        if mode not in {"json", "yaml"}:
            raise ValueError("mode 仅支持 json 或 yaml")
        if operation not in {"format", "validate"}:
            raise ValueError("operation 仅支持 format 或 validate")

        self._last_mode = mode
        self._last_operation = operation

        try:
            if mode == "json":
                parsed = json.loads(text)
                if operation == "format":
                    self._output = json.dumps(parsed, ensure_ascii=False, indent=indent)
                else:
                    self._output = ""
            else:
                parsed = yaml.safe_load(text)
                if operation == "format":
                    self._output = yaml.safe_dump(
                        parsed,
                        allow_unicode=True,
                        sort_keys=False,
                        default_flow_style=False,
                        indent=indent,
                    )
                else:
                    self._output = ""

            self._is_valid = True
            self._message = "格式正确" if operation == "validate" else "格式化完成"
            self.context.logger.emit(
                level="INFO",
                log_type="audit",
                event="format_validator.process",
                tool_id=self.manifest.id,
                result="ok",
                message=self._message,
                payload={"mode": mode, "operation": operation},
            )
        except Exception as exc:  # noqa: BLE001
            self._is_valid = False
            self._message = str(exc)
            self._output = ""
            self.context.logger.emit(
                level="WARN",
                log_type="error",
                event="format_validator.invalid",
                tool_id=self.manifest.id,
                result="failed",
                message=self._message,
                payload={"mode": mode, "operation": operation},
            )

        self.emit_state_changed()
        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return {
            "lastMode": self._last_mode,
            "lastOperation": self._last_operation,
            "isValid": self._is_valid,
            "message": self._message,
            "output": self._output,
        }
