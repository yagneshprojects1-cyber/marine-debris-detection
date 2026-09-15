"""
API — System Administrator Control Plane
==========================================
Endpoints:
    GET    /api/admin/dashboard          System health, user stats, AI status, storage
    GET    /api/admin/users              List system users with optional role filtering
    POST   /api/admin/users              Create new user with assigned role and permissions
    PATCH  /api/admin/users/{user_id}    Update user status, role, or permissions
    DELETE /api/admin/users/{user_id}    Delete user account
    GET    /api/admin/model-config       Get AI model runtime configuration
    POST   /api/admin/model-config       Update AI thresholds, device, active weights
    POST   /api/admin/model-config/reload Force reload model weights into memory
    GET    /api/admin/system-config      Get system settings (storage, limits, retention)
    POST   /api/admin/system-config      Update system settings
    GET    /api/admin/health             Live hardware telemetry (CPU, RAM, Disk, DB ping)
    GET    /api/admin/logs               Audit log trail with level and search filters
    POST   /api/admin/logs/clear         Purge audit logs
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field

from services import admin_service

router = APIRouter(prefix="/api/admin", tags=["Admin Control Plane"])


# ── Pydantic Request Schemas ──────────────────────────────────────────────────

class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=150)
    role: str = Field(..., description="Role: Sonar Analyst, Supervisor / Manager, Marine Debris Removal Operator, System Administrator")
    status: str = Field(default="Active", pattern="^(Active|Inactive|Suspended)$")
    permissions: Optional[Dict[str, bool]] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None


class ModelConfigUpdateRequest(BaseModel):
    active_model: Optional[str] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.01, le=1.0)
    iou_threshold: Optional[float] = Field(None, ge=0.01, le=1.0)
    max_detections_per_image: Optional[int] = Field(None, ge=1, le=500)
    inference_device: Optional[str] = None
    auto_adaptive_filtering: Optional[bool] = None


class SystemConfigUpdateRequest(BaseModel):
    max_upload_size_mb: Optional[int] = Field(None, ge=1, le=500)
    allowed_file_types: Optional[List[str]] = None
    retention_days: Optional[int] = Field(None, ge=1, le=365)
    auto_cleanup_temp_files: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    api_rate_limit_rpm: Optional[int] = Field(None, ge=10, le=1000)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_admin_dashboard():
    """Return top-level administrative overview metrics."""
    return admin_service.get_system_dashboard()


@router.get("/users")
def get_users(role: Optional[str] = Query(None, description="Filter by role")):
    """List system users across all roles."""
    return admin_service.list_users(role_filter=role)


@router.post("/users", status_code=201)
def create_new_user(request: UserCreateRequest):
    """Create a new user account with role assignment."""
    return admin_service.create_user(request.model_dump())


@router.patch("/users/{user_id}")
def update_user_details(user_id: str, request: UserUpdateRequest):
    """Update user account status, permissions, or details."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    user = admin_service.update_user(user_id, updates)
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return user


@router.delete("/users/{user_id}")
def delete_user_account(user_id: str):
    """Remove user account from system."""
    success = admin_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return {"status": "success", "message": f"User '{user_id}' deleted successfully."}


@router.get("/model-config")
def get_model_configuration():
    """Get active AI model parameters, confidence thresholds, and hardware targets."""
    return admin_service.get_ai_model_config()


@router.post("/model-config")
def update_model_configuration(request: ModelConfigUpdateRequest):
    """Update AI model parameters dynamically."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    return admin_service.update_ai_model_config(updates)


@router.post("/model-config/reload")
def reload_model_cache():
    """Reload AI model weights and clear cache."""
    return admin_service.reload_ai_model()


@router.get("/system-config")
def get_system_configuration():
    """Get storage quotas, file constraints, retention policies, and CORS."""
    return admin_service.get_system_config()


@router.post("/system-config")
def update_system_configuration(request: SystemConfigUpdateRequest):
    """Update system settings."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    return admin_service.update_system_config(updates)


@router.get("/health")
def get_live_system_health():
    """Get real-time CPU, RAM, Disk, and Database telemetry."""
    return admin_service.get_system_health()


@router.get("/logs")
def get_system_audit_logs(
    level: Optional[str] = Query("ALL", description="Log level filter: ALL, INFO, WARNING, ERROR, AUDIT"),
    search: Optional[str] = Query(None, description="Search query string"),
):
    """Retrieve audit log events."""
    return admin_service.list_audit_logs(level=level, search=search)


@router.post("/logs/clear")
def clear_all_audit_logs():
    """Purge system audit logs."""
    return admin_service.clear_audit_logs()
