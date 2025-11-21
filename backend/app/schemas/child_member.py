from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.all_models import ChildRole
from app.schemas.user import UserRead


class ChildMemberBase(BaseModel):
    role: ChildRole


class ChildMemberInvite(BaseModel):
    email: EmailStr
    role: ChildRole


class ChildMemberUpdate(BaseModel):
    role: ChildRole


class ChildMemberRead(ChildMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user: UserRead
