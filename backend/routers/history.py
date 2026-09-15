"""API for database-backed detection history."""

from fastapi import APIRouter, HTTPException

from database import repository
import session_store
import config
from schemas import BatchSaveTrainingRequest, SaveTrainingDataRequest

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


@router.post("/history/batch/accept")
def accept_history_batch(request: BatchSaveTrainingRequest):
    """Validate and persist every completed result in one batch action."""
    sessions = []
    for item in request.items:
        session = session_store.get_session(item.image_id)
        if session is None or session["detections"] is None:
            raise HTTPException(status_code=409, detail=f"Detection is not ready for '{item.image_id}'.")

        labels_by_index = {label.detection_index: label.analyst_name.strip() for label in item.labels}
        low_confidence_indexes = [
            index for index, detection in enumerate(session["detections"])
            if detection.get("confidence") is not None
            and float(detection["confidence"]) < config.AI_REVIEW_THRESHOLD
        ]
        if any(not labels_by_index.get(index) for index in low_confidence_indexes):
            raise HTTPException(status_code=400, detail="Every low-confidence detection requires an analyst object name.")
        sessions.append((item, session, labels_by_index, low_confidence_indexes))

    try:
        for item, session, labels_by_index, low_confidence_indexes in sessions:
            repository.save_training_data(
                image_id=item.image_id,
                image_name=session["original_filename"],
                image_path=session["upload_path"],
                preprocessed_path=session["preprocessed_path"],
                annotation=session["annotation"],
                detections=session["detections"],
                analyst_labels=[
                    {
                        "detection_index": index,
                        "ai_name": detection.get("name"),
                        "analyst_name": labels_by_index.get(index, detection.get("name")),
                        "confidence": detection.get("confidence"),
                    }
                    for index, detection in enumerate(session["detections"])
                ],
                annotated_image_url=item.annotated_image_url,
                confidence_threshold=config.AI_REVIEW_THRESHOLD,
            )
            if not low_confidence_indexes:
                repository.save_uploaded_image(
                    image_id=item.image_id,
                    image_name=session["original_filename"],
                    image_path=session["upload_path"],
                    preprocessed_path=session["preprocessed_path"],
                )
                repository.save_detection_results(
                    image_id=item.image_id,
                    annotation=session["annotation"],
                    detections=session["detections"],
                )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to save the batch results.") from exc

    return {"status": "accepted", "image_ids": [item.image_id for item in request.items]}


@router.post("/history/{image_id}/accept")
def accept_history_record(image_id: str, request: SaveTrainingDataRequest):
    """Persist a completed, analyst-reviewed result for history and training."""
    session = session_store.get_session(image_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Detection session was not found.")
    if session["detections"] is None:
        raise HTTPException(status_code=409, detail="Detection has not completed yet.")

    labels_by_index = {label.detection_index: label.analyst_name.strip() for label in request.labels}
    if any(not name for name in labels_by_index.values()):
        raise HTTPException(status_code=400, detail="Every analyst label must have an object name.")
    low_confidence_indexes = [
        index
        for index, detection in enumerate(session["detections"])
        if detection.get("confidence") is not None
        and float(detection["confidence"]) < config.AI_REVIEW_THRESHOLD
    ]
    missing_labels = [index for index in low_confidence_indexes if index not in labels_by_index]
    if missing_labels:
        raise HTTPException(status_code=400, detail="Low-confidence detections require analyst object names.")

    try:
        repository.save_training_data(
            image_id=image_id,
            image_name=session["original_filename"],
            image_path=session["upload_path"],
            preprocessed_path=session["preprocessed_path"],
            annotation=session["annotation"],
            detections=session["detections"],
            analyst_labels=[
                {
                    "detection_index": index,
                    "ai_name": detection.get("name"),
                    "analyst_name": labels_by_index.get(index, detection.get("name")),
                    "confidence": detection.get("confidence"),
                }
                for index, detection in enumerate(session["detections"])
            ],
            annotated_image_url=request.annotated_image_url,
            confidence_threshold=config.AI_REVIEW_THRESHOLD,
        )
        if not low_confidence_indexes:
            repository.save_uploaded_image(
                image_id=image_id,
                image_name=session["original_filename"],
                image_path=session["upload_path"],
                preprocessed_path=session["preprocessed_path"],
            )
            repository.save_detection_results(
                image_id=image_id,
                annotation=session["annotation"],
                detections=session["detections"],
            )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to store the detection in history.") from exc

    return {"status": "accepted", "image_id": image_id}

