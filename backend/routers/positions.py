"""
API 5 — Geospatial Position Calculation
=======================================
POST /api/calculate-position           -> run position.py over geotag.csv
GET  /api/geotag-calculated            -> computed positions as JSON
GET  /api/download-geotag-calculated   -> same data as a .json download

position.py applies Vincenty's direct formula (WGS-84) to every row of
geotag.csv: ship GPS + heading + target range/azimuth -> object lat/lon.
The script is executed as a subprocess so its CLI contract stays unchanged.
"""

import json
import subprocess
import sys

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

import config

router = APIRouter(prefix="/api", tags=["5 - Position Calculation"])


def _run_position_script() -> str:
    """Execute position.py and return its console output."""
    command = [
        sys.executable,                  # same Python environment as this server
        str(config.POSITION_SCRIPT_PATH),
        str(config.GEOTAG_CSV_PATH),
        "--output",
        str(config.CALCULATED_POSITIONS_PATH),
    ]

    completed = subprocess.run(
        command,
        cwd=str(config.BASE_DIR),
        capture_output=True,
        text=True,
        timeout=120,
    )

    if completed.returncode != 0:
        raise RuntimeError(completed.stderr or completed.stdout or "position.py failed")

    return completed.stdout


@router.post("/calculate-position")
def calculate_position():
    """Recalculate lat/lon for every object in the dataset."""
    # Remove stale output so an old file is never served after a failure.
    config.CALCULATED_POSITIONS_PATH.unlink(missing_ok=True)

    try:
        log = _run_position_script()
    except Exception as exc:  # noqa: BLE001 - surfaced to the client
        raise HTTPException(status_code=500, detail=f"Failed to calculate positions: {exc}")

    positions = json.loads(config.CALCULATED_POSITIONS_PATH.read_text(encoding="utf-8"))

    return {
        "message": "Positions calculated",
        "count": len(positions),
        "output_file": config.CALCULATED_POSITIONS_PATH.name,
        "log": log,
    }


@router.get("/geotag-calculated")
def get_calculated_positions():
    """Return the calculated positions JSON (404 until first calculation)."""
    if not config.CALCULATED_POSITIONS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Positions not calculated yet. Call /api/calculate-position first.",
        )

    return json.loads(config.CALCULATED_POSITIONS_PATH.read_text(encoding="utf-8"))


@router.get("/download-geotag-calculated")
def download_calculated_positions():
    """Download the calculated positions as a .json file."""
    if not config.CALCULATED_POSITIONS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Positions not calculated yet. Call /api/calculate-position first.",
        )

    return FileResponse(
        path=config.CALCULATED_POSITIONS_PATH,
        media_type="application/json",
        filename=config.CALCULATED_POSITIONS_PATH.name,
    )
