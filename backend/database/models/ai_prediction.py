"""Document model for the ai_predictions collection."""

from typing import Optional

from pydantic import BaseModel, Field


class AIPrediction(BaseModel):
    """YOLO output and the calculated geographic location."""

    predicted_id: str
    image_id: str
    meta_id: str
    object_class: Optional[str] = Field(default=None, max_length=100)
    confidence_score: Optional[float] = None
    depth: Optional[float] = None
    local_x: Optional[float] = None
    local_z: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
