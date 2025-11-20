from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class VaccineStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))

    children: Mapped[list["Child"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
    )


class Child(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "children"

    parent_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Gender] = mapped_column(Enum(Gender, native_enum=False, length=16), nullable=False)
    blood_type: Mapped[str | None] = mapped_column(String(8))

    parent: Mapped[User] = relationship(back_populates="children")
    growth_logs: Mapped[list["GrowthLog"]] = relationship(
        back_populates="child",
        cascade="all, delete-orphan",
    )
    medication_logs: Mapped[list["MedicationLog"]] = relationship(
        back_populates="child",
        cascade="all, delete-orphan",
    )
    vaccine_records: Mapped[list["VaccineRecord"]] = relationship(
        back_populates="child",
        cascade="all, delete-orphan",
    )


class GrowthLog(UUIDMixin, Base):
    __tablename__ = "growth_logs"

    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True
    )
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)

    child: Mapped[Child] = relationship(back_populates="growth_logs")


class MedicationLog(UUIDMixin, Base):
    __tablename__ = "medication_logs"

    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True
    )
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(255))
    administered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    child: Mapped[Child] = relationship(back_populates="medication_logs")


class VaccineRecord(UUIDMixin, Base):
    __tablename__ = "vaccine_records"

    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaccine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[VaccineStatus] = mapped_column(
        Enum(VaccineStatus, native_enum=False, length=16), nullable=False, default=VaccineStatus.PENDING
    )

    child: Mapped[Child] = relationship(back_populates="vaccine_records")
