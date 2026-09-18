from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

LOCAL_USER_STORE: dict[str, dict[str, Any]] = {}

from auth_service import create_access_token, decode_access_token, hash_password, verify_password
from database.connection import get_database
from roles.constants import DEFAULT_ROLE

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

DEFAULT_AUTH_USERS = {
    "manager@gmail.com": {
        "password": "manager123",
        "role": "Supervisor / Manager",
    },
    "admin@gmail.com": {
        "password": "admin123",
        "role": "System Administrator",
    },
}


def _local_seed_default_users() -> None:
    """Seed the default manager/admin accounts in memory when MongoDB is unavailable."""
    timestamp = datetime.now(timezone.utc).isoformat()
    for username, user_data in DEFAULT_AUTH_USERS.items():
        if username not in LOCAL_USER_STORE:
            LOCAL_USER_STORE[username] = {
                "username": username,
                "password_hash": hash_password(user_data["password"]),
                "role": user_data["role"],
                "account_created_at": timestamp,
                "created_at": timestamp,
            }


def seed_default_users() -> None:
    """Create the required default management accounts if they do not already exist."""
    timestamp = datetime.now(timezone.utc).isoformat()
    try:
        users = _user_collection()
        for username, user_data in DEFAULT_AUTH_USERS.items():
            user_id = f"usr-{username.split('@', maxsplit=1)[0]}"
            users.update_one(
                {"username": username},
                {
                    "$set": {
                        "user_id": user_id,
                        "name": "System Administrator" if user_data["role"] == "System Administrator" else "Supervisor Manager",
                        "email": username,
                        "role": user_data["role"],
                        "status": "Active",
                        "last_login": "Never",
                        "permissions": {
                            "can_upload_sonar": user_data["role"] == "Supervisor / Manager",
                            "can_run_ai": True,
                            "can_manage_users": user_data["role"] == "System Administrator",
                            "can_configure_system": user_data["role"] == "System Administrator",
                            "can_export_reports": True,
                            "can_dispatch_operators": user_data["role"] == "Supervisor / Manager",
                        },
                    },
                    "$setOnInsert": {
                        "password_hash": hash_password(user_data["password"]),
                        "account_created_at": timestamp,
                        "created_at": datetime.now(timezone.utc),
                    },
                },
                upsert=True,
            )
        return
    except Exception:
        _local_seed_default_users()


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    role: str
    account_created_at: str


class AuthUser(BaseModel):
    username: str
    role: str
    account_created_at: str


def _user_collection():
    return get_database()["users"]


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    username = payload.username.strip()
    try:
        users = _user_collection()
        user = users.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password.")

        if not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid username or password.")

        role = user.get("role") or DEFAULT_ROLE
        token = create_access_token({
            "username": user["username"],
            "role": role,
            "account_created_at": user.get("account_created_at") or user.get("created_at"),
        })
        return AuthResponse(
            token=token,
            username=user["username"],
            role=role,
            account_created_at=user.get("account_created_at") or user.get("created_at"),
        )
    except HTTPException:
        raise
    except Exception:
        user = LOCAL_USER_STORE.get(username)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password.")
        if not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid username or password.")

        role = user.get("role") or DEFAULT_ROLE
        token = create_access_token({
            "username": user["username"],
            "role": role,
            "account_created_at": user.get("account_created_at") or user.get("created_at"),
        })
        return AuthResponse(
            token=token,
            username=user["username"],
            role=role,
            account_created_at=user.get("account_created_at") or user.get("created_at"),
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AuthUser:
    if credentials is None or credentials.credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:  # pragma: no cover - defensive branch
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    username = payload.get("username")
    role = payload.get("role")
    account_created_at = payload.get("account_created_at")

    if not username or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token payload is incomplete.")

    return AuthUser(username=username, role=role, account_created_at=account_created_at or "")


@router.get("/me")
def get_current_user_info(current_user: AuthUser = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "role": current_user.role,
        "account_created_at": current_user.account_created_at,
    }
