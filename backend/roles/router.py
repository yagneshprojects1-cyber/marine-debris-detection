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


class ApprovalRequest(BaseModel):
    detection_id: str
    priority: Optional[str] = None
    operational_notes: Optional[str] = None


class AllocationRequest(BaseModel):
    group_id: str
    detection_ids: List[str]
    operators: List[str]


class GroupOperatorsRequest(BaseModel):
    operators: List[str]


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


@manager_router.get("/verified-debris")
def get_verified_debris():
    """Return validated debris directly from ai_predictions."""
    return manager_service.get_verified_debris()


@manager_router.get("/detections")
def get_manager_detections():
    """Return all detected debris anomalies across all surveys."""
    return manager_service.get_all_detections()


@manager_router.get("/operators")
def get_removal_operators():
    """Return active removal operators for allocation."""
    return manager_service.get_removal_operators()


@manager_router.get("/approval-groups")
def get_approval_groups():
    """Return approved debris grouped by nearest coordinates, max 10 per group."""
    return manager_service.get_approval_groups()


@manager_router.get("/validated-groups")
def get_validated_groups():
    """Return validated debris groups for manager review before approval."""
    return manager_service.get_validated_groups()


@manager_router.get("/removal-groups/history")
def get_removal_group_history():
    """Return all persisted removal groups, including allocated operator names."""
    return manager_service.get_removal_group_history()


@manager_router.post("/approve")
def approve_detection(payload: ApprovalRequest):
    """Approve one validated debris prediction for removal planning."""
    updated = manager_service.update_detection(
        detection_id=payload.detection_id,
        status="Approved",
        priority=payload.priority,
        operational_notes=payload.operational_notes,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Validated detection '{payload.detection_id}' not found.")
    return {"status": "success", "detection": updated}


@manager_router.post("/allocate")
def allocate_detections(payload: AllocationRequest):
    """Allocate approved debris to one or more removal operators."""
    updated = manager_service.allocate_removal(payload.detection_ids, payload.operators, payload.group_id)
    if not updated:
        raise HTTPException(status_code=409, detail="No approved detections were allocated.")
    return {"status": "success", "detections": updated}


@manager_router.patch("/removal-groups/{group_id}/operators")
def update_group_operators(group_id: str, payload: GroupOperatorsRequest):
    """Edit operators assigned to an existing removal group."""
    updated = manager_service.update_group_operators(group_id, payload.operators)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Removal group '{group_id}' not found.")
    return {"status": "success", "group": updated}


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
def get_operator_tasks(username: Optional[str] = None):
    """Return persisted allocated removal groups and their debris tasks."""
    groups = manager_service.get_operator_groups(username)
    tasks = []
    for group in groups:
        for index, det in enumerate(group["detections"]):
            tasks.append({
                "task_id": f"{group['group_id']}-TASK-{index + 1:02d}",
                "group_id": group["group_id"],
                "id": det["id"],
                "survey_id": det["survey_id"],
                "type": det["name"],
                "name": det["name"],
                "priority": det.get("priority") or "Normal",
                "status": det.get("status"),
                "assigned_operator": group.get("operators", []),
                "latitude": det.get("latitude") or 18.9220,
                "longitude": det.get("longitude") or 72.8347,
                "depth": det.get("depth") or 15.0,
                "confidence": det.get("confidence") or 0.90,
                "image_id": det.get("image_id"),
                "dimensions": det.get("dimensions"),
                "operational_notes": det.get("operational_notes") or "Perform standard retrieval procedure.",
            })
    return tasks


@operator_router.get("/history")
def get_operator_history(username: str):
    """Return only removal groups allocated to the logged-in operator."""
    return manager_service.get_operator_group_history(username)


@operator_router.post("/confirm-removal")
def confirm_removal_task(payload: ConfirmRemovalRequest):
    """Confirm extraction/removal of assigned debris target in MongoDB database."""
    updated = manager_service.mark_removed(payload.task_id, payload.operator_notes)
    return {"status": "success", "task_id": payload.task_id, "updated": updated}
