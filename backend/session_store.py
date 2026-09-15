"""
In-memory session store.

Each uploaded image gets a unique ``image_id``. The store keeps track of
where the image lives on disk and (after detection) the objects that were
found. This keeps routers stateless and makes it trivial to swap in a real
database later.
"""

import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

_lock = threading.Lock()
_sessions: Dict[str, Dict[str, Any]] = {}


def create_session(image_id: str, original_filename: str, upload_path: str, annotation: Dict[str, Any]) -> str:
    """Register a freshly uploaded image under the given image_id."""
    with _lock:
        _sessions[image_id] = {
            "image_id": image_id,
            "original_filename": original_filename,
            "upload_path": upload_path,
            "annotation": annotation,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "detections": None,  # filled in by the detection API
        }

    return image_id


def get_session(image_id: str) -> Optional[Dict[str, Any]]:
    """Return the session record for an image_id, or None if unknown."""
    with _lock:
        return _sessions.get(image_id)


def all_sessions() -> list:
    """Return a snapshot of every session, oldest first."""
    with _lock:
        return [dict(session) for session in _sessions.values()]


def save_detections(image_id: str, detections: list) -> None:
    """Attach the YOLO detection results to an existing session."""
    with _lock:
        session = _sessions.get(image_id)
        if session is not None:
            session["detections"] = detections
            