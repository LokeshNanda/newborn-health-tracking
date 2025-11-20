from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.all_models import Child, GrowthLog, MedicationLog, User, VaccineRecord
from app.schemas.health import (
    GrowthLogCreate,
    GrowthLogRead,
    MedicationLogCreate,
    MedicationLogRead,
    VaccineRecordCreate,
    VaccineRecordRead,
)

router = APIRouter(prefix="/health", tags=["health"])


async def _assert_child_belongs(child_id: str, session: AsyncSession, user: User) -> None:
    stmt = select(Child.id).where(Child.id == child_id, Child.parent_id == user.id)
    result = await session.execute(stmt)
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")


@router.get("/growth", response_model=list[GrowthLogRead])
async def list_growth_logs(
    child_id: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[GrowthLog]:
    stmt = (
        select(GrowthLog)
        .join(Child, GrowthLog.child_id == Child.id)
        .where(Child.parent_id == current_user.id)
        .order_by(GrowthLog.record_date.desc())
    )
    if child_id:
        stmt = stmt.where(GrowthLog.child_id == child_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/growth", response_model=GrowthLogRead, status_code=status.HTTP_201_CREATED)
async def create_growth_log(
    payload: GrowthLogCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GrowthLog:
    await _assert_child_belongs(payload.child_id, session, current_user)
    log = GrowthLog(**payload.model_dump())
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


@router.get("/medications", response_model=list[MedicationLogRead])
async def list_medication_logs(
    child_id: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[MedicationLog]:
    stmt = (
        select(MedicationLog)
        .join(Child, MedicationLog.child_id == Child.id)
        .where(Child.parent_id == current_user.id)
        .order_by(MedicationLog.administered_at.desc())
    )
    if child_id:
        stmt = stmt.where(MedicationLog.child_id == child_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post(
    "/medications", response_model=MedicationLogRead, status_code=status.HTTP_201_CREATED
)
async def create_medication_log(
    payload: MedicationLogCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MedicationLog:
    await _assert_child_belongs(payload.child_id, session, current_user)
    log = MedicationLog(**payload.model_dump())
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


@router.get("/vaccines", response_model=list[VaccineRecordRead])
async def list_vaccine_records(
    child_id: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[VaccineRecord]:
    stmt = (
        select(VaccineRecord)
        .join(Child, VaccineRecord.child_id == Child.id)
        .where(Child.parent_id == current_user.id)
        .order_by(VaccineRecord.scheduled_date.asc())
    )
    if child_id:
        stmt = stmt.where(VaccineRecord.child_id == child_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/vaccines", response_model=VaccineRecordRead, status_code=status.HTTP_201_CREATED)
async def create_vaccine_record(
    payload: VaccineRecordCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VaccineRecord:
    await _assert_child_belongs(payload.child_id, session, current_user)
    record = VaccineRecord(**payload.model_dump())
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record
