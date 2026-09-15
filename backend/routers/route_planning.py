"""
API 6 — Trajectory & Route Optimization for Debris Removal
=========================================================
GET  /api/optimal-debris-route/demo   -> Optimal path for demo 9 marine debris targets
POST /api/optimal-debris-route        -> Optimal path for custom vessel + targets
"""

import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

import config
from schemas import RouteOptimizationResponse
from services import route_optimization_service

router = APIRouter(prefix="/api", tags=["6 - Route Optimization"])

DEMO_CSV_PATH = config.DATA_DIR / "debris_route_demo.csv"

DEMO_VESSEL_ORIGIN = {
    "name": "Mumbai Harbor / Port Origin",
    "latitude": 18.9220,
    "longitude": 72.8347,
}

DEMO_DEBRIS_TARGETS = [
    {"id": "d1", "name": "Ghost Net #1 (Arabian Sea)", "latitude": 18.9500, "longitude": 72.8000},
    {"id": "d2", "name": "Ship Wreck #1 (North Harbor)", "latitude": 18.9800, "longitude": 72.7500},
    {"id": "d3", "name": "Plane Wreck (Offshore West)", "latitude": 18.9100, "longitude": 72.7200},
    {"id": "d4", "name": "Plastic Debris Patch #1", "latitude": 18.8500, "longitude": 72.7800},
    {"id": "d5", "name": "Ghost Net #2 (Alibag Coastal)", "latitude": 18.8200, "longitude": 72.8500},
    {"id": "d6", "name": "Submerged Container", "latitude": 18.7500, "longitude": 72.7000},
    {"id": "d7", "name": "Ship Wreck #2 (Deep Waters)", "latitude": 18.9000, "longitude": 72.6500},
    {"id": "d8", "name": "Debris Cluster #1", "latitude": 19.0500, "longitude": 72.7000},
    {"id": "d9", "name": "Ghost Net #3 (Northwest Channel)", "latitude": 19.1000, "longitude": 72.7500},
]


class RouteRequest(BaseModel):
    origin: Optional[Dict[str, Any]] = None
    targets: Optional[List[Dict[str, Any]]] = None
    speed_knots: Optional[float] = 12.0
    fuel_rate_lph: Optional[float] = 25.0


@router.post("/parse-debris-csv")
async def parse_debris_csv(file: UploadFile = File(...)):
    """Upload a CSV file and return the list of parsed target locations."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file.")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    targets = []
    for idx, row in enumerate(reader):
        name = row.get("name") or row.get("image_name") or row.get("label") or f"Debris #{idx + 1}"
        lat_val = row.get("latitude") or row.get("lat") or row.get("vehicle_lat") or row.get("object_latitude")
        lon_val = row.get("longitude") or row.get("lon") or row.get("lng") or row.get("vehicle_lon") or row.get("object_longitude")

        if lat_val is not None and lon_val is not None:
            try:
                targets.append({
                    "id": str(row.get("id") or f"target_{idx + 1}"),
                    "name": name,
                    "latitude": float(lat_val),
                    "longitude": float(lon_val),
                    "water_body": row.get("water_body") or "",
                    "description": row.get("description") or "",
                })
            except ValueError:
                continue

    if not targets:
        raise HTTPException(status_code=400, detail="No valid coordinates found in uploaded CSV file.")

    return {"status": "success", "targets": targets}


@router.get("/download-demo-csv")
def download_demo_csv():
    """Download the demo marine debris CSV dataset file."""
    if not DEMO_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo CSV file missing on server.")
    return FileResponse(
        path=DEMO_CSV_PATH,
        media_type="text/csv",
        filename="debris_route_demo.csv",
    )


@router.get("/optimal-debris-route/demo", response_model=RouteOptimizationResponse)
def get_demo_optimal_route():
    """Return the Greedy + 2-Opt optimized route for 9 marine debris targets."""
    return route_optimization_service.solve_debris_removal_route(
        origin=DEMO_VESSEL_ORIGIN,
        targets=DEMO_DEBRIS_TARGETS,
    )


@router.post("/optimal-debris-route", response_model=RouteOptimizationResponse)
def calculate_custom_optimal_route(payload: RouteRequest):
    """Calculate the Greedy + 2-Opt optimal route for custom targets."""
    targets = payload.targets or []
    if not targets and not payload.origin:
        raise HTTPException(status_code=400, detail="At least one target location is required.")

    origin = payload.origin or (targets[0] if targets else DEMO_VESSEL_ORIGIN)
    # Exclude origin from targets if it is in targets
    filtered_targets = [t for t in targets if t.get("id") != origin.get("id")]
    if not filtered_targets and len(targets) > 1:
        filtered_targets = targets[1:]

    return route_optimization_service.solve_debris_removal_route(
        origin=origin,
        targets=filtered_targets if filtered_targets else targets,
        speed_knots=payload.speed_knots or 12.0,
        fuel_rate_lph=payload.fuel_rate_lph or 25.0,
    )


@router.post("/optimal-debris-route/upload-csv", response_model=RouteOptimizationResponse)
async def upload_csv_and_optimize_route(file: UploadFile = File(...)):
    """Upload a custom CSV file containing debris targets and optimize the route."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file.")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    targets = []
    for idx, row in enumerate(reader):
        name = row.get("name") or row.get("image_name") or row.get("label") or f"Debris #{idx + 1}"
        lat_val = row.get("latitude") or row.get("lat") or row.get("vehicle_lat") or row.get("object_latitude")
        lon_val = row.get("longitude") or row.get("lon") or row.get("lng") or row.get("vehicle_lon") or row.get("object_longitude")

        if lat_val is not None and lon_val is not None:
            try:
                targets.append({
                    "id": str(row.get("id") or f"target_{idx + 1}"),
                    "name": name,
                    "latitude": float(lat_val),
                    "longitude": float(lon_val),
                })
            except ValueError:
                continue

    if not targets:
        raise HTTPException(status_code=400, detail="No valid coordinates found in uploaded CSV file.")

    origin = targets[0]
    remaining_targets = targets[1:]

    return route_optimization_service.solve_debris_removal_route(
        origin=origin,
        targets=remaining_targets if remaining_targets else targets,
    )
