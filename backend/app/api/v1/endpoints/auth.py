from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from app.db.session import get_db_session
from app.models.all_models import User
from app.schemas.user import UserLogin, UserRead, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


@router.post("/google", response_model=AuthResponse)
async def google_login(
    payload: GoogleLoginRequest, session: AsyncSession = Depends(get_db_session)
) -> AuthResponse:
    google_payload = verify_google_id_token(payload.id_token)
    google_sub: str | None = google_payload.get("sub")
    email: str | None = google_payload.get("email")

    if google_sub is None or email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete Google profile"
        )

    stmt = select(User).where(User.google_sub == google_sub)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        user = User(email=email, full_name=google_payload.get("name"), google_sub=google_sub)
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegister,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    existing_stmt = select(User).where(User.email == payload.email)
    result = await session.execute(existing_stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def login_user(
    payload: UserLogin,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    stmt = select(User).where(User.email == payload.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserRead.model_validate(user))
