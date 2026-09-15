"""Supported application roles."""

SUPPORTED_ROLES = (
    "Supervisor / Manager",
    "System Administrator",
    "Sonar Analyst",
    "Marine Debris Removal Operator",
)

DEFAULT_ROLE = "Sonar Analyst"


def is_supported_role(role: str) -> bool:
    """Return whether the supplied role is supported by the application."""
    return role in SUPPORTED_ROLES
