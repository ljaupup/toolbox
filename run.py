from __future__ import annotations

import sys
from pathlib import Path


def bootstrap() -> None:
    project_root = Path(__file__).resolve().parent
    src_dir = project_root / "src"
    sys.path.insert(0, str(src_dir))

    from toolbox_app.main import main

    raise SystemExit(main())


if __name__ == "__main__":
    bootstrap()
