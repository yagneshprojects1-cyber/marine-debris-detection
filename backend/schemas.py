"""
Pydantic models describing every API request/response.

These schemas double as live documentation on /docs and guarantee that the
JSON sent to the frontend always has a stable, predictable shape.
"""

from typing import List, Optional

from pydantic import BaseModel


# ── Detection building blocks ─────────────────────────────────────────────────
class BoundingBox(BaseModel):
    """Pixel coordinates of one detected object (top-left / bottom-right)."""

    xmin: int
    ymin: int
    xmax: int
    ymax: int


class DetectedObject(BaseModel):
    """One YOLO detection joined with its geographic position."""

    name: str
    confidence: Optional[float] = None
    bndbox: BoundingBox
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sonar_range: float
    sonar_azimuth: float
    sonar_elevation: float
    sonar_soundspeed: Optional[float] = None
    sonar_frequency: Optional[str] = None
    depth: float
    local_x: float
    local_z: float


# ── API 1: Preprocessing ──────────────────────────────────────────────────────
class PreprocessResponse(BaseModel):
    status: str
    message: str
    image_id: str
    original_filename: str
    preprocessed_image_url: str


# ── API 2: AI detection ───────────────────────────────────────────────────────
class DetectionResponse(BaseModel):
    status: str
    message: str
    image_id: str
    objects_detected: List[DetectedObject]
    ship_latitude: Optional[float] = None
    ship_longitude: Optional[float] = None
    ship_water_body: Optional[str] = None
    annotated_image_url: Optional[str] = None


# ── API 3: Report (mirrors the classic XML annotation format) ─────────────────
class SonarInfo(BaseModel):
    range: Optional[float] = None
    azimuth: Optional[float] = None
    elevation: Optional[float] = None
    soundspeed: Optional[float] = None
    frequency: Optional[str] = None


class FileInfo(BaseModel):
    folder: str
    filename: str


class ImageSize(BaseModel):
    width: int
    height: int
    channel: int


class ReportObject(BaseModel):
    name: str
    confidence: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    bndbox: BoundingBox


class DetectionReport(BaseModel):
    sonar: SonarInfo
    file: FileInfo
    size: ImageSize
    object: List[ReportObject]


# ── Route Optimization Schemas ───────────────────────────────────────────────
class RouteWaypoint(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    is_origin: bool = False
    step_number: int


class RouteOptimizationResponse(BaseModel):
    status: str
    message: str
    algorithm: str
    total_waypoints: int
    total_distance_km: float
    total_distance_nautical_miles: float
    estimated_time_hours: float
    estimated_fuel_liters: float
    waypoints: List[RouteWaypoint]
