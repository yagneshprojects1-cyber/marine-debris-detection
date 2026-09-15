"""API for database-backed detection history."""

from fastapi import APIRouter, HTTPException

from database import repository

router = APIRouter(prefix="/api", tags=["5 - History"])


@router.get("/history")
def get_history():
    """Return detection history joined with its uploaded image details."""
    try:
        return repository.list_history()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"History database is unavailable: {exc}") from exc