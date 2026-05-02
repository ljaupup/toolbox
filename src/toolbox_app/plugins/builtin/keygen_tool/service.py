from __future__ import annotations

import base64
import binascii
import hashlib
import secrets
import string
import uuid
from random import SystemRandom
from typing import Any


SUPPORTED_HASH_ALGORITHMS = {"md5", "sha1", "sha256", "sha512"}


def generate_password(payload: dict[str, Any]) -> tuple[str, int]:
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
    return "".join(chars), length


def generate_token(payload: dict[str, Any]) -> tuple[str, int]:
    byte_count = max(8, min(int(payload.get("bytes", 32)), 128))
    return secrets.token_urlsafe(byte_count), byte_count


def generate_uuid4() -> str:
    return str(uuid.uuid4())


def hash_text(payload: dict[str, Any]) -> tuple[str, str]:
    text = str(payload.get("text", ""))
    algorithm = normalize_hash_algorithm(payload.get("algorithm", "sha256"))

    if not text:
        raise ValueError("待哈希文本不能为空")

    hasher = hashlib.new(algorithm)
    hasher.update(text.encode("utf-8"))
    return hasher.hexdigest(), algorithm


def hash_file(payload: dict[str, Any]) -> tuple[str, str, int, str]:
    content_b64 = str(payload.get("content_b64", "")).strip()
    algorithm = normalize_hash_algorithm(payload.get("algorithm", "sha256"))
    filename = str(payload.get("filename", "")).strip()

    if not content_b64:
        raise ValueError("未提供文件内容")

    try:
        file_bytes = base64.b64decode(content_b64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("文件内容编码无效") from exc

    if not file_bytes:
        raise ValueError("文件为空")

    hasher = hashlib.new(algorithm)
    hasher.update(file_bytes)
    return hasher.hexdigest(), algorithm, len(file_bytes), filename or "未命名文件"


def normalize_hash_algorithm(raw: Any) -> str:
    algorithm = str(raw).strip().lower()
    if algorithm not in SUPPORTED_HASH_ALGORITHMS:
        raise ValueError(f"不支持的哈希算法: {algorithm}")
    return algorithm
