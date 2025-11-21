from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.all_models import Child, ChildMember, ChildRole, User
from app.schemas.child import ChildCreate, ChildRead, ChildUpdate
from app.schemas.child_member import ChildMemberInvite, ChildMemberRead, ChildMemberUpdate
from app.services.child_access import (
    count_primary_guardians,
    get_child_and_membership,
    require_child_role,
)

router = APIRouter(prefix="/children", tags=["children"])


@router.get("/", response_model=list[ChildRead])
async def list_children(
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[Child]:
    stmt = (
        select(Child)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(ChildMember.user_id == current_user.id)
        .order_by(Child.created_at.desc())
        .distinct()
    )
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
    await session.flush()

    membership = ChildMember(
        child_id=child.id,
        user_id=current_user.id,
        role=ChildRole.PRIMARY_GUARDIAN,
    )
    session.add(membership)
    await session.commit()
    await session.refresh(child)
    return child


@router.get("/{child_id}", response_model=ChildRead)
async def get_child(
    child_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Child:
    child, _ = await get_child_and_membership(child_id, session, current_user)
    return child


@router.put("/{child_id}", response_model=ChildRead)
async def update_child(
    child_id: str,
    payload: ChildUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Child:
    child, _ = await require_child_role(
        child_id, session, current_user, allowed_roles={ChildRole.PRIMARY_GUARDIAN}
    )
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
    child, _ = await require_child_role(
        child_id, session, current_user, allowed_roles={ChildRole.PRIMARY_GUARDIAN}
    )
    await session.delete(child)
    await session.commit()


@router.get("/{child_id}/members", response_model=list[ChildMemberRead])
async def list_child_members(
    child_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ChildMember]:
    child, _ = await get_child_and_membership(child_id, session, current_user)
    stmt = (
        select(ChildMember)
        .options(selectinload(ChildMember.user))
        .where(ChildMember.child_id == child.id)
        .order_by(ChildMember.role.desc(), ChildMember.created_at.asc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/{child_id}/members", response_model=ChildMemberRead, status_code=status.HTTP_201_CREATED)
async def add_child_member(
    child_id: str,
    payload: ChildMemberInvite,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChildMember:
    child, _ = await require_child_role(
        child_id, session, current_user, allowed_roles={ChildRole.PRIMARY_GUARDIAN}
    )
    stmt_user = select(User).where(User.email == payload.email.lower())
    target_user = (await session.execute(stmt_user)).scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already manage this child")

    existing_stmt = select(ChildMember).where(
        ChildMember.child_id == child.id, ChildMember.user_id == target_user.id
    )
    existing_member = (await session.execute(existing_stmt)).scalar_one_or_none()
    if existing_member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already on care team")

    member = ChildMember(
        child_id=child.id,
        user_id=target_user.id,
        role=payload.role,
    )
    session.add(member)
    await session.commit()
    refreshed = (
        await session.execute(
            select(ChildMember)
            .options(selectinload(ChildMember.user))
            .where(ChildMember.id == member.id)
        )
    ).scalar_one()
    return refreshed


@router.patch("/{child_id}/members/{member_id}", response_model=ChildMemberRead)
async def update_child_member(
    child_id: str,
    member_id: str,
    payload: ChildMemberUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChildMember:
    child, _ = await require_child_role(
        child_id, session, current_user, allowed_roles={ChildRole.PRIMARY_GUARDIAN}
    )
    member = await session.get(
        ChildMember, member_id, options=(selectinload(ChildMember.user),)
    )
    if member is None or member.child_id != child.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == ChildRole.PRIMARY_GUARDIAN and payload.role != ChildRole.PRIMARY_GUARDIAN:
        total_primaries = await count_primary_guardians(child.id, session)
        if total_primaries <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the last guardian")

    member.role = payload.role
    await session.commit()
    await session.refresh(member)
    return member


@router.delete("/{child_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_child_member(
    child_id: str,
    member_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    child, _ = await require_child_role(
        child_id, session, current_user, allowed_roles={ChildRole.PRIMARY_GUARDIAN}
    )
    member = await session.get(ChildMember, member_id)
    if member is None or member.child_id != child.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == ChildRole.PRIMARY_GUARDIAN:
        total_primaries = await count_primary_guardians(child.id, session)
        if total_primaries <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the last guardian")

    await session.delete(member)
    await session.commit()
