"""
API 2 — AI Object Detection (YOLO)

Flow:
Uploaded Image
    ↓
Adaptive Noise Detection
    ↓
Appropriate Filter
    ↓
YOLO Detection
    ↓
Annotated Image + XML/Geotag Results
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException

import config
import session_store

from database import repository
from schemas import DetectionResponse
from services import detection_service, geotag_service, yolo_service

from adaptive_filter import adaptive_filter

import cv2


router = APIRouter(
    prefix="/api",
    tags=["2 - AI Detection"]
)


@router.post(
    "/detect/{image_id}",
    response_model=DetectionResponse
)
async def detect_objects(image_id: str):

    """Run adaptive filtering followed by YOLO."""

    # --------------------------------------------------
    # Get uploaded image session
    # --------------------------------------------------

    session = session_store.get_session(image_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Unknown image_id '{image_id}'. "
                "Upload the image first via /api/preprocess."
            ),
        )

    image_path = Path(session["upload_path"])

    if not image_path.exists():
        raise HTTPException(
            status_code=410,
            detail="Stored image is missing on disk."
        )


    # --------------------------------------------------
    # Check YOLO model
    # --------------------------------------------------

    if not config.MODEL_WEIGHTS_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                f"YOLO model file not found at "
                f"{config.MODEL_WEIGHTS_PATH}. "
                "Please ensure bestv2.pt is in the backend directory."
            ),
        )


    # --------------------------------------------------
    # ADAPTIVE FILTERING
    # --------------------------------------------------

    print(
        f"[Detection] Starting adaptive preprocessing "
        f"for '{session['original_filename']}'..."
    )

    try:

        # Read uploaded image
        image = cv2.imread(
            str(image_path),
            cv2.IMREAD_GRAYSCALE
        )

        if image is None:
            raise RuntimeError(
                "Failed to read uploaded image."
            )


        # Run noise detection + adaptive filtering
        (
            filtered_image,
            noise_type,
            filter_name,
            filter_confidence
        ) = adaptive_filter(image)


        print(
            f"[Adaptive Filter] Noise detected: "
            f"{noise_type}"
        )

        print(
            f"[Adaptive Filter] Filter applied: "
            f"{filter_name}"
        )

        print(
            f"[Adaptive Filter] Confidence: "
            f"{filter_confidence * 100:.2f}%"
        )


        # --------------------------------------------------
        # Save filtered image
        # --------------------------------------------------

        filtered_dir = (
            config.RESULT_DIR /
            image_id
        )

        filtered_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        filtered_path = (
            filtered_dir /
            "filtered.jpg"
        )


        success = cv2.imwrite(
            str(filtered_path),
            filtered_image
        )

        if not success:
            raise RuntimeError(
                "Failed to save filtered image."
            )


        print(
            f"[Adaptive Filter] Filtered image saved -> "
            f"{filtered_path}"
        )


    except Exception as e:

        print(
            f"[Adaptive Filter] Error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Adaptive preprocessing failed: {str(e)}"
            ),
        )


    # --------------------------------------------------
    # YOLO DETECTION
    # --------------------------------------------------

    print(
        f"[Detection] Running YOLO on filtered image..."
    )

    try:

        results = yolo_service.run_detection(
            filtered_path
        )

    except Exception as e:

        print(
            f"[Detection] Error during YOLO inference: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"YOLO detection failed: {str(e)}"
            ),
        )


    # --------------------------------------------------
    # Primary YOLO result
    # --------------------------------------------------

    primary_result = results[0]


    # --------------------------------------------------
    # Save annotated image
    # --------------------------------------------------

    annotated_path = (
        yolo_service.save_annotated_image(
            primary_result,
            config.RESULT_DIR /
            image_id /
            "annotated.jpg",
        )
    )

    print(
        f"[Detection] Annotated image saved -> "
        f"{annotated_path}"
    )


    # --------------------------------------------------
    # Determine ship position (geotag CSV or random Indian Ocean ship location)
    # --------------------------------------------------

    ship_loc = session.get("ship_location")
    if not ship_loc:
        geotag_row = geotag_service.lookup(session["original_filename"])
        if geotag_row:
            ship_loc = {
                "latitude": float(geotag_row["vehicle_lat"]),
                "longitude": float(geotag_row["vehicle_lon"]),
                "name": geotag_row.get("split", "Geotag Dataset"),
            }
        else:
            ship_loc = config.random_ship_location()
        session["ship_location"] = ship_loc


    # --------------------------------------------------
    # Build detection response
    # --------------------------------------------------

    detected_objects = (
        detection_service.extract_detections(
            primary_result,
            session["annotation"],
            ship_location=ship_loc,
        )
    )


    session_store.save_detections(
        image_id,
        [
            obj.model_dump()
            for obj in detected_objects
        ]
    )


    # --------------------------------------------------
    # Response message
    # --------------------------------------------------
    detection_documents = [obj.model_dump() for obj in detected_objects]
    session_store.save_detections(image_id, detection_documents)
    try:
        repository.save_detection_results(
            image_id=image_id,
            annotation=session["annotation"],
            detections=detection_documents,
        )
    except Exception as exc:
        print(f"[Warning] Detection database unavailable ({exc}). Proceeding without database persistence.")

    message = (
        f"{len(detected_objects)} object(s) detected."
        if detected_objects
        else
        "No objects detected above the confidence threshold."
    )


    print(
        f"[Detection] {message}"
    )


    # --------------------------------------------------
    # Return response
    # --------------------------------------------------

    return DetectionResponse(

        status="success",

        message=message,

        image_id=image_id,

        objects_detected=detected_objects,

        ship_latitude=ship_loc["latitude"],

        ship_longitude=ship_loc["longitude"],

        ship_water_body=ship_loc.get("name", "Indian Ocean"),

        annotated_image_url=(
            f"/media/results/"
            f"{image_id}/annotated.jpg"
        ),
    )