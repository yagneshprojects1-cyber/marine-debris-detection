"""Persistence operations for uploaded images, metadata, and predictions."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from PIL import Image

from .connection import get_database
from .models import AIPrediction, Metadata, SonarImage


def _build_low_confidence_training_data(
    detections: list[dict[str, Any]],
    analyst_labels: list[dict[str, Any]],
    confidence_threshold: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Keep only low-confidence debris and replace its class with the analyst label."""
    labels_by_index = {
        label["detection_index"]: label.get("analyst_name", "").strip()
        for label in analyst_labels
    }
    training_detections = []
    training_labels = []

    for index, detection in enumerate(detections):
        confidence = detection.get("confidence")
        if confidence is None or float(confidence) >= confidence_threshold:
            continue

        analyst_name = labels_by_index.get(index) or detection.get("name") or "Unknown"
        training_detection = {**detection, "name": analyst_name}
        training_detections.append(training_detection)
        training_labels.append({
            "detection_index": index,
            "ai_name": detection.get("name"),
            "analyst_name": analyst_name,
            "confidence": confidence,
        })

    return training_detections, training_labels


def save_uploaded_image(
    image_id: str,
    image_name: str,
    image_path: str,
    preprocessed_path: str,
) -> None:
    """Store one upload in the sonar_images collection."""
    with Image.open(image_path) as image:
        document = SonarImage(
            img_unique_id=image_id,
            uploaded_timestamp=datetime.now(timezone.utc),
            image_format=image.format,
            image_name=image_name,
            image_size=Path(image_path).stat().st_size,
            image_width=image.width,
            image_height=image.height,
            noised_image_path=image_path,
            preprocessed_image_path=preprocessed_path,
        )

    get_database()["sonar_images"].replace_one(
        {"img_unique_id": image_id},
        document.model_dump(mode="json"),
        upsert=True,
    )


def save_detection_results(
    image_id: str,
    annotation: dict[str, Any],
    detections: list[dict[str, Any]],
    analyst_name: str | None = None,
) -> None:
    """Store metadata and predictions when the detect action completes."""
    database = get_database()
    sonar = annotation["sonar"]

    # A repeated Detect click represents a new result for the same image.
    database["ai_predictions"].delete_many({"image_id": image_id})
    database["metadata"].delete_many({"image_id": image_id})

    if not detections:
        metadata = Metadata(
            meta_id=uuid4().hex,
            image_id=image_id,
            range=sonar.get("range"),
            azimuth=sonar.get("azimuth"),
            elevation=sonar.get("elevation"),
            sound_speed=sonar.get("soundspeed"),
            frequency=sonar.get("frequency"),
        )
        database["metadata"].insert_one(metadata.model_dump(mode="json"))
        return

    for detection in detections:
        meta_id = uuid4().hex
        metadata = Metadata(
            meta_id=meta_id,
            image_id=image_id,
            range=sonar.get("range"),
            azimuth=sonar.get("azimuth"),
            elevation=sonar.get("elevation"),
            sound_speed=sonar.get("soundspeed"),
            frequency=sonar.get("frequency"),
            **detection["bndbox"],
        )
        prediction = AIPrediction(
            predicted_id=uuid4().hex,
            image_id=image_id,
            meta_id=meta_id,
            object_class=detection.get("name"),
            confidence_score=detection.get("confidence"),
            depth=detection.get("depth"),
            local_x=detection.get("local_x"),
            local_z=detection.get("local_z"),
            latitude=detection.get("latitude"),
            longitude=detection.get("longitude"),
            status="Validated",
            analyst_name=analyst_name,
        )
        database["metadata"].insert_one(metadata.model_dump(mode="json"))
        database["ai_predictions"].insert_one(prediction.model_dump(mode="json"))


def save_training_data(
    image_id: str,
    image_name: str,
    image_path: str,
    preprocessed_path: str,
    annotation: dict[str, Any],
    detections: list[dict[str, Any]],
    analyst_labels: list[dict[str, Any]],
    annotated_image_url: str | None,
    confidence_threshold: float,
    analyst_name: str | None = None,
) -> None:
    """Save only low-confidence, analyst-labelled debris for future model training."""
    database = get_database()
    training_detections, training_labels = _build_low_confidence_training_data(
        detections,
        analyst_labels,
        confidence_threshold,
    )

    if not training_detections:
        database["ai_training_data"].delete_one({"image_id": image_id})
        return

    if analyst_name:
        database["ai_predictions"].update_many(
            {"image_id": image_id},
            {"$set": {"analyst_name": analyst_name}},
        )
    document = {
        "image_id": image_id,
        "image_name": image_name,
        "image_path": image_path,
        "preprocessed_image_path": preprocessed_path,
        "annotated_image_url": annotated_image_url,
        "annotation": annotation,
        "ai_predictions": training_detections,
        "analyst_labels": training_labels,
        "analyst_name": analyst_name,
        "confidence_threshold": confidence_threshold,
        "reviewed_at": datetime.now(timezone.utc),
    }
    database["ai_training_data"].replace_one(
        {"image_id": image_id},
        document,
        upsert=True,
    )


def list_history() -> list[dict[str, Any]]:
    """Return database-backed history rows joined with image details."""
    database = get_database()
    images = {
        image["img_unique_id"]: image
        for image in database["sonar_images"].find({}, {"_id": 0})
    }
    metadata = {
        item["meta_id"]: item
        for item in database["metadata"].find({}, {"_id": 0})
    }
    group_by_detection = {}
    for group in database["removal_groups"].find({}, {"_id": 0}):
        for detection_id in group.get("detection_ids", []):
            group_by_detection[detection_id] = group
    rows = []
    for prediction in database["ai_predictions"].find({}, {"_id": 0}).sort("predicted_id", -1):
        image = images.get(prediction.get("image_id"), {})
        meta = metadata.get(prediction.get("meta_id"), {})
        group = group_by_detection.get(prediction.get("predicted_id"), {})
        uploaded_at = image.get("uploaded_timestamp")
        rows.append({
            "predicted_id": prediction.get("predicted_id"),
            "object": prediction.get("object_class") or "Unknown",
            "confidence": prediction.get("confidence_score"),
            "status": prediction.get("status") or "Validated",
            "latitude": prediction.get("latitude"),
            "longitude": prediction.get("longitude"),
            "date": uploaded_at,
            "timestamp": uploaded_at,
            "bounding_box": {
                "xmin": meta.get("xmin"),
                "ymin": meta.get("ymin"),
                "xmax": meta.get("xmax"),
                "ymax": meta.get("ymax"),
            },
            "image_id": prediction.get("image_id"),
            "image_name": image.get("image_name"),
            "analyst_name": prediction.get("analyst_name"),
            "group_id": group.get("group_id"),
            "allocated_operators": group.get("operators", []),
        })
    return sorted(
        rows,
        key=lambda row: row.get("timestamp") or row.get("date") or "",
        reverse=True,
    )


def list_map_detections() -> dict[str, Any]:
    """Return detections and metadata for the most recently uploaded image."""
    database = get_database()
    latest_image = database["sonar_images"].find_one(
        {},
        {"_id": 0, "img_unique_id": 1, "image_name": 1, "uploaded_timestamp": 1},
        sort=[("uploaded_timestamp", -1)],
    )
    if not latest_image:
        return {"image": None, "detections": [], "object_count": 0}

    image_id = latest_image["img_unique_id"]
    metadata = {
        item["meta_id"]: item
        for item in database["metadata"].find({"image_id": image_id}, {"_id": 0})
    }
    detections = []
    for prediction in database["ai_predictions"].find({"image_id": image_id}, {"_id": 0}):
        meta = metadata.get(prediction.get("meta_id"), {})
        detections.append({
            "name": prediction.get("object_class"),
            "confidence": prediction.get("confidence_score"),
            "latitude": prediction.get("latitude"),
            "longitude": prediction.get("longitude"),
            "depth": prediction.get("depth"),
            "local_x": prediction.get("local_x"),
            "local_z": prediction.get("local_z"),
            "sonar_range": meta.get("range"),
            "sonar_azimuth": meta.get("azimuth"),
            "sonar_elevation": meta.get("elevation"),
            "sonar_soundspeed": meta.get("sound_speed"),
            "sonar_frequency": meta.get("frequency"),
            "bndbox": {
                "xmin": meta.get("xmin"),
                "ymin": meta.get("ymin"),
                "xmax": meta.get("xmax"),
                "ymax": meta.get("ymax"),
            },
            "image_id": prediction.get("image_id"),
        })
    return {
        "image": latest_image,
        "detections": detections,
        "object_count": len(detections),
    }
