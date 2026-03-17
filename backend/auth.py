"""Authentication and authorization — JWT-based with role-based access control."""
import datetime
import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel

# JWT config
JWT_SECRET = os.getenv("JWT_SECRET", "sky-sentinel-demo-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token extractor
security = HTTPBearer(auto_error=False)


# --- Models ---

class UserRole:
    ADMIN = "admin"
    INVESTIGATOR = "investigator"
    VIEWER = "viewer"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserInfo(BaseModel):
    username: str
    role: str
    display_name: str


# --- Demo Users (pre-seeded) ---

DEMO_USERS = {
    "admin": {
        "password_hash": pwd_context.hash("admin123"),
        "role": UserRole.ADMIN,
        "display_name": "Admin User",
    },
    "investigator": {
        "password_hash": pwd_context.hash("invest123"),
        "role": UserRole.INVESTIGATOR,
        "display_name": "Jane Investigator",
    },
    "viewer": {
        "password_hash": pwd_context.hash("viewer123"),
        "role": UserRole.VIEWER,
        "display_name": "Read-Only Viewer",
    },
}


# --- Auth Functions ---

def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Verify username/password and return user info."""
    user = DEMO_USERS.get(username.lower())
    if not user:
        return None
    if not pwd_context.verify(password, user["password_hash"]):
        return None
    return {
        "username": username.lower(),
        "role": user["role"],
        "display_name": user["display_name"],
    }


def create_token(user_info: dict) -> str:
    """Create a JWT token for the authenticated user."""
    payload = {
        "sub": user_info["username"],
        "role": user_info["role"],
        "display_name": user_info["display_name"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- FastAPI Dependencies ---

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Extract and validate the current user from the JWT token."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    return {
        "username": payload["sub"],
        "role": payload["role"],
        "display_name": payload.get("display_name", payload["sub"]),
    }


def require_role(*allowed_roles: str):
    """Factory for role-based access control dependency."""
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required: {', '.join(allowed_roles)}",
            )
        return user
    return role_checker
