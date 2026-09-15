"""Document model for the ai_model_config collection."""

from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class AIModelInfo(BaseModel):
    """Metadata for registered model checkpoint."""
    id: str
    name: str
    format: str
    size: str
    status: str = "Ready"


class AIModelConfigDocument(BaseModel):
    """Active AI model runtime configuration entity."""
    config_id: str = Field(default="active_config", description="Singleton configuration identifier")
    active_model: str = Field(default="bestv2.pt")
    available_models: List[AIModelInfo] = Field(default_factory=list)
    confidence_threshold: float = Field(default=0.25, ge=0.01, le=1.0)
    iou_threshold: float = Field(default=0.45, ge=0.01, le=1.0)
    max_detections_per_image: int = Field(default=100, ge=1, le=500)
    inference_device: str = Field(default="CPU (Optimized)")
    available_devices: List[str] = Field(default_factory=lambda: [
        "CPU (Optimized)",
        "Apple MPS / Metal",
        "NVIDIA CUDA (Auto)",
        "ONNX Runtime Engine"
    ])
    batch_size: int = Field(default=1, ge=1, le=64)
    auto_adaptive_filtering: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = "System Administrator"
