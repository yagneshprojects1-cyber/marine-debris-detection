"""Persistence operations for uploaded images, metadata, and predictions."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from PIL import Image

from .connection import get_database
from .models import AIPrediction, Metadata, SonarImage


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


def save_detection_results(image_id: str, annotation: dict[str, Any], detections: list[dict[str, Any]]) -> None:
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
        )
        database["metadata"].insert_one(metadata.model_dump(mode="json"))
        database["ai_predictions"].insert_one(prediction.model_dump(mode="json"))


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
    rows = []
    for prediction in database["ai_predictions"].find({}, {"_id": 0}).sort("predicted_id", -1):
        image = images.get(prediction.get("image_id"), {})
        meta = metadata.get(prediction.get("meta_id"), {})
        uploaded_at = image.get("uploaded_timestamp")
        rows.append({
            "object": prediction.get("object_class") or "Unknown",
            "confidence": prediction.get("confidence_score"),
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
        })
    return rows


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
