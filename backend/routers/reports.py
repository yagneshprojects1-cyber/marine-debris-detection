"""
API 3 — Detection Report (JSON)
===============================
GET  /api/report/{image_id}           -> JSON report body
GET  /api/report/{image_id}/download  -> same report as a .json file

The report mirrors the classic XML annotation layout used by the dataset:

    <annotation>
        <sonar>   range / azimuth / elevation / soundspeed / frequency
        <file>    folder / filename
        <size>    width / height / channel
        <object>  name + bndbox   (one entry per detection)
    </annotation>
"""

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import Response

from schemas import DetectionReport
from services import report_service

router = APIRouter(prefix="/api", tags=["3 - Report"])


@router.get("/report/{image_id}", response_model=DetectionReport)
def get_report(image_id: str):
    """Return the JSON detection report."""
    session = report_service.get_detected_session(image_id)
    return report_service.build_report(session)


@router.get("/report/{image_id}/download")
def download_report(image_id: str):
    """Download the JSON report as a file attachment."""
    session = report_service.get_detected_session(image_id)
    report = report_service.build_report(session)

    stem = Path(session["original_filename"]).stem
    filename = f"{stem}_detection_report.json"

    return Response(
        content=report_service.format_report(report),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
