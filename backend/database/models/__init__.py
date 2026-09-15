"""MongoDB document models matching the database schema."""

from .ai_prediction import AIPrediction
from .metadata import Metadata
from .sonar_image import SonarImage
from .user import UserDocument, UserPermissions
from .ai_model_config import AIModelConfigDocument, AIModelInfo
from .system_config import SystemConfigDocument
from .audit_log import AuditLogDocument

__all__ = [
    "AIPrediction",
    "Metadata",
    "SonarImage",
    "UserDocument",
    "UserPermissions",
    "AIModelConfigDocument",
    "AIModelInfo",
    "SystemConfigDocument",
    "AuditLogDocument",
]
