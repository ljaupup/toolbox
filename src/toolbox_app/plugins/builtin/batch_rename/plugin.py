from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from toolbox_app.plugins.base import ToolContext, ToolManifest, ToolPlugin


class BatchRenamePlugin(ToolPlugin):
    def __init__(self, manifest: ToolManifest, context: ToolContext, parent=None) -> None:
        super().__init__(manifest, context, parent)
        self._status_text = "待命"
        self._preview: list[dict[str, Any]] = []
        self._last_args: dict[str, Any] = {}

    def actions(self) -> list[str]:
        return ["preview", "apply", "clear_preview"]

    def invoke(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        if action == "preview":
            self._preview = self._build_preview(payload)
            self._status_text = f"预览完成，共 {len(self._preview)} 项"
        elif action == "apply":
            current_args = self._normalize_args(payload)
            if not self._preview or self._last_args != current_args:
                self._preview = self._build_preview(payload)
            self._apply_preview()
        elif action == "clear_preview":
            self._preview = []
            self._status_text = "已清空预览"
            self._last_args = {}
        else:
            raise ValueError(f"unknown action: {action}")

        self.emit_state_changed()
        return {"state": self.export_state()}

    def export_state(self) -> dict[str, Any]:
        return {
            "statusText": self._status_text,
            "preview": self._preview[:120],
            "total": len(self._preview),
            "hasConflict": any(bool(item.get("conflict")) for item in self._preview),
            "lastArgs": self._last_args,
        }

    def _build_preview(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        normalized = self._normalize_args(payload)
        directory_raw = str(normalized["directory"])
        pattern = str(normalized["pattern"])
        start_index = int(normalized["start_index"])

        if not directory_raw:
            raise ValueError("目标目录不能为空")
        if not pattern:
            raise ValueError("命名模板不能为空")

        directory = Path(directory_raw).expanduser()
        if not directory.exists() or not directory.is_dir():
            raise ValueError("目标目录不存在或不可访问")

        files = sorted((item for item in directory.iterdir() if item.is_file()), key=lambda item: item.name.lower())
        if not files:
            raise ValueError("目标目录中没有可重命名文件")

        now = datetime.now()
        date_str = now.strftime("%Y%m%d")
        time_str = now.strftime("%H%M%S")
        source_names = {item.name.lower() for item in files}

        rows: list[dict[str, Any]] = []
        for index, item in enumerate(files, start=start_index):
            target_name = self._render_name(
                pattern=pattern,
                index=index,
                name=item.stem,
                ext=item.suffix,
                date_str=date_str,
                time_str=time_str,
            )
            row = {
                "index": index,
                "source": item.name,
                "target": target_name,
                "sourcePath": str(item),
                "targetPath": str(directory / target_name),
                "unchanged": item.name.lower() == target_name.lower(),
                "conflict": False,
                "reason": "",
            }
            rows.append(row)

        self._mark_conflicts(rows, directory=directory, source_names=source_names)
        self._last_args = normalized

        return rows

    def _normalize_args(self, payload: dict[str, Any]) -> dict[str, Any]:
        directory_raw = str(payload.get("directory", "")).strip()
        pattern = str(payload.get("pattern", "")).strip()
        start_index = max(1, int(payload.get("start_index", 1)))
        if directory_raw:
            directory_raw = str(Path(directory_raw).expanduser())
        return {
            "directory": directory_raw,
            "pattern": pattern,
            "start_index": start_index,
        }

    def _render_name(
        self,
        *,
        pattern: str,
        index: int,
        name: str,
        ext: str,
        date_str: str,
        time_str: str,
    ) -> str:
        try:
            result = pattern.format(index=index, name=name, ext=ext, date=date_str, time=time_str)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"模板渲染失败: {exc}") from exc

        result = result.strip()
        if not result:
            raise ValueError("模板渲染后文件名为空")
        if any(sep in result for sep in ("/", "\\")):
            raise ValueError("模板结果不能包含路径分隔符")
        if result in {".", ".."}:
            raise ValueError("模板结果非法")
        return result

    def _mark_conflicts(self, rows: list[dict[str, Any]], *, directory: Path, source_names: set[str]) -> None:
        name_count: dict[str, int] = {}
        for row in rows:
            key = str(row["target"]).lower()
            name_count[key] = name_count.get(key, 0) + 1

        for row in rows:
            source = str(row["source"]).lower()
            target = str(row["target"]).lower()
            if name_count.get(target, 0) > 1:
                row["conflict"] = True
                row["reason"] = "目标名称重复"
                continue

            target_path = directory / str(row["target"])
            if target == source:
                continue

            if target_path.exists() and target not in source_names:
                row["conflict"] = True
                row["reason"] = "目标文件已存在"

    def _apply_preview(self) -> None:
        conflicts = [item for item in self._preview if bool(item.get("conflict"))]
        if conflicts:
            raise ValueError("存在冲突项，请先调整模板并重新预览")

        operations = [item for item in self._preview if not bool(item.get("unchanged"))]
        if not operations:
            self._status_text = "没有需要重命名的文件"
            return

        temp_moves: list[tuple[Path, Path, Path]] = []
        final_moves: list[tuple[Path, Path]] = []

        try:
            for item in operations:
                source_path = Path(str(item["sourcePath"]))
                target_path = Path(str(item["targetPath"]))
                temp_path = source_path.with_name(f".__tbx_tmp__{uuid4().hex}{source_path.suffix}")
                source_path.rename(temp_path)
                temp_moves.append((temp_path, source_path, target_path))

            for temp_path, source_path, target_path in temp_moves:
                temp_path.rename(target_path)
                final_moves.append((target_path, source_path))
        except Exception as exc:  # noqa: BLE001
            self._rollback(temp_moves=temp_moves, final_moves=final_moves)
            raise ValueError(f"执行失败，已回滚: {exc}") from exc

        renamed_count = len(operations)
        self._status_text = f"已完成重命名，共 {renamed_count} 项"
        self.context.logger.emit(
            level="INFO",
            log_type="audit",
            event="batch_rename.applied",
            tool_id=self.manifest.id,
            action="apply",
            result="ok",
            message=self._status_text,
            payload={"count": renamed_count},
        )
        self._preview = []

    def _rollback(
        self,
        *,
        temp_moves: list[tuple[Path, Path, Path]],
        final_moves: list[tuple[Path, Path]],
    ) -> None:
        for current_path, original_path in reversed(final_moves):
            if current_path.exists():
                current_path.rename(original_path)

        for temp_path, source_path, _target_path in reversed(temp_moves):
            if temp_path.exists():
                temp_path.rename(source_path)
