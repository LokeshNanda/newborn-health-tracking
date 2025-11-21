from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.all_models import Child, User
from app.schemas.child import ChildCreate, ChildRead, ChildUpdate

router = APIRouter(prefix="/children", tags=["children"])


@router.get("/", response_model=list[ChildRead])
async def list_children(
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[Child]:
    stmt = select(Child).where(Child.parent_id == current_user.id).order_by(Child.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=ChildRead, status_code=status.HTTP_201_CREATED)
async def create_child(
    payload: ChildCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Child:
    if payload.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    child = Child(**payload.model_dump())
    session.add(child)
    await session.commit()
    await session.refresh(child)
    return child


@router.get("/{child_id}", response_model=ChildRead)
async def get_child(
    child_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Child:
    stmt = select(Child).where(Child.id == child_id, Child.parent_id == current_user.id)
    result = await session.execute(stmt)
    child = result.scalar_one_or_none()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


@router.put("/{child_id}", response_model=ChildRead)
async def update_child(
    child_id: str,
    payload: ChildUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Child:
    stmt = select(Child).where(Child.id == child_id, Child.parent_id == current_user.id)
    result = await session.execute(stmt)
    child = result.scalar_one_or_none()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(child, key, value)

    await session.commit()
    await session.refresh(child)
    return child


@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child(
    child_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    stmt = delete(Child).where(Child.id == child_id, Child.parent_id == current_user.id)
    result = await session.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    await session.commit()
