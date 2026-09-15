"""Database-backed data for the 2D and 3D map views."""

from fastapi import APIRouter, HTTPException

from database import repository

router = APIRouter(prefix="/api", tags=["6 - Map Data"])


@router.get("/map-data")
def get_map_data():
    """Return detections and sonar measurements required by both map views."""
    try:
        return repository.list_map_detections()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Map database is unavailable: {exc}") from exc