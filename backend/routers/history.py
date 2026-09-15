"""API for database-backed detection history."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import repository

router = APIRouter(prefix="/api", tags=["5 - History"])


@router.get("/history")
def get_history():
    """Return detection history joined with its uploaded image details."""
    try:
        return repository.list_history()
    except Exception as exc:
        print(f"[Warning] History database unavailable ({exc}). Returning empty list.")
        return []


class DeleteHistoryRequest(BaseModel):
    image_ids: list[str]


@router.delete("/history")
def delete_history(body: DeleteHistoryRequest):
    """Delete all detection records for the supplied image_ids.

    Removes documents from ai_predictions, metadata, and sonar_images.
    """
    if not body.image_ids:
        raise HTTPException(status_code=400, detail="No image_ids provided.")
    try:
        counts = repository.delete_by_image_ids(body.image_ids)
        return {"status": "ok", **counts}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
