"""
Central configuration for the Debris Detector backend.

Every path and tunable value used by the application lives here so that
routers and services never hard-code locations or magic numbers.
"""

import random
from pathlib import Path

# ── Application ───────────────────────────────────────────────────────────────
APP_NAME = "Debris Detector API"
API_HOST = "127.0.0.1"
API_PORT = 8000

# ── Directories ───────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent          # .../backend
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"                   # original uploaded images
RESULT_DIR = DATA_DIR / "results"                   # YOLO annotated images

# ── Model & dataset files ─────────────────────────────────────────────────────
MODEL_WEIGHTS_PATH = BASE_DIR / "bestv2.pt"
GEOTAG_CSV_PATH = BASE_DIR / "geotag.csv"

# ── Position calculation (Vincenty direct formula script) ─────────────────────
POSITION_SCRIPT_PATH = BASE_DIR / "position.py"
CALCULATED_POSITIONS_PATH = BASE_DIR / "geotag_calculated.json"

# ── Detection settings ────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.25
ALLOWED_EXTENSIONS = {".bmp", ".png", ".jpg", ".jpeg"}

# Sonar geometry is supplied by each uploaded XML annotation.
# Demo ship origin used until live ship GPS data is connected.
DEMO_SHIP_LATITUDE = 18.922
DEMO_SHIP_LONGITUDE = 72.8347

# Random demo ROV positions used when live GPS data is unavailable.
INDIAN_OCEAN_SHIP_LOCATIONS = [
    {"latitude": 15.20, "longitude": 73.80, "name": "Indian Ocean"},
    {"latitude": 19.00, "longitude": 71.80, "name": "Indian Ocean"},
    {"latitude": 21.20, "longitude": 68.50, "name": "Indian Ocean"},
    {"latitude": 10.50, "longitude": 74.50, "name": "Indian Ocean"},
    {"latitude": 12.80, "longitude": 69.20, "name": "Indian Ocean"},
    {"latitude": 13.20, "longitude": 81.50, "name": "Bay of Bengal"},
    {"latitude": 19.00, "longitude": 87.50, "name": "Bay of Bengal"},
    {"latitude": 5.50, "longitude": 80.00, "name": "Indian Ocean"},
    {"latitude": 10.50, "longitude": 96.50, "name": "Andaman Sea"},
    {"latitude": 11.00, "longitude": 72.00, "name": "Indian Ocean"},
]


def random_ship_location() -> dict:
	"""Return one independent Indian Ocean ship position."""
	return random.choice(INDIAN_OCEAN_SHIP_LOCATIONS).copy()
