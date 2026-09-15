"""
API 1 — Image Preprocessing
===========================
POST /api/preprocess              (multipart form: file=<image>, xml_file=<xml>)
POST /api/preprocess/batch        (multipart form: images[]=…, xml_files[]=…)

Receives a sonar image (or a batch of them), stores on disk, and returns the
image_id(s) used by the detection API.

Batch naming convention: image stem must exactly match XML stem.
  e.g.  00001.bmp  ↔  00001.xml
        00002.bmp  ↔  00002.xml
Any image that has no matching XML is rejected with an error entry (processing
continues for valid pairs).
"""

from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from database import repository
from schemas import BatchPreprocessResponse, BatchPreprocessItem, PreprocessResponse
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
        print(f"[Warning] Image database unavailable ({exc}). Proceeding without database persistence.")
    print(f"[Preprocess] Received '{original_name}' ({len(content)} bytes) -> {saved_path}")

    return PreprocessResponse(
        status="success",
        message=f"'{original_name}' received and preprocessed successfully.",
        image_id=image_id,
        original_filename=original_name,
        preprocessed_image_url=f"/media/uploads/{image_id}/{preprocessed_path.name}",
    )


@router.post("/preprocess/batch", response_model=BatchPreprocessResponse)
async def preprocess_batch(
    images: List[UploadFile] = File(...),
    xml_files: List[UploadFile] = File(...),
):
    """
    Accept multiple image + XML pairs matched by filename stem.

    Both lists are matched by stem (e.g. ``00001.bmp`` ↔ ``00001.xml``).
    Returns one result entry per image — either success with an image_id or an
    error message when no matching XML is found.
    """
    # Build a stem → xml lookup
    xml_map: dict[str, UploadFile] = {}
    for xml in xml_files:
        stem = Path(xml.filename).stem
        xml_map[stem] = xml

    results: list[BatchPreprocessItem] = []

    for image_file in images:
        original_name = Path(image_file.filename).name
        stem = Path(original_name).stem

        # Validate image extension
        try:
            preprocessing_service.validate_extension(original_name)
        except ValueError as exc:
            results.append(BatchPreprocessItem(
                original_filename=original_name,
                status="error",
                error=str(exc),
            ))
            continue

        # Match XML by stem
        xml_file = xml_map.get(stem)
        if xml_file is None:
            results.append(BatchPreprocessItem(
                original_filename=original_name,
                status="error",
                error=f"No matching XML found for '{original_name}' (expected '{stem}.xml').",
            ))
            continue

        xml_name = Path(xml_file.filename).name

        content = await image_file.read()
        xml_content = await xml_file.read()

        try:
            image_id, saved_path, preprocessed_path = preprocessing_service.create_upload_session(
                original_name, content, xml_name, xml_content
            )
        except Exception as exc:
            results.append(BatchPreprocessItem(
                original_filename=original_name,
                status="error",
                error=f"Failed to create session: {exc}",
            ))
            continue

        try:
            repository.save_uploaded_image(
                image_id=image_id,
                image_name=original_name,
                image_path=str(saved_path),
                preprocessed_path=str(preprocessed_path),
            )
        except Exception as exc:
            print(f"[Warning] Image database unavailable ({exc}). Proceeding without DB persistence.")

        print(f"[Batch Preprocess] '{original_name}' ({len(content)} bytes) -> {saved_path}")

        results.append(BatchPreprocessItem(
            original_filename=original_name,
            status="success",
            image_id=image_id,
            preprocessed_image_url=f"/media/uploads/{image_id}/{preprocessed_path.name}",
        ))

    accepted = sum(1 for r in results if r.status == "success")
    return BatchPreprocessResponse(
        total=len(results),
        accepted=accepted,
        rejected=len(results) - accepted,
        items=results,
    )
