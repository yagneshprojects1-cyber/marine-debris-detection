"""Document model for the audit_logs collection."""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class AuditLogDocument(BaseModel):
    """System & administrative audit trail entry."""
    log_id: str = Field(..., description="Unique audit event identifier")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    level: str = Field(default="INFO", pattern="^(INFO|AUDIT|WARNING|ERROR)$")
    actor: str = Field(..., max_length=100)
    action: str = Field(..., max_length=100)
    details: str
    ip_address: Optional[str] = "127.0.0.1"
