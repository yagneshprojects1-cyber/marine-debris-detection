"""
YOLO service — model loading and inference.

The trained weights (``bestv2.pt``) are loaded exactly once and reused for
every request, which keeps inference fast after the first call.
"""

from functools import lru_cache
from pathlib import Path
import config


@lru_cache(maxsize=1)
def get_model():
    """Load the YOLO weights one time, then return the cached model."""
    from ultralytics import YOLO

    print(f"[YOLO] Loading model weights from {config.MODEL_WEIGHTS_PATH}")
    return YOLO(str(config.MODEL_WEIGHTS_PATH))


def run_detection(image_path: Path):
    """Run inference on a single image and return raw ultralytics Results."""
    model = get_model()
    results = model.predict(
        source=str(image_path),
        conf=config.CONFIDENCE_THRESHOLD,
        verbose=False,
    )
    return results


def save_annotated_image(result, destination: Path) -> Path:
    """Draw the bounding boxes on the image and save it to ``destination``."""
    import cv2

    destination.parent.mkdir(parents=True, exist_ok=True)

    plotted_bgr = result.plot()  # numpy image with boxes/labels drawn on it
    success, encoded = cv2.imencode(".jpg", plotted_bgr)
    if not success:
        raise RuntimeError("Failed to encode annotated image")

    # tofile() handles Windows paths more reliably than cv2.imwrite()
    encoded.tofile(str(destination))
    return destination
