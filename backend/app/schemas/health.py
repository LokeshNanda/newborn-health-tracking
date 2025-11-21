from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.all_models import VaccineStatus


class GrowthLogBase(BaseModel):
    record_date: date
    weight_kg: float
    height_cm: float


class GrowthLogCreate(GrowthLogBase):
    child_id: str


class GrowthLogUpdate(BaseModel):
    record_date: date | None = None
    weight_kg: float | None = None
    height_cm: float | None = None


class GrowthLogRead(GrowthLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    child_id: str


class MedicationLogBase(BaseModel):
    medicine_name: str
    dosage: str | None = None
    administered_at: datetime


class MedicationLogCreate(MedicationLogBase):
    child_id: str


class MedicationLogUpdate(BaseModel):
    medicine_name: str | None = None
    dosage: str | None = None
    administered_at: datetime | None = None


class MedicationLogRead(MedicationLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    child_id: str


class VaccineRecordBase(BaseModel):
    vaccine_name: str
    scheduled_date: date
    status: VaccineStatus


class VaccineRecordCreate(VaccineRecordBase):
    child_id: str


class VaccineRecordUpdate(BaseModel):
    vaccine_name: str | None = None
    scheduled_date: date | None = None
    status: VaccineStatus | None = None


class VaccineRecordRead(VaccineRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    child_id: str
