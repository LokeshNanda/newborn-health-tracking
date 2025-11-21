from __future__ import annotations

from collections.abc import Iterable

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import Child, ChildMember, ChildRole, User


class ChildPermissionError(HTTPException):
    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def get_child_and_membership(
    child_id: str,
    session: AsyncSession,
    user: User,
) -> tuple[Child, ChildMember]:
    stmt = (
        select(Child, ChildMember)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(Child.id == child_id, ChildMember.user_id == user.id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    child, membership = row
    return child, membership


async def require_child_role(
    child_id: str,
    session: AsyncSession,
    user: User,
    allowed_roles: Iterable[ChildRole] | None = None,
) -> tuple[Child, ChildMember]:
    child, membership = await get_child_and_membership(child_id, session, user)
    if allowed_roles and membership.role not in allowed_roles:
        raise ChildPermissionError()
    return child, membership


async def count_primary_guardians(child_id: str, session: AsyncSession) -> int:
    stmt = select(func.count()).select_from(ChildMember).where(
        ChildMember.child_id == child_id, ChildMember.role == ChildRole.PRIMARY_GUARDIAN
    )
    result = await session.execute(stmt)
    return result.scalar_one()
