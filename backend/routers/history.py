"""API for database-backed detection history."""

from fastapi import APIRouter, HTTPException

from database import repository

router = APIRouter(prefix="/api", tags=["5 - History"])


@router.get("/history")
def get_history():
    """Return detection history joined with its uploaded image details."""
    try:
        return repository.list_history()
    except Exception:
        # Atlas/network issues can temporarily prevent MongoDB access.
        # Return an empty result instead of crashing the history page so the UI
        # can still render an empty state when the database is unreachable.
        return []