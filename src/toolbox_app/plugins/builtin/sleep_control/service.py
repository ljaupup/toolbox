from __future__ import annotations

import subprocess
from datetime import datetime, timedelta
from typing import Any

from PySide6.QtCore import QObject, QTimer, Signal


class SleepService(QObject):
    state_changed = Signal()
    toast_raised = Signal(str, str)

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._timer = QTimer(self)
        self._timer.setInterval(1000)
        self._timer.timeout.connect(self._tick)

        self._remaining_seconds = 0
        self._status_text = "未启动"
        self._target_time_text = "未设定"
        self._mode = "idle"
        self._logs: list[str] = []

        self._append_log("睡眠控制插件已就绪。")

    def export_state(self) -> dict[str, Any]:
        return {
            "mode": self._mode,
            "statusText": self._status_text,
            "targetTimeText": self._target_time_text,
            "remainingText": self._status_text if self._mode != "countdown" else self._format_seconds(self._remaining_seconds),
            "logs": self._logs[-40:],
        }

    def start_countdown(self, minutes: int) -> None:
        minutes = max(1, min(minutes, 720))
        self._remaining_seconds = minutes * 60
        self._mode = "countdown"
        self._status_text = self._format_seconds(self._remaining_seconds)
        self._target_time_text = (datetime.now() + timedelta(seconds=self._remaining_seconds)).strftime("%H:%M:%S")
        self._timer.start()
        self._append_log(f"已启动倒计时休眠，预计 {minutes} 分钟后执行。")
        self.state_changed.emit()

    def cancel(self) -> None:
        self._timer.stop()
        self._remaining_seconds = 0
        self._mode = "cancelled"
        self._status_text = "已取消"
        self._target_time_text = "未设定"
        self._append_log("已取消当前睡眠计划。")
        self.state_changed.emit()

    def sleep_now(self) -> None:
        self._append_log("收到立即休眠指令。")
        self._execute_sleep()

    def _tick(self) -> None:
        self._remaining_seconds -= 1
        if self._remaining_seconds <= 0:
            self._timer.stop()
            self._mode = "executing"
            self._status_text = "执行中"
            self._target_time_text = datetime.now().strftime("%H:%M:%S")
            self._append_log("倒计时结束，准备执行系统睡眠命令。")
            self.state_changed.emit()
            self._execute_sleep()
            return

        self._status_text = self._format_seconds(self._remaining_seconds)
        self.state_changed.emit()

    def _execute_sleep(self) -> None:
        command = [
            "powershell",
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; "
            "[System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)",
        ]
        try:
            subprocess.run(command, check=True)
            self._mode = "completed"
            self._status_text = "已执行"
            self._target_time_text = datetime.now().strftime("%H:%M:%S")
            self._append_log("系统睡眠命令已执行。")
            self.toast_raised.emit("success", "系统已收到睡眠指令。")
        except subprocess.CalledProcessError as exc:
            self._mode = "failed"
            self._status_text = "执行失败"
            self._append_log(f"睡眠命令执行失败，返回码：{exc.returncode}")
            self.toast_raised.emit("error", "系统未能成功进入睡眠，请检查权限或电源设置。")
        self.state_changed.emit()

    def _append_log(self, message: str) -> None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        self._logs.append(f"[{timestamp}] {message}")

    @staticmethod
    def _format_seconds(seconds: int) -> str:
        minutes, secs = divmod(max(0, seconds), 60)
        hours, minutes = divmod(minutes, 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
