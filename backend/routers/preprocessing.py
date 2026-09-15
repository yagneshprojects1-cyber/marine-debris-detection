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
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from schemas import BatchPreprocessItem, BatchPreprocessResponse, PreprocessResponse
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
        original_name, content, xml_name, xml_content, defer_persistence=True
    )
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
    """Store multiple image/XML pairs matched by filename stem."""
    xml_map: dict[str, UploadFile] = {
        Path(xml.filename).stem: xml
        for xml in xml_files
        if Path(xml.filename).suffix.lower() == ".xml"
    }
    results: list[BatchPreprocessItem] = []

    for image_file in images:
        original_name = Path(image_file.filename).name
        stem = Path(original_name).stem

        try:
            preprocessing_service.validate_extension(original_name)
        except ValueError as exc:
            results.append(BatchPreprocessItem(
                original_filename=original_name,
                status="error",
                error=str(exc),
            ))
            continue

        xml_file = xml_map.get(stem)
        if xml_file is None:
            results.append(BatchPreprocessItem(
                original_filename=original_name,
                status="error",
                error=f"No matching XML found for '{original_name}' (expected '{stem}.xml').",
            ))
            continue

        try:
            content = await image_file.read()
            xml_content = await xml_file.read()
            image_id, saved_path, preprocessed_path = preprocessing_service.create_upload_session(
                original_name,
                content,
                Path(xml_file.filename).name,
                xml_content,
                defer_persistence=True,
            )
        except Exception as exc:
            results.append(BatchPreprocessItem(
                original_filename=original_name,
                status="error",
                error=f"Failed to process batch item: {exc}",
            ))
            continue

        print(f"[Batch Preprocess] '{original_name}' ({len(content)} bytes) -> {saved_path}")
        results.append(BatchPreprocessItem(
            original_filename=original_name,
            status="success",
            image_id=image_id,
            preprocessed_image_url=f"/media/uploads/{image_id}/{preprocessed_path.name}",
        ))

    accepted = sum(1 for item in results if item.status == "success")
    return BatchPreprocessResponse(
        total=len(results),
        accepted=accepted,
        rejected=len(results) - accepted,
        items=results,
    )


@router.post("/preprocess/simulation", response_model=BatchPreprocessResponse)
async def preprocess_simulation(
    images: List[UploadFile] = File(...),
    xml_files: List[UploadFile] = File(...),
    start_bmp: str = Form(...),
    file_count: int = Form(...),
):
    """Select a numbered BMP range from a folder and run the batch pipeline."""
    if file_count < 1:
        raise HTTPException(status_code=400, detail="File count must be at least 1.")

    normalized_start = Path(start_bmp).name.lower()
    image_files = [
        image for image in images
        if Path(image.filename or "").suffix.lower() == ".bmp"
    ]
    xml_stems = {
        Path(xml.filename or "").stem.lower()
        for xml in xml_files
        if Path(xml.filename or "").suffix.lower() == ".xml"
    }
    image_files = [
        image for image in image_files
        if Path(image.filename or "").stem.lower() in xml_stems
    ]
    image_files.sort(key=lambda image: Path(image.filename or "").name.lower())
    start_index = next(
        (index for index, image in enumerate(image_files)
         if Path(image.filename or "").name.lower() == normalized_start),
        None,
    )
    if start_index is None:
        raise HTTPException(status_code=400, detail=f"Starting BMP file '{start_bmp}' was not found in the selected folder.")

    if start_index + file_count > len(image_files):
        raise HTTPException(
            status_code=400,
            detail=f"File count exceeds the {len(image_files) - start_index} matched BMP/XML file(s) available from the selected start file.",
        )

    selected_images = image_files[start_index:start_index + file_count]
    if not selected_images:
        raise HTTPException(status_code=400, detail="No BMP files found for the requested simulation range.")

    return await preprocess_batch(selected_images, xml_files)
