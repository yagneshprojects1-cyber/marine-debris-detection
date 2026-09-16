"""Document model for the users collection."""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class UserPermissions(BaseModel):
    """Granular access control flags."""
    can_upload_sonar: bool = False
    can_run_ai: bool = False
    can_manage_users: bool = False
    can_configure_system: bool = False
    can_export_reports: bool = True
    can_dispatch_operators: bool = False


class UserDocument(BaseModel):
    """User account entity in the MongoDB users collection."""
    user_id: str = Field(..., description="Unique user identifier")
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=150)
    role: str = Field(..., description="Role: Sonar Analyst, Supervisor / Manager, Marine Debris Removal Operator, System Administrator")
    status: str = Field(default="Active", pattern="^(Active|Inactive|Suspended)$")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[str] = Field(default="Never")
    permissions: UserPermissions = Field(default_factory=UserPermissions)
