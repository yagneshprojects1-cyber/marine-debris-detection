"""Document model for the system_config collection."""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class SystemConfigDocument(BaseModel):
    """Platform settings and operational policies entity."""
    config_id: str = Field(default="system_settings", description="Singleton configuration identifier")
    max_upload_size_mb: int = Field(default=50, ge=1, le=500)
    allowed_file_types: List[str] = Field(default_factory=lambda: [".bmp", ".png", ".jpg", ".jpeg", ".xml"])
    retention_days: int = Field(default=30, ge=1, le=365)
    auto_cleanup_temp_files: bool = True
    maintenance_mode: bool = False
    api_rate_limit_rpm: int = Field(default=120, ge=10, le=1000)
    storage_base_path: Optional[str] = None
    backup_frequency: str = "Daily at 00:00 UTC"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
