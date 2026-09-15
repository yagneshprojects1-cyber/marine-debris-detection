"""Pydantic schemas for role discovery and validation."""

from pydantic import BaseModel


class RoleOption(BaseModel):
    name: str
    description: str


class RoleListResponse(BaseModel):
    roles: list[RoleOption]
    default_role: str


class RoleValidationRequest(BaseModel):
    role: str


class RoleValidationResponse(BaseModel):
    role: str
    valid: bool
