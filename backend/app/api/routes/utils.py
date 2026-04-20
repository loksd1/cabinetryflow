from fastapi import APIRouter

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/", summary="Health check (for Docker)")
async def health_check_legacy() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health", summary="Health check")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
