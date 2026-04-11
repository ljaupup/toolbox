from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    src_dir = project_root / "src"
    sys.path.insert(0, str(src_dir))

    from toolbox_app.plugins.registry import ToolRegistry

    specs, errors = ToolRegistry().discover()
    payload = {
        "count": len(specs),
        "plugins": [spec.manifest.id for spec in specs],
        "errors": errors,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
