"""Add child_members table for care team roles

Revision ID: 5b4e111d5f2d
Revises: 7d2af9b6a9d5
Create Date: 2025-11-21 17:05:00.000000
"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa


revision = "5b4e111d5f2d"
down_revision = "7d2af9b6a9d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "child_members",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("child_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column(
            "role",
            sa.Enum("PRIMARY_GUARDIAN", "CAREGIVER", "PEDIATRICIAN", name="childrole", native_enum=False, length=32),
            nullable=False,
            server_default=sa.text("'CAREGIVER'"),
        ),
        sa.ForeignKeyConstraint(["child_id"], ["children.id"], name=op.f("fk_child_members_child_id_children"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_child_members_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_child_members")),
    )
    op.create_index(op.f("ix_child_members_child_id"), "child_members", ["child_id"], unique=False)
    op.create_index(op.f("ix_child_members_user_id"), "child_members", ["user_id"], unique=False)
    op.create_unique_constraint(op.f("uq_child_members_child_id"), "child_members", ["child_id", "user_id"])

    bind = op.get_bind()
    children = bind.execute(sa.text("SELECT id, parent_id FROM children")).fetchall()
    if children:
        child_members_table = sa.Table(
            "child_members",
            sa.MetaData(),
            sa.Column("id", sa.String(length=36)),
            sa.Column("child_id", sa.String(length=36)),
            sa.Column("user_id", sa.String(length=36)),
            sa.Column("role", sa.String(length=32)),
        )
        op.bulk_insert(
            child_members_table,
            [
                {
                    "id": str(uuid.uuid4()),
                    "child_id": child.id,
                    "user_id": child.parent_id,
                    "role": "PRIMARY_GUARDIAN",
                }
                for child in children
                if child.parent_id is not None
            ],
        )


def downgrade() -> None:
    op.drop_constraint(op.f("uq_child_members_child_id"), "child_members", type_="unique")
    op.drop_index(op.f("ix_child_members_user_id"), table_name="child_members")
    op.drop_index(op.f("ix_child_members_child_id"), table_name="child_members")
    op.drop_table("child_members")
