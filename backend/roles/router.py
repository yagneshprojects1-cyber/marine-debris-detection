"""Role discovery, validation, Manager, and Removal Operator API endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from roles.constants import DEFAULT_ROLE, SUPPORTED_ROLES, is_supported_role
from roles.schemas import (
    RoleListResponse,
    RoleOption,
    RoleValidationRequest,
    RoleValidationResponse,
)
from services.manager_service import manager_service

router = APIRouter(prefix="/api/roles", tags=["Roles"])
manager_router = APIRouter(prefix="/api/manager", tags=["Manager Workspace"])
operator_router = APIRouter(prefix="/api/operator", tags=["Removal Operator Workspace"])

_ROLE_DESCRIPTIONS = {
    "Supervisor / Manager": "Review operations, activity, and team progress.",
    "System Administrator": "Manage system access, configuration, and services.",
    "Sonar Analyst": "Detect, review, and map marine debris findings.",
    "Marine Debris Removal Operator": "Coordinate removal work and follow assigned routes.",
}


@router.get("", response_model=RoleListResponse)
def list_roles():
    """Return the roles available to the application."""
    return RoleListResponse(
        roles=[
            RoleOption(name=role, description=_ROLE_DESCRIPTIONS[role])
            for role in SUPPORTED_ROLES
        ],
        default_role=DEFAULT_ROLE,
    )


@router.post("/validate", response_model=RoleValidationResponse)
def validate_role(request: RoleValidationRequest):
    """Validate a role before a client opens its workspace."""
    return RoleValidationResponse(
        role=request.role,
        valid=is_supported_role(request.role),
    )


# --- Manager Role Endpoints ---

class UpdateDetectionRequest(BaseModel):
    detection_id: str
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_operator: Optional[str] = None
    operational_notes: Optional[str] = None


@manager_router.get("/stats")
def get_manager_stats():
    """Return aggregated operational counters for Manager Dashboard stat cards."""
    return manager_service.get_stats()


@manager_router.get("/surveys")
def get_manager_surveys():
    """Return all analyst surveys with Survey IDs and detection summaries."""
    return manager_service.get_surveys()


@manager_router.get("/surveys/{survey_id}")
def get_manager_survey_detail(survey_id: str):
    """Return single survey detail by Survey ID."""
    survey = manager_service.get_survey_by_id(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail=f"Survey '{survey_id}' not found.")
    return survey


@manager_router.get("/detections")
def get_manager_detections():
    """Return all detected debris anomalies across all surveys."""
    return manager_service.get_all_detections()


@manager_router.patch("/update-detection")
def update_detection_status(payload: UpdateDetectionRequest):
    """Update priority, status, operator assignment, or notes for a detection."""
    updated = manager_service.update_detection(
        detection_id=payload.detection_id,
        status=payload.status,
        priority=payload.priority,
        assigned_operator=payload.assigned_operator,
        operational_notes=payload.operational_notes,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Detection '{payload.detection_id}' not found.")
    return {"status": "success", "detection": updated}


# --- Marine Debris Removal Operator Endpoints ---

class ConfirmRemovalRequest(BaseModel):
    task_id: str
    status: Optional[str] = "Removed"
    operator_notes: Optional[str] = None


@operator_router.get("/tasks")
def get_operator_tasks():
    """Return actionable debris removal tasks assigned to operators."""
    all_dets = manager_service.get_all_detections()
    tasks = []
    for idx, det in enumerate(all_dets):
        task_num = f"#0{idx + 24}"
        tasks.append({
            "task_id": task_num,
            "id": det["id"],
            "survey_id": det["survey_id"],
            "type": det["name"],
            "name": det["name"],
            "priority": det.get("priority") or "Normal",
            "status": det.get("status") or "Assigned",
            "assigned_operator": det.get("assigned_operator") or "Vessel Alpha Team",
            "latitude": det.get("latitude") or 18.9220,
            "longitude": det.get("longitude") or 72.8347,
            "depth": det.get("depth") or 15.0,
            "confidence": det.get("confidence") or 0.90,
            "image_id": det.get("image_id"),
            "dimensions": det.get("dimensions") or {"width": 3.0, "length": 4.5, "height": 1.5},
            "operational_notes": det.get("operational_notes") or "Perform removal sweep.",
        })
    return tasks


@operator_router.post("/confirm-removal")
def confirm_removal_task(payload: ConfirmRemovalRequest):
    """Confirm extraction/removal of assigned debris target in MongoDB database."""
    updated = manager_service.update_detection(
        detection_id=payload.task_id,
        status=payload.status or "Removed",
        operational_notes=payload.operator_notes,
    )
    return {"status": "success", "task_id": payload.task_id, "updated": updated}
