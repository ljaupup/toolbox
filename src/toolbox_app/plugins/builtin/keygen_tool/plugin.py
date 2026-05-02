from __future__ import annotations

from typing import Any

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin
from toolbox_app.plugins.builtin.keygen_tool import service


class KeygenToolPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._status_text = "待命"
        self._last_password = ""
        self._last_token = ""
        self._last_uuid = ""
        self._last_hash = ""

    def actions(self) -> list[str]:
        return ["generate_password", "generate_token", "generate_uuid", "hash_text", "hash_file", "clear"]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "generate_password":
            password, length = service.generate_password(payload)
            self._last_password = password
            self._status_text = f"已生成密码（长度 {length}）"
        elif action == "generate_token":
            token, byte_count = service.generate_token(payload)
            self._last_token = token
            self._status_text = f"已生成 token（{byte_count} bytes）"
        elif action == "generate_uuid":
            self._last_uuid = service.generate_uuid4()
            self._status_text = "已生成 UUID v4"
        elif action == "hash_text":
            digest, algorithm = service.hash_text(payload)
            self._last_hash = digest
            self._status_text = f"已生成 {algorithm} 哈希"
        elif action == "hash_file":
            digest, algorithm, size_bytes, filename = service.hash_file(payload)
            self._last_hash = digest
            self._status_text = f"已生成文件哈希（{algorithm}，{filename}，{size_bytes / 1024:.1f} KB）"
        elif action == "clear":
            self._status_text = "已清空"
            self._last_password = ""
            self._last_token = ""
            self._last_uuid = ""
            self._last_hash = ""
        else:
            raise ValueError(f"unknown action: {action}")

        self.context.logger.emit(
            level="INFO",
            log_type="audit",
            event="keygen_tool.action",
            tool_id=self.manifest.id,
            action=action,
            result="ok",
            message=self._status_text,
        )
        self.emit_state_changed()
        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return {
            "statusText": self._status_text,
            "lastPassword": self._last_password,
            "lastToken": self._last_token,
            "lastUuid": self._last_uuid,
            "lastHash": self._last_hash,
        }
