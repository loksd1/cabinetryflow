from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def _is_writable(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        test_file = path / ".write-test"
        test_file.write_bytes(b"")
        test_file.unlink(missing_ok=True)
        return True
    except OSError:
        return False


def resolve_upload_root() -> Path:
    app_root = Path(__file__).resolve().parents[1]
    preferred = app_root / "uploads"
    if _is_writable(preferred):
        return preferred

    fallback = Path("/tmp/cabinetryflow-uploads")
    if _is_writable(fallback):
        logger.warning(
            "Upload directory %s is not writable; falling back to %s",
            preferred,
            fallback,
        )
        return fallback

    raise RuntimeError(
        f"No writable upload directory available. Checked {preferred} and {fallback}."
    )