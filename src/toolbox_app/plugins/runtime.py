from __future__ import annotations

import traceback
from functools import partial
from typing import Any

from PySide6.QtCore import QObject, Signal

from toolbox_app.logging.core import LogCore
from toolbox_app.plugins.base import ToolContext, ToolPlugin
from toolbox_app.plugins.registry import ToolRegistry


class ToolRuntime(QObject):
    state_changed = Signal(str)
    toast_raised = Signal(str, str, str)

    def __init__(self, registry: ToolRegistry, logger: LogCore, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._registry = registry
        self._logger = logger
        self._context = ToolContext(logger=logger)
        self._plugins: dict[str, ToolPlugin] = {}
        self._load_errors: list[str] = []
        self._load_plugins()

    @property
    def load_errors(self) -> list[str]:
        return list(self._load_errors)

    def list_tools(self) -> list[dict[str, Any]]:
        cards = [plugin.to_tool_card() for plugin in self._plugins.values()]
        cards.sort(key=lambda item: int(item.get("ui", {}).get("order", 1000)))
        return cards

    def export_states(self) -> dict[str, dict[str, Any]]:
        return {tool_id: plugin.export_state() for tool_id, plugin in self._plugins.items()}

    def invoke(self, tool_id: str, action: str, payload: dict[str, Any], trace_id: str | None = None) -> dict[str, Any]:
        plugin = self._plugins.get(tool_id)
        if plugin is None:
            self._logger.emit(
                level="ERROR",
                log_type="audit",
                event="action.rejected",
                tool_id=tool_id,
                action=action,
                result="failed",
                trace_id=trace_id,
                message="tool not found",
                payload=payload,
            )
            return self._error_response(
                code="TOOL_NOT_FOUND",
                message=f"tool not found: {tool_id}",
                tool_id=tool_id,
                action=action,
            )

        if action not in plugin.actions():
            self._logger.emit(
                level="WARN",
                log_type="audit",
                event="action.rejected",
                tool_id=tool_id,
                action=action,
                result="failed",
                trace_id=trace_id,
                message="action not supported",
                payload=payload,
            )
            return self._error_response(
                code="ACTION_NOT_SUPPORTED",
                message=f"action not supported: {action}",
                tool_id=tool_id,
                action=action,
            )

        self._logger.emit(
            level="INFO",
            log_type="audit",
            event="action.requested",
            tool_id=tool_id,
            action=action,
            result="requested",
            trace_id=trace_id,
            message="tool action requested",
            payload=payload,
        )

        try:
            result = plugin.invoke(action, payload)
            self._logger.emit(
                level="INFO",
                log_type="audit",
                event="action.executed",
                tool_id=tool_id,
                action=action,
                result="ok",
                trace_id=trace_id,
                message="tool action executed",
                payload=payload,
            )
            return self._success_response(tool_id=tool_id, action=action, result=result)
        except Exception as exc:  # noqa: BLE001
            self._logger.emit(
                level="ERROR",
                log_type="error",
                event="action.failed",
                tool_id=tool_id,
                action=action,
                result="failed",
                trace_id=trace_id,
                message=f"{exc}",
                payload={"payload": payload, "traceback": traceback.format_exc()},
            )
            return self._error_response(
                code="ACTION_FAILED",
                message=str(exc),
                tool_id=tool_id,
                action=action,
            )

    @staticmethod
    def _success_response(*, tool_id: str, action: str, result: dict[str, Any]) -> dict[str, Any]:
        state = result.get("state") if isinstance(result, dict) else None
        return {
            "ok": True,
            "code": "OK",
            "message": "操作成功",
            "toolId": tool_id,
            "action": action,
            "result": result,
            "state": state,
        }

    @staticmethod
    def _error_response(*, code: str, message: str, tool_id: str, action: str) -> dict[str, Any]:
        return {
            "ok": False,
            "code": code,
            "message": message,
            "error": message,
            "toolId": tool_id,
            "action": action,
        }

    def _load_plugins(self) -> None:
        specs, errors = self._registry.discover()
        self._load_errors.extend(errors)

        for spec in specs:
            tool_id = spec.manifest.id
            try:
                plugin = spec.plugin_cls(spec.manifest, self._context, self)
                plugin.state_changed.connect(partial(self._on_plugin_state_changed, tool_id))
                plugin.toast_raised.connect(partial(self._on_plugin_toast, tool_id))
                plugin.on_startup()
                self._plugins[tool_id] = plugin

                self._logger.emit(
                    level="INFO",
                    log_type="runtime",
                    event="plugin.loaded",
                    tool_id=tool_id,
                    result="ok",
                    message="plugin loaded",
                    payload={"manifest": str(spec.manifest_path)},
                )
            except Exception as exc:  # noqa: BLE001
                message = f"[{tool_id}] plugin load failed: {exc}"
                self._load_errors.append(message)
                self._logger.emit(
                    level="ERROR",
                    log_type="error",
                    event="plugin.load_failed",
                    tool_id=tool_id,
                    result="failed",
                    message=message,
                    payload={"traceback": traceback.format_exc()},
                )

    def _on_plugin_state_changed(self, tool_id: str) -> None:
        self.state_changed.emit(tool_id)

    def _on_plugin_toast(self, tool_id: str, level: str, message: str) -> None:
        self.toast_raised.emit(tool_id, level, message)
