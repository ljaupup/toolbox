from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from PySide6.QtCore import QObject, Signal


class TimeConverterService(QObject):
    state_changed = Signal()

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._status_text = "待命"
        self._last_mode = "timestamp_to_datetime"
        self._last_timestamp_unit = "auto"
        self._last_timezone = "local"
        self._input_value = ""
        self._local_iso = ""
        self._utc_iso = ""
        self._timestamp_seconds = ""
        self._timestamp_milliseconds = ""
        self._now_local_iso = ""
        self._now_utc_iso = ""
        self._now_timestamp_seconds = ""
        self._now_timestamp_milliseconds = ""

    def clear(self) -> None:
        self._status_text = "已清空"
        self._input_value = ""
        self._local_iso = ""
        self._utc_iso = ""
        self._timestamp_seconds = ""
        self._timestamp_milliseconds = ""
        self.state_changed.emit()

    def refresh_now(self) -> None:
        now = datetime.now().astimezone()
        now_utc = now.astimezone(timezone.utc)
        seconds = now.timestamp()
        self._now_local_iso = now.isoformat(timespec="seconds")
        self._now_utc_iso = now_utc.isoformat(timespec="seconds")
        self._now_timestamp_seconds = self._format_seconds(seconds)
        self._now_timestamp_milliseconds = str(int(round(seconds * 1000)))
        self._status_text = "已刷新当前时间"
        self.state_changed.emit()

    def convert(self, *, mode: str, value: str, timestamp_unit: str, timezone_mode: str) -> None:
        normalized_mode = mode.strip().lower()
        normalized_value = value.strip()
        normalized_unit = timestamp_unit.strip().lower()
        normalized_timezone = timezone_mode.strip().lower()
        if not normalized_value:
            raise ValueError("value 不能为空")
        if normalized_mode not in {"timestamp_to_datetime", "datetime_to_timestamp"}:
            raise ValueError("mode 仅支持 timestamp_to_datetime 或 datetime_to_timestamp")
        if normalized_unit not in {"auto", "s", "ms"}:
            raise ValueError("timestamp_unit 仅支持 auto/s/ms")
        if normalized_timezone not in {"local", "utc"}:
            raise ValueError("timezone 仅支持 local/utc")

        self._input_value = normalized_value
        self._last_mode = normalized_mode
        self._last_timestamp_unit = normalized_unit
        self._last_timezone = normalized_timezone

        if normalized_mode == "timestamp_to_datetime":
            seconds = self._parse_timestamp_seconds(normalized_value, normalized_unit)
            dt_utc = datetime.fromtimestamp(seconds, tz=timezone.utc)
            dt_local = dt_utc.astimezone()
            self._local_iso = dt_local.isoformat(timespec="seconds")
            self._utc_iso = dt_utc.isoformat(timespec="seconds")
            self._timestamp_seconds = self._format_seconds(seconds)
            self._timestamp_milliseconds = str(int(round(seconds * 1000)))
            self._status_text = "转换完成（时间戳 -> 时间）"
        else:
            dt = self._parse_datetime(normalized_value, normalized_timezone)
            dt_utc = dt.astimezone(timezone.utc)
            dt_local = dt.astimezone()
            seconds = dt.timestamp()
            self._local_iso = dt_local.isoformat(timespec="seconds")
            self._utc_iso = dt_utc.isoformat(timespec="seconds")
            self._timestamp_seconds = self._format_seconds(seconds)
            self._timestamp_milliseconds = str(int(round(seconds * 1000)))
            self._status_text = "转换完成（时间 -> 时间戳）"

        self.state_changed.emit()

    def export_state(self) -> dict[str, Any]:
        return {
            "statusText": self._status_text,
            "lastMode": self._last_mode,
            "lastTimestampUnit": self._last_timestamp_unit,
            "lastTimezone": self._last_timezone,
            "inputValue": self._input_value,
            "localIso": self._local_iso,
            "utcIso": self._utc_iso,
            "timestampSeconds": self._timestamp_seconds,
            "timestampMilliseconds": self._timestamp_milliseconds,
            "nowLocalIso": self._now_local_iso,
            "nowUtcIso": self._now_utc_iso,
            "nowTimestampSeconds": self._now_timestamp_seconds,
            "nowTimestampMilliseconds": self._now_timestamp_milliseconds,
        }

    @staticmethod
    def _parse_timestamp_seconds(value: str, unit: str) -> float:
        cleaned = value.strip().replace(",", "")
        if not cleaned:
            raise ValueError("时间戳不能为空")

        if unit == "auto":
            numeric = float(cleaned)
            if "." in cleaned:
                return numeric
            if abs(numeric) >= 100_000_000_000:
                return numeric / 1000.0
            return numeric

        numeric = float(cleaned)
        if unit == "ms":
            return numeric / 1000.0
        return numeric

    @staticmethod
    def _parse_datetime(value: str, timezone_mode: str) -> datetime:
        normalized = value.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(normalized)
        except ValueError as exc:
            raise ValueError("时间格式不正确，建议使用 ISO 格式，如 2026-04-11T12:30:00+08:00") from exc

        if dt.tzinfo is not None:
            return dt

        if timezone_mode == "utc":
            return dt.replace(tzinfo=timezone.utc)
        return dt.replace(tzinfo=datetime.now().astimezone().tzinfo)

    @staticmethod
    def _format_seconds(value: float) -> str:
        text = f"{value:.6f}".rstrip("0").rstrip(".")
        return text if text else "0"
