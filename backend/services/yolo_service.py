"""
YOLO service — model loading and inference.

The trained weights (``bestv2.pt``) are loaded exactly once and reused for
every request, which keeps inference fast after the first call.
"""

import os
import sys
import traceback
from pathlib import Path
from typing import Optional

import config

_model = None
_model_error = None


def _configure_cpu_memory():
    """Configure PyTorch for low-memory CPU environments (Render free tier friendly)."""
    try:
        os.environ.setdefault("OMP_NUM_THREADS", "2")
        os.environ.setdefault("MKL_NUM_THREADS", "2")
        os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
        import torch
        torch.set_num_threads(2)
        torch.set_num_interop_threads(2)
        print("[YOLO] PyTorch configured for low-memory CPU mode")
    except Exception as e:
        print(f"[YOLO] Warning: could not configure PyTorch memory settings: {e}")


def preload_model() -> bool:
    """Eagerly load the YOLO weights at startup. Returns True on success."""
    global _model, _model_error

    _configure_cpu_memory()

    if not config.MODEL_WEIGHTS_PATH.exists():
        _model_error = f"Model file not found at {config.MODEL_WEIGHTS_PATH}"
        print(f"[YOLO] {_model_error}")
        return False

    try:
        from ultralytics import YOLO

        print(f"[YOLO] Loading model weights from {config.MODEL_WEIGHTS_PATH} ...")
        model = YOLO(str(config.MODEL_WEIGHTS_PATH))
        print("[YOLO] Model loaded successfully")

        try:
            import cv2
            import numpy as np
            test_img = np.zeros((640, 640, 3), dtype=np.uint8)
            _ = model.predict(source=test_img, conf=0.25, verbose=False, imgsz=320)
            print("[YOLO] Warm-up inference completed")
        except Exception as warmup_err:
            print(f"[YOLO] Warm-up skipped (non-fatal): {warmup_err}")

        _model = model
        _model_error = None
        return True

    except Exception as e:
        _model_error = f"{type(e).__name__}: {str(e)}"
        print(f"[YOLO] Failed to load model: {_model_error}")
        print(traceback.format_exc())
        _model = None
        return False


def is_model_ready() -> bool:
    """Return True if the YOLO model is loaded and ready."""
    return _model is not None


def get_model_error() -> Optional[str]:
    """Return a human-readable string describing why the model failed to load, or None if OK."""
    return _model_error


def get_model():
    """Return the loaded YOLO model, loading it now if this is the first call."""
    global _model
    if _model is None:
        preload_model()
    return _model


def run_detection(image_path: Path):
    """Run inference on a single image and return raw ultralytics Results."""
    model = get_model()
    if model is None:
        raise RuntimeError(
            f"YOLO model is not available. Reason: {_model_error or 'unknown error'}. "
            "Check server logs for details."
        )

    results = model.predict(
        source=str(image_path),
        conf=config.CONFIDENCE_THRESHOLD,
        verbose=False,
        imgsz=640,
        half=False,
    )
    return results


def save_annotated_image(result, destination: Path) -> Path:
    """Draw the bounding boxes on the image and save it to ``destination``."""
    import cv2

    destination.parent.mkdir(parents=True, exist_ok=True)

    plotted_bgr = result.plot()
    success, encoded = cv2.imencode(".jpg", plotted_bgr)
    if not success:
        raise RuntimeError("Failed to encode annotated image")

    encoded.tofile(str(destination))
    return destination
