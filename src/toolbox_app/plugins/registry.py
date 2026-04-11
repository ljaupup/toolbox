from __future__ import annotations

import importlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from toolbox_app.plugins.base import ToolManifest, ToolPlugin


@dataclass(slots=True)
class ToolPluginSpec:
    manifest: ToolManifest
    plugin_cls: type[ToolPlugin]
    manifest_path: Path


class ToolRegistry:
    def __init__(self, plugins_root: Path | None = None) -> None:
        self._plugins_root = plugins_root or Path(__file__).resolve().parent / "builtin"

    def discover(self) -> tuple[list[ToolPluginSpec], list[str]]:
        specs: list[ToolPluginSpec] = []
        errors: list[str] = []
        seen_ids: set[str] = set()

        if not self._plugins_root.exists():
            return specs, errors

        manifest_files = sorted(self._plugins_root.glob("*/manifest.json"))
        for manifest_path in manifest_files:
            try:
                raw = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest = self._build_manifest(raw)
                if manifest.id in seen_ids:
                    raise ValueError(f"duplicate plugin id: {manifest.id}")
                seen_ids.add(manifest.id)

                plugin_cls = self._resolve_entry(manifest.entry)
                specs.append(ToolPluginSpec(manifest=manifest, plugin_cls=plugin_cls, manifest_path=manifest_path))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"[{manifest_path}] {exc}")

        return specs, errors

    def _build_manifest(self, raw: dict[str, Any]) -> ToolManifest:
        return ToolManifest(
            id=str(raw["id"]),
            name=str(raw["name"]),
            entry=str(raw["entry"]),
            summary=str(raw.get("summary", "")),
            eyebrow=str(raw.get("eyebrow", "TOOL")),
            version=str(raw.get("version", "0.1.0")),
            category=str(raw.get("category", "general")),
            permissions=[str(item) for item in raw.get("permissions", [])],
            ui=dict(raw.get("ui", {})),
        )

    def _resolve_entry(self, entry: str) -> type[ToolPlugin]:
        if ":" not in entry:
            raise ValueError(f"invalid plugin entry format: {entry}")

        module_name, class_name = entry.split(":", 1)
        module = importlib.import_module(module_name)
        cls = getattr(module, class_name)

        if not isinstance(cls, type) or not issubclass(cls, ToolPlugin):
            raise TypeError(f"entry does not point to a ToolPlugin subclass: {entry}")
        return cls
