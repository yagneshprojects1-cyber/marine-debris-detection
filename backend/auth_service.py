import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "marine-debris-secret-key-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "1440"))


def hash_password(password: str) -> str:
    """Hash a plaintext password using a PBKDF2-derived key with a random salt."""
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200000)
    return base64.urlsafe_b64encode(salt + derived).decode("utf-8")


def verify_password(password: str, stored_hash: str) -> bool:
    """Validate a password against the stored hash."""
    try:
        combined = base64.urlsafe_b64decode(stored_hash.encode("utf-8"))
        salt = combined[:16]
        expected = combined[16:]
        derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200000)
        return hmac.compare_digest(expected, derived)
    except Exception:
        return False


def create_access_token(payload: dict[str, Any]) -> str:
    """Create a signed JWT token containing the user claims required for routing."""
    token_payload = dict(payload)
    token_payload["issued_at"] = datetime.now(timezone.utc).isoformat()
    token_payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MINUTES)
    return jwt.encode(token_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
