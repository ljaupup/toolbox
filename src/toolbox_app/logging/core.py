from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class LogQuery:
    n: int = 50
    tool_id: str | None = None
    level: str | None = None
    log_type: str | None = None


class LogCore:
    def __init__(self, workspace_root: Path | None = None) -> None:
        root = workspace_root or Path.cwd()
        self._log_dir = root / ".data" / "logs"
        self._log_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def emit(
        self,
        *,
        level: str,
        log_type: str,
        event: str,
        tool_id: str | None = None,
        action: str | None = None,
        result: str | None = None,
        message: str = "",
        payload: dict[str, Any] | None = None,
        trace_id: str | None = None,
    ) -> dict[str, Any]:
        record: dict[str, Any] = {
            "ts": datetime.now().astimezone().isoformat(timespec="seconds"),
            "level": level.upper(),
            "log_type": log_type,
            "event": event,
            "tool_id": tool_id,
            "action": action,
            "result": result,
            "trace_id": trace_id,
            "message": message,
            "payload": payload or {},
        }

        path = self._log_file_path()
        with self._lock:
            with path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False))
                f.write("\n")
        return record

    def tail(self, query: LogQuery | None = None) -> list[dict[str, Any]]:
        q = query or LogQuery()
        entries: list[dict[str, Any]] = []

        files = sorted(self._log_dir.glob("events-*.jsonl"), reverse=True)
        for file_path in files:
            lines = file_path.read_text(encoding="utf-8").splitlines()
            for line in reversed(lines):
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if not self._match(entry, q):
                    continue

                entries.append(entry)
                if len(entries) >= q.n:
                    return entries
        return entries

    def query(
        self,
        *,
        start_iso: str | None = None,
        end_iso: str | None = None,
        tool_id: str | None = None,
        text: str | None = None,
    ) -> list[dict[str, Any]]:
        start = self._parse_iso(start_iso)
        end = self._parse_iso(end_iso)

        result: list[dict[str, Any]] = []
        files = sorted(self._log_dir.glob("events-*.jsonl"))
        for file_path in files:
            for line in file_path.read_text(encoding="utf-8").splitlines():
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                ts = self._parse_iso(entry.get("ts"))
                if start and (ts is None or ts < start):
                    continue
                if end and (ts is None or ts > end):
                    continue
                if tool_id and entry.get("tool_id") != tool_id:
                    continue
                if text and text not in json.dumps(entry, ensure_ascii=False):
                    continue

                result.append(entry)
        return result

    def _match(self, entry: dict[str, Any], query: LogQuery) -> bool:
        if query.tool_id and entry.get("tool_id") != query.tool_id:
            return False
        if query.level and entry.get("level") != query.level.upper():
            return False
        if query.log_type and entry.get("log_type") != query.log_type:
            return False
        return True

    def _log_file_path(self) -> Path:
        suffix = datetime.now().strftime("%Y%m%d")
        return self._log_dir / f"events-{suffix}.jsonl"

    @staticmethod
    def _parse_iso(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
