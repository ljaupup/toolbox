from __future__ import annotations

import json
import os
import platform
import sys
import uuid
from pathlib import Path
from typing import Any

from PySide6.QtCore import QObject, Signal, Slot

from toolbox_app.logging.core import LogCore, LogQuery
from toolbox_app.plugins.registry import ToolRegistry
from toolbox_app.plugins.runtime import ToolRuntime


class ToolboxBridge(QObject):
    stateChanged = Signal(str)
    toastRaised = Signal(str, str)

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._workspace_root = Path(__file__).resolve().parents[2]

        self._logger = LogCore(workspace_root=self._workspace_root)
        self._registry = ToolRegistry()
        self._runtime = ToolRuntime(self._registry, self._logger, self)

        self._runtime.state_changed.connect(self._on_runtime_state_changed)
        self._runtime.toast_raised.connect(self._on_runtime_toast)

        if self._runtime.load_errors:
            self._logger.emit(
                level="WARN",
                log_type="runtime",
                event="plugin.load_warnings",
                result="warning",
                message="plugin load warnings",
                payload={"errors": self._runtime.load_errors},
            )

    @Slot(result=str)
    def getBootstrap(self) -> str:
        return self._serialize_payload()

    @Slot(str, str, str, result=str)
    def invokeTool(self, tool_id: str, action: str, payload_json: str) -> str:
        trace_id = uuid.uuid4().hex
        payload = self._decode_payload(payload_json)
        result = self._runtime.invoke(tool_id, action, payload, trace_id=trace_id)
        return json.dumps(result, ensure_ascii=False)

    @Slot(result=str)
    def getRecentLogs(self) -> str:
        logs = self._logger.tail(LogQuery(n=30))
        return json.dumps(logs, ensure_ascii=False)

    @Slot(result=str)
    def getSettings(self) -> str:
        return json.dumps(self._build_settings_payload(), ensure_ascii=False)

    def _on_runtime_state_changed(self, _tool_id: str) -> None:
        self.stateChanged.emit(self._serialize_payload())

    def _on_runtime_toast(self, _tool_id: str, level: str, message: str) -> None:
        self.toastRaised.emit(level, message)

    def _serialize_payload(self) -> str:
        return json.dumps(self._build_payload(), ensure_ascii=False)

    def _build_payload(self) -> dict[str, Any]:
        tool_states = self._runtime.export_states()
        payload: dict[str, Any] = {
            "app": {
                "name": "自定义工具箱",
                "tagline": "Python 能力层 + HTML/CSS/JS 界面层",
                "subtitle": "插件自动注册与统一日志已经接入，后续扩展只需新增工具插件目录。",
            },
            "tools": self._runtime.list_tools(),
            "toolStates": tool_states,
            "loadErrors": self._runtime.load_errors,
        }

        # Backward-compatible alias for existing UI blocks.
        if "sleep_control" in tool_states:
            payload["sleep"] = tool_states["sleep_control"]

        return payload

    def _build_settings_payload(self) -> dict[str, Any]:
        data_dir = self._workspace_root / ".data"
        log_dir = data_dir / "logs"
        qtwebengine_dir = self._workspace_root / ".qtwebengine"
        uv_cache_dir = os.environ.get("UV_CACHE_DIR", "")
        uv_tool_dir = os.environ.get("UV_TOOL_DIR", "")
        uv_python_dir = os.environ.get("UV_PYTHON_INSTALL_DIR", "")
        log_files = sorted(log_dir.glob("events-*.jsonl")) if log_dir.exists() else []
        recent_logs = self._logger.tail(LogQuery(n=12))

        return {
            "app": {
                "name": "自定义工具箱",
                "python": sys.version.split()[0],
                "platform": platform.platform(),
            },
            "paths": {
                "workspaceRoot": str(self._workspace_root),
                "dataDir": str(data_dir),
                "logDir": str(log_dir),
                "qtWebEngineDir": str(qtwebengine_dir),
            },
            "uv": {
                "UV_CACHE_DIR": uv_cache_dir,
                "UV_TOOL_DIR": uv_tool_dir,
                "UV_PYTHON_INSTALL_DIR": uv_python_dir,
            },
            "plugins": {
                "count": len(self._runtime.list_tools()),
                "items": self._runtime.list_tools(),
                "loadErrors": self._runtime.load_errors,
            },
            "logs": {
                "fileCount": len(log_files),
                "totalBytes": sum(path.stat().st_size for path in log_files),
                "recent": recent_logs,
            },
        }

    @staticmethod
    def _decode_payload(payload_json: str) -> dict[str, Any]:
        if not payload_json:
            return {}

        try:
            data = json.loads(payload_json)
        except json.JSONDecodeError:
            return {}

        return data if isinstance(data, dict) else {}
