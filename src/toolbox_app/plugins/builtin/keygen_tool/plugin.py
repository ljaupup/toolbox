from __future__ import annotations

import hashlib
import secrets
import string
import uuid
from random import SystemRandom
from typing import Any

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin


class KeygenToolPlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._status_text = "待命"
        self._last_password = ""
        self._last_token = ""
        self._last_uuid = ""
        self._last_hash = ""

    def actions(self) -> list[str]:
        return ["generate_password", "generate_token", "generate_uuid", "hash_text", "clear"]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "generate_password":
            self._generate_password(payload)
        elif action == "generate_token":
            byte_count = max(8, min(int(payload.get("bytes", 32)), 128))
            self._last_token = secrets.token_urlsafe(byte_count)
            self._status_text = f"已生成 token（{byte_count} bytes）"
        elif action == "generate_uuid":
            self._last_uuid = str(uuid.uuid4())
            self._status_text = "已生成 UUID v4"
        elif action == "hash_text":
            self._hash_text(payload)
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

    def _generate_password(self, payload: dict[str, Any]) -> None:
        length = max(4, min(int(payload.get("length", 16)), 128))
        use_upper = bool(payload.get("upper", True))
        use_lower = bool(payload.get("lower", True))
        use_digits = bool(payload.get("digits", True))
        use_symbols = bool(payload.get("symbols", False))
        exclude_ambiguous = bool(payload.get("exclude_ambiguous", False))

        pools: list[str] = []
        if use_upper:
            pools.append(string.ascii_uppercase)
        if use_lower:
            pools.append(string.ascii_lowercase)
        if use_digits:
            pools.append(string.digits)
        if use_symbols:
            pools.append("!@#$%^&*()-_=+[]{};:,.?/|~")

        if not pools:
            raise ValueError("至少选择一种字符类型")

        if exclude_ambiguous:
            ambiguous = set("O0l1I")
            pools = ["".join(ch for ch in pool if ch not in ambiguous) for pool in pools]
            pools = [pool for pool in pools if pool]
            if not pools:
                raise ValueError("排除易混淆字符后没有可用字符")

        if length < len(pools):
            length = len(pools)

        required = [secrets.choice(pool) for pool in pools]
        combined = "".join(pools)
        random_part = [secrets.choice(combined) for _ in range(length - len(required))]

        chars = required + random_part
        SystemRandom().shuffle(chars)
        self._last_password = "".join(chars)
        self._status_text = f"已生成密码（长度 {length}）"

    def _hash_text(self, payload: dict[str, Any]) -> None:
        text = str(payload.get("text", ""))
        algorithm = str(payload.get("algorithm", "sha256")).strip().lower()

        if not text:
            raise ValueError("待哈希文本不能为空")

        supported = {"md5", "sha1", "sha256", "sha512"}
        if algorithm not in supported:
            raise ValueError(f"不支持的哈希算法: {algorithm}")

        hasher = hashlib.new(algorithm)
        hasher.update(text.encode("utf-8"))
        self._last_hash = hasher.hexdigest()
        self._status_text = f"已生成 {algorithm} 哈希"
