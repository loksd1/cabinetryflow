from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, status
from pydantic import BaseModel

from app.api.deps import CurrentEmployee
from app.core.uploads import resolve_upload_root


router = APIRouter(prefix="/files", tags=["files"])


_UPLOAD_ROOT = resolve_upload_root()


class FileUploadResponse(BaseModel):
    url: str
    filename: str
    content_type: str | None = None


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    *,
    _current: CurrentEmployee,
    file: UploadFile = File(...),
    folder: str | None = None,
) -> FileUploadResponse:
    safe_folder = ""
    if folder:
        safe_folder = "".join(ch for ch in folder.strip() if ch.isalnum() or ch in {"-", "_"})

    dest_dir = _UPLOAD_ROOT / safe_folder if safe_folder else _UPLOAD_ROOT
    dest_dir.mkdir(parents=True, exist_ok=True)

    file_suffix = Path(file.filename or "").suffix
    generated_name = f"{uuid.uuid4().hex}{file_suffix}"
    dest_path = dest_dir / generated_name

    with dest_path.open("wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            buffer.write(chunk)

    await file.close()

    if safe_folder:
        url_path = f"/uploads/{safe_folder}/{generated_name}"
    else:
        url_path = f"/uploads/{generated_name}"

    return FileUploadResponse(
        url=url_path,
        filename=file.filename or generated_name,
        content_type=file.content_type,
    )
