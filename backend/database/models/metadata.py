"""Document model for the metadata collection."""

from typing import Optional

from pydantic import BaseModel


class Metadata(BaseModel):
    """Sonar/acoustic values and the image bounding-box coordinates."""

    meta_id: str
    image_id: str
    range: Optional[float] = None
    azimuth: Optional[float] = None
    elevation: Optional[float] = None
    sound_speed: Optional[float] = None
    frequency: Optional[str] = None
    xmin: Optional[float] = None
    ymin: Optional[float] = None
    xmax: Optional[float] = None
    ymax: Optional[float] = None
