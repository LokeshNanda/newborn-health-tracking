from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ValidationError

from app.core.config import settings


class TokenPayload(BaseModel):
    sub: str
    exp: int | None = None


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expires_minutes)
    )
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return TokenPayload(**payload)
    except (JWTError, ValidationError) as exc:
        raise ValueError("Invalid token") from exc


def verify_google_id_token(id_token: str) -> dict[str, Any]:
    """Validate the Google ID token and return the payload."""
    request = google_requests.Request()
    audience: Any
    if not settings.google_audience:
        audience = None
    elif len(settings.google_audience) == 1:
        audience = settings.google_audience[0]
    else:
        audience = settings.google_audience
    try:
        return google_id_token.verify_oauth2_token(id_token, request, audience=audience)
    except ValueError as exc:
        raise ValueError("Invalid Google ID token") from exc


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return pwd_context.verify(password, password_hash)
