from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.all_models import Gender


class ChildBase(BaseModel):
    name: str
    dob: date
    gender: Gender
    blood_type: str | None = None


class ChildCreate(ChildBase):
    parent_id: str


class ChildUpdate(BaseModel):
    name: str | None = None
    dob: date | None = None
    gender: Gender | None = None
    blood_type: str | None = None


class ChildRead(ChildBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    parent_id: str
    created_at: datetime
