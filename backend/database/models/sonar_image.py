"""Document model for the sonar_images collection."""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class SonarImage(BaseModel):
    """Original sonar image and preprocessing output metadata."""

    img_unique_id: str
    uploaded_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    image_format: Optional[str] = Field(default=None, max_length=20)
    image_name: str = Field(max_length=255)
    image_size: Optional[int] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    noised_image_path: Optional[str] = None
    preprocessed_image_path: Optional[str] = None
