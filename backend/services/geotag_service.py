"""
Geotag service — geographic lookup and position calculation.

Reads ``backend/geotag.csv`` once at first use and indexes every row by the
image filename stem (``00001.xml`` -> ``00001``). Detection results are then
joined with a computed latitude / longitude by applying the same Vincenty
direct formula used by ``position.py`` (ship GPS + heading + sonar
range/azimuth -> object lat/lon).
"""

import csv
from pathlib import Path
from typing import Any, Dict, Optional

import config
from position import vincenty_direct

_geotag_cache: Dict[str, Dict[str, Any]] = {}


def _load_geotag_data() -> None:
    """Load geotag.csv into memory exactly once."""
    global _geotag_cache
    if _geotag_cache:
        return

    if not config.GEOTAG_CSV_PATH.exists():
        print(f"[Geotag] WARNING - CSV not found at {config.GEOTAG_CSV_PATH}")
        return

    with open(config.GEOTAG_CSV_PATH, newline="", encoding="utf-8-sig") as csv_file:
        for row in csv.DictReader(csv_file):
            stem = Path(row["image_name"]).stem.lower()
            _geotag_cache[stem] = row

    print(f"[Geotag] Loaded {len(_geotag_cache)} geotagged entries")


def lookup(image_filename: str) -> Optional[Dict[str, Any]]:
    """Return the CSV row matching an image filename, or None if unknown."""
    _load_geotag_data()
    stem = Path(image_filename).stem.lower()
    return _geotag_cache.get(stem)


def count_entries() -> int:
    """Return how many geotagged rows exist in the dataset."""
    _load_geotag_data()
    return len(_geotag_cache)


def calculate_position_for_image(image_filename: str) -> Dict[str, Any]:
    """
    Compute an image's real-world position from its sonar record.

    Primary path - the image exists in geotag.csv:
        vehicle GPS + heading + target range/azimuth (exactly like
        position.py) -> Vincenty's direct formula -> object lat/lon.

    Fallback path - no CSV row for this image:
        a configurable default vehicle state (config.FALLBACK_VEHICLE) is
        used instead, so detections still get an approximate position.

    The returned dict carries everything needed by the detection API and
    the JSON report (position, sonar range/azimuth, dataset folder).
    """
    row = lookup(image_filename)
    source = "geotag.csv"

    if row is not None:
        vehicle_lat = float(row["vehicle_lat"])
        vehicle_lon = float(row["vehicle_lon"])
        vehicle_heading = float(row["vehicle_heading_deg"])
        sonar_range = float(row["target_range_m"])
        sonar_azimuth = float(row["target_azimuth_deg"])
        folder = row.get("split", "uploads")
    else:
        print(f"[Geotag] No CSV entry for '{image_filename}' - using fallback vehicle state")
        source = "fallback"
        fallback = config.random_ship_location()
        fallback.update({
            "heading_deg": 0.0,
            "range_m": 0.0,
            "azimuth_deg": 0.0,
        })
        vehicle_lat = fallback["latitude"]
        vehicle_lon = fallback["longitude"]
        vehicle_heading = fallback["heading_deg"]
        sonar_range = fallback["range_m"]
        sonar_azimuth = fallback["azimuth_deg"]
        folder = "uploads"

    absolute_azimuth = vehicle_heading + sonar_azimuth
    calc_lat, calc_lon = vincenty_direct(vehicle_lat, vehicle_lon, absolute_azimuth, sonar_range)

    return {
        "source": source,
        "folder": folder,
        "latitude": round(calc_lat, 8),
        "longitude": round(calc_lon, 8),
        "absolute_azimuth_deg": round(absolute_azimuth, 4),
        "sonar_range_m": sonar_range,
        "sonar_azimuth_deg": sonar_azimuth,
    }
