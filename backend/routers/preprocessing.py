"""
API 1 — Image Preprocessing
===========================
POST /api/preprocess   (multipart form: file=<image>)

Receives a sonar image, stores it on disk, prints a message and returns the
same image back together with an ``image_id`` used by the detection API.

The current preprocessing service preserves the upload and creates a copy for
the frontend preview; image processing can be added without changing the API.
"""

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from database import repository
from schemas import PreprocessResponse
from services import preprocessing_service

router = APIRouter(prefix="/api", tags=["1 - Preprocessing"])


@router.post("/preprocess", response_model=PreprocessResponse)
async def preprocess_image(
    file: UploadFile = File(...),
    xml_file: UploadFile = File(...),
):
    """Store an uploaded image and its required sonar annotation XML."""
    original_name = Path(file.filename).name
    try:
        preprocessing_service.validate_extension(original_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    xml_name = Path(xml_file.filename).name
    if Path(xml_name).suffix.lower() != ".xml":
        raise HTTPException(status_code=400, detail="A .xml annotation file is required.")

    content = await file.read()
    xml_content = await xml_file.read()
    image_id, saved_path, preprocessed_path = preprocessing_service.create_upload_session(
        original_name, content, xml_name, xml_content
    )
    try:
        repository.save_uploaded_image(
            image_id=image_id,
            image_name=original_name,
            image_path=str(saved_path),
            preprocessed_path=str(preprocessed_path),
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Image database is unavailable: {exc}") from exc
    print(f"[Preprocess] Received '{original_name}' ({len(content)} bytes) -> {saved_path}")

    return PreprocessResponse(
        status="success",
        message=f"'{original_name}' received and preprocessed successfully.",
        image_id=image_id,
        original_filename=original_name,
        preprocessed_image_url=f"/media/uploads/{image_id}/{preprocessed_path.name}",
    )
