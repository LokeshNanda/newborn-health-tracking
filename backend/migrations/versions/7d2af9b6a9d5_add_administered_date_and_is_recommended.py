"""Add administered_date and is_recommended to vaccine records

Revision ID: 7d2af9b6a9d5
Revises: 699640698467
Create Date: 2025-11-21 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "7d2af9b6a9d5"
down_revision = "699640698467"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "vaccine_records",
        sa.Column("administered_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "vaccine_records",
        sa.Column(
            "is_recommended",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("vaccine_records", "is_recommended")
    op.drop_column("vaccine_records", "administered_date")
