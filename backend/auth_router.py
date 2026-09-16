from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

LOCAL_USER_STORE: dict[str, dict[str, Any]] = {}

from auth_service import create_access_token, decode_access_token, hash_password, verify_password
from database.connection import get_database
from roles.constants import DEFAULT_ROLE, SUPPORTED_ROLES

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
            if users.find_one({"username": username}):
                continue

            users.insert_one({
                "username": username,
                "password_hash": hash_password(user_data["password"]),
                "role": user_data["role"],
                "account_created_at": timestamp,
                "created_at": timestamp,
            })
        return
    except Exception:
        _local_seed_default_users()


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: str = DEFAULT_ROLE


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


def _validate_role(role: str) -> str:
    if role not in SUPPORTED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported role '{role}'. Supported roles: {SUPPORTED_ROLES}",
        )
    return role


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")

    role = _validate_role(payload.role)
    try:
        users = _user_collection()
        if users.find_one({"username": username}):
            raise HTTPException(status_code=409, detail="Username already exists.")

        created_at = datetime.now(timezone.utc).isoformat()
        saved_user = {
            "username": username,
            "password_hash": hash_password(payload.password),
            "role": role,
            "account_created_at": created_at,
            "created_at": created_at,
        }
        users.insert_one(saved_user)
        return AuthResponse(token=create_access_token({
            "username": username,
            "role": role,
            "account_created_at": created_at,
        }), username=username, role=role, account_created_at=created_at)
    except HTTPException:
        raise
    except Exception:
        if username in LOCAL_USER_STORE:
            raise HTTPException(status_code=409, detail="Username already exists.")
        created_at = datetime.now(timezone.utc).isoformat()
        LOCAL_USER_STORE[username] = {
            "username": username,
            "password_hash": hash_password(payload.password),
            "role": role,
            "account_created_at": created_at,
            "created_at": created_at,
        }
        return AuthResponse(token=create_access_token({
            "username": username,
            "role": role,
            "account_created_at": created_at,
        }), username=username, role=role, account_created_at=created_at)


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
