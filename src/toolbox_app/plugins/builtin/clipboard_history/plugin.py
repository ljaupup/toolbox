from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from PySide6.QtWidgets import QApplication

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin


class ClipboardHistoryPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._items: list[dict[str, Any]] = []
        self._max_items = 80
        self._status_text = "待命"
        self._clipboard = None

    def actions(self) -> list[str]:
        return ["clear", "remove_item", "set_clipboard", "toggle_pin"]

    def on_startup(self) -> None:
        app = QApplication.instance()
        if app is None:
            return
        if not hasattr(app, "clipboard"):
            self._status_text = "当前运行环境不支持系统剪贴板"
            return

        self._clipboard = app.clipboard()
        if self._clipboard is None:
            return

        self._clipboard.dataChanged.connect(self._on_clipboard_changed)
        self._capture_text(self._clipboard.text())

    def on_shutdown(self) -> None:
        if self._clipboard is not None:
            try:
                self._clipboard.dataChanged.disconnect(self._on_clipboard_changed)
            except (TypeError, RuntimeError):
                pass

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "clear":
            self._items.clear()
            self._status_text = "已清空历史"
            self.emit_state_changed()
        elif action == "remove_item":
            item_id = str(payload.get("id", ""))
            before = len(self._items)
            self._items = [item for item in self._items if item["id"] != item_id]
            removed = before - len(self._items)
            self._status_text = f"已删除 {removed} 条记录" if removed else "未找到记录"
            self.emit_state_changed()
        elif action == "set_clipboard":
            text = str(payload.get("text", ""))
            if not text.strip():
                raise ValueError("文本不能为空")

            app = QApplication.instance()
            if app is None or app.clipboard() is None:
                raise ValueError("无法访问系统剪贴板")
            app.clipboard().setText(text)
            self._status_text = "已写入系统剪贴板"
            self.toast_raised.emit("success", self._status_text)
            self.emit_state_changed()
        elif action == "toggle_pin":
            item_id = str(payload.get("id", ""))
            found = False
            for item in self._items:
                if item["id"] == item_id:
                    item["pinned"] = not bool(item.get("pinned", False))
                    found = True
                    break
            self._sort_items()
            self._status_text = "已更新置顶状态" if found else "未找到记录"
            self.emit_state_changed()
        else:
            raise ValueError(f"unknown action: {action}")

        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return {
            "statusText": self._status_text,
            "items": self._items[:50],
            "total": len(self._items),
        }

    def _on_clipboard_changed(self) -> None:
        if self._clipboard is None:
            return
        self._capture_text(self._clipboard.text())

    def _capture_text(self, text: str) -> None:
        normalized = (text or "").strip()
        if not normalized:
            return

        if self._items and self._items[0]["text"] == normalized:
            return

        entry = {
            "id": uuid4().hex,
            "text": normalized,
            "ts": datetime.now().strftime("%H:%M:%S"),
            "pinned": False,
        }
        self._items.insert(0, entry)

        if len(self._items) > self._max_items:
            self._items = self._items[: self._max_items]

        self._sort_items()
        self._status_text = f"已记录 {len(self._items)} 条文本历史"
        self.context.logger.emit(
            level="INFO",
            log_type="runtime",
            event="clipboard.captured",
            tool_id=self.manifest.id,
            result="ok",
            message="clipboard text captured",
            payload={"length": len(normalized)},
        )
        self.emit_state_changed()

    def _sort_items(self) -> None:
        self._items.sort(key=lambda item: (not bool(item.get("pinned", False)),), reverse=False)
