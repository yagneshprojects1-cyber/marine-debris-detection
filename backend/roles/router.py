"""Role discovery and validation endpoints."""

from fastapi import APIRouter

from roles.constants import DEFAULT_ROLE, SUPPORTED_ROLES, is_supported_role
from roles.schemas import (
    RoleListResponse,
    RoleOption,
    RoleValidationRequest,
    RoleValidationResponse,
)

router = APIRouter(prefix="/api/roles", tags=["Roles"])

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
