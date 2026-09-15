import json
from pathlib import Path

from fastapi import HTTPException
from PIL import Image

import config
import session_store
from schemas import BoundingBox, DetectionReport, FileInfo, ImageSize, ReportObject, SonarInfo


def get_detected_session(image_id: str) -> dict:
    """Return a session after confirming detection has completed."""
    session = session_store.get_session(image_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Unknown image_id '{image_id}'.")
    if session["detections"] is None:
        raise HTTPException(status_code=409, detail="Detection has not run yet.")
    return session


def read_image_size(image_path: str) -> ImageSize:
    with Image.open(image_path) as image:
        return ImageSize(width=image.width, height=image.height, channel=len(image.getbands()))


def build_report(session: dict) -> dict:
    annotation = session["annotation"]
    sonar_data = annotation["sonar"]
    sonar = SonarInfo(
        range=sonar_data["range"],
        azimuth=sonar_data["azimuth"],
        elevation=sonar_data["elevation"],
        soundspeed=sonar_data["soundspeed"],
        frequency=sonar_data["frequency"],
    )
    report = DetectionReport(
        sonar=sonar,
        file=FileInfo(folder=annotation["folder"], filename=annotation["filename"] or Path(session["original_filename"]).stem),
        size=read_image_size(session["upload_path"]),
        object=[
            ReportObject(
                name=detection["name"],
                confidence=detection["confidence"],
                latitude=detection["latitude"],
                longitude=detection["longitude"],
                bndbox=BoundingBox(**detection["bndbox"]),
            )
            for detection in session["detections"]
        ],
    )
    return json.loads(report.model_dump_json())


def format_report(report: dict) -> str:
    return json.dumps(report, indent=4)
