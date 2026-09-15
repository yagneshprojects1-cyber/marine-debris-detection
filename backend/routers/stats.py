"""
API 4 — Dashboard Statistics
============================
GET /api/stats

Lightweight counters for the dashboard page:
    - images_processed   : uploads since server start
    - objects_detected   : total objects found across all detections
    - dataset_entries    : rows available in geotag.csv
    - model_classes      : number of classes the YOLO model can detect
    - recent_detections  : flattened list of the latest findings
"""

import re
from typing import Any, Dict, List

import config
import session_store
from fastapi import APIRouter
from services import geotag_service

router = APIRouter(prefix="/api", tags=["4 - Stats"])


def _count_model_classes() -> int:
    """Count class entries in data.yaml without loading the heavy model."""
    try:
        content = config.MODEL_WEIGHTS_PATH.with_name("data.yaml").read_text(encoding="utf-8")
        return len(re.findall(r"^\s*\d+\s*:", content, flags=re.MULTILINE))
    except OSError:
        return 0


def _collect_recent_detections(sessions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Flatten the newest sessions into a simple recent-activity list."""
    recent: List[Dict[str, Any]] = []

    for session in reversed(sessions):
        for detection in session["detections"] or []:
            recent.append(
                {
                    "image_id": session["image_id"],
                    "filename": session["original_filename"],
                    "name": detection["name"],
                    "confidence": detection["confidence"],
                    "latitude": detection["latitude"],
                    "longitude": detection["longitude"],
                }
            )

    # Most recent first, capped so the dashboard stays light.
    return recent[:10]


@router.get("/stats")
def get_stats():
    """Aggregate dashboard counters from the in-memory store + dataset files."""
    sessions = session_store.all_sessions()

    objects_detected = sum(
        len(session["detections"] or [])
        for session in sessions
    )

    return {
        "images_processed": len(sessions),
        "objects_detected": objects_detected,
        "dataset_entries": geotag_service.count_entries(),
        "model_classes": _count_model_classes(),
        "recent_detections": _collect_recent_detections(sessions),
    }
