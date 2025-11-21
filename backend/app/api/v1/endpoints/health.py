from __future__ import annotations

from datetime import date, datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.core.vaccine_schedule import WHO_VACCINE_SCHEDULE
from app.models.all_models import (
    Child,
    ChildMember,
    ChildRole,
    GrowthLog,
    MedicationLog,
    User,
    VaccineRecord,
    VaccineStatus,
)
from app.schemas.health import (
    GrowthLogCreate,
    GrowthLogRead,
    GrowthLogUpdate,
    MedicationLogCreate,
    MedicationLogRead,
    MedicationLogUpdate,
    VaccineRecordCreate,
    VaccineRecordRead,
    VaccineRecordUpdate,
)
from app.services.child_access import get_child_and_membership, require_child_role

from fpdf import FPDF

router = APIRouter(prefix="/health", tags=["health"])

EDIT_ROLES: set[ChildRole] = {ChildRole.PRIMARY_GUARDIAN, ChildRole.CAREGIVER}


def _ensure_edit_permission(member: ChildMember) -> None:
    if member.role not in EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


async def _get_growth_log(log_id: str, session: AsyncSession, user: User) -> tuple[GrowthLog, ChildMember]:
    stmt = (
        select(GrowthLog, ChildMember)
        .join(Child, GrowthLog.child_id == Child.id)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(GrowthLog.id == log_id, ChildMember.user_id == user.id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Growth log not found")
    return row


async def _get_medication_log(log_id: str, session: AsyncSession, user: User) -> tuple[MedicationLog, ChildMember]:
    stmt = (
        select(MedicationLog, ChildMember)
        .join(Child, MedicationLog.child_id == Child.id)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(MedicationLog.id == log_id, ChildMember.user_id == user.id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Medication log not found"
        )
    return row


async def _get_vaccine_record(
    record_id: str, session: AsyncSession, user: User
) -> tuple[VaccineRecord, ChildMember]:
    stmt = (
        select(VaccineRecord, ChildMember)
        .join(Child, VaccineRecord.child_id == Child.id)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(VaccineRecord.id == record_id, ChildMember.user_id == user.id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Vaccine record not found"
        )
    return row


async def _ensure_recommended_vaccines_for_child(child: Child, session: AsyncSession) -> None:
    stmt = select(VaccineRecord.vaccine_name, VaccineRecord.scheduled_date).where(
        VaccineRecord.child_id == child.id
    )
    result = await session.execute(stmt)
    existing = {(row.vaccine_name, row.scheduled_date) for row in result.all()}

    new_records: list[VaccineRecord] = []
    for entry in WHO_VACCINE_SCHEDULE:
        scheduled_date = child.dob + entry.offset
        key = (entry.vaccine_name, scheduled_date)
        if key not in existing:
            new_records.append(
                VaccineRecord(
                    child_id=child.id,
                    vaccine_name=entry.vaccine_name,
                    scheduled_date=scheduled_date,
                    status=VaccineStatus.PENDING,
                    administered_date=None,
                    is_recommended=True,
                )
            )

    if new_records:
        session.add_all(new_records)
        await session.commit()


def _sanitize_administered_date(
    status: VaccineStatus, administered_date: date | None, fallback: date | None = None
) -> date | None:
    if status == VaccineStatus.COMPLETED:
        return administered_date or fallback or date.today()
    return None


def _format_administered_at(value: datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc)
        return value.strftime("%Y-%m-%d %H:%M %Z")
    return value.strftime("%Y-%m-%d %H:%M")


def _format_date_display(value: date | None) -> str:
    if value is None:
        return "--"
    return value.strftime("%Y-%m-%d")


def _build_child_filename(name: str, suffix: str) -> str:
    slug = "".join(char if char.isalnum() else "_" for char in (name or "").lower())
    slug = "_".join(filter(None, slug.split("_")))
    base = slug or "child"
    return f"{base}_{suffix}"


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    if limit <= 3:
        return text[:limit]
    return text[: limit - 3] + "..."


def _generate_medication_log_pdf(
    child: Child,
    parent: User,
    logs: list[MedicationLog],
) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    _render_pdf_header(pdf, "Medication Summary for Physicians")
    pdf.set_y(45)
    _render_patient_summary(pdf, child, parent, logs=logs)
    pdf.ln(8)
    _render_medication_log_table(pdf, logs)

    output = pdf.output(dest="S")
    if isinstance(output, str):
        return output.encode("latin-1")
    return bytes(output)


def _render_pdf_header(pdf: FPDF, subtitle: str) -> None:
    pdf.set_fill_color(240, 245, 255)
    pdf.rect(10, 10, 190, 30, "F")

    # Minimal logo
    pdf.set_fill_color(99, 102, 241)
    pdf.ellipse(18, 16, 18, 18, "F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(18, 21)
    pdf.cell(18, 6, "NH", align="C")

    pdf.set_xy(40, 18)
    pdf.set_text_color(15, 23, 42)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 8, "Newborn Health Tracker", ln=1)
    pdf.set_x(40)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 6, subtitle, ln=1)


def _render_patient_summary(
    pdf: FPDF,
    child: Child,
    parent: User,
    logs: list[MedicationLog] | None = None,
    custom_rows: list[tuple[str, str]] | None = None,
) -> None:
    parent_label = parent.full_name or parent.email or "Parent/Guardian"
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M %Z")
    latest_log = logs[0] if logs else None

    summary_rows: list[tuple[str, str]] = [
        ("Child", child.name),
        ("Date of birth", child.dob.strftime("%Y-%m-%d")),
        ("Parent / guardian", parent_label),
        ("Report generated", generated_at),
    ]
    if logs is not None:
        summary_rows.extend(
            [
                ("Total entries", f"{len(logs)}"),
                (
                    "Last medication",
                    _format_administered_at(latest_log.administered_at) if latest_log else "No entries yet",
                ),
            ]
        )
    if custom_rows:
        summary_rows.extend(custom_rows)

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, "Patient overview", ln=1)
    pdf.ln(2)

    for label, value in summary_rows:
        _render_summary_row(pdf, label, value)


def _render_summary_row(pdf: FPDF, label: str, value: str) -> None:
    label_width = 45
    left_margin = pdf.l_margin
    right_margin = pdf.r_margin
    usable_width = pdf.w - left_margin - right_margin - label_width
    usable_width = max(usable_width, 40)

    start_y = pdf.get_y()
    pdf.set_xy(left_margin, start_y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(label_width, 7, label.upper())

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(15, 23, 42)
    pdf.set_xy(left_margin + label_width, start_y)
    pdf.multi_cell(usable_width, 7, value)


def _render_medication_log_table(pdf: FPDF, logs: list[MedicationLog]) -> None:
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, "Medication administration log", ln=1)
    pdf.ln(2)

    if not logs:
        pdf.set_font("Helvetica", "I", 11)
        pdf.set_text_color(71, 85, 105)
        pdf.multi_cell(
            0,
            8,
            "No medication entries have been recorded yet. Encourage families to record each dose for accurate clinical history.",
        )
        return

    headers = [
        ("Administered (UTC)", 48),
        ("Medication", 60),
        ("Dosage", 30),
        ("Log ID", 52),
    ]

    pdf.set_fill_color(59, 130, 246)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    for label, width in headers:
        pdf.cell(width, 8, label, border=0, align="L", fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(15, 23, 42)
    for index, log in enumerate(logs):
        is_even_row = index % 2 == 0
        if is_even_row:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.cell(headers[0][1], 8, _format_administered_at(log.administered_at), fill=True)
        pdf.cell(headers[1][1], 8, _truncate(log.medicine_name, 32), fill=True)
        pdf.cell(headers[2][1], 8, _truncate(log.dosage or "Not specified", 18), fill=True)
        pdf.set_font("Courier", "", 9)
        pdf.cell(headers[3][1], 8, log.id, fill=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        0,
        6,
        "For any adjustments to dosage or timing, please update the digital record immediately to keep the care team in sync.",
    )


def _generate_vaccine_schedule_pdf(
    child: Child,
    parent: User,
    records: list[VaccineRecord],
) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    _render_pdf_header(pdf, "Vaccine Schedule for Physicians")
    pdf.set_y(45)

    pending_count = sum(1 for record in records if record.status == VaccineStatus.PENDING)
    completed_count = sum(1 for record in records if record.status == VaccineStatus.COMPLETED)

    custom_rows = [
        ("Total scheduled doses", f"{len(records)}"),
        ("Pending doses", f"{pending_count}"),
        ("Completed doses", f"{completed_count}"),
    ]
    pdf.set_y(45)
    _render_patient_summary(pdf, child, parent, logs=None, custom_rows=custom_rows)
    pdf.ln(8)

    headers = [
        ("Vaccine", 70),
        ("Scheduled", 35),
        ("Administered", 35),
        ("Status", 30),
        ("WHO", 20),
    ]

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, "Dose overview", ln=1)
    pdf.ln(2)

    if not records:
        pdf.set_font("Helvetica", "I", 11)
        pdf.set_text_color(71, 85, 105)
        pdf.multi_cell(
            0,
            8,
            "No vaccine records are available for this child. Add at least one record to generate a report.",
        )
        output = pdf.output(dest="S")
        if isinstance(output, str):
            return output.encode("latin-1")
        return bytes(output)

    pdf.set_fill_color(59, 130, 246)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    for label, width in headers:
        pdf.cell(width, 8, label, border=0, align="L", fill=True)
    pdf.ln()

    pdf.set_text_color(15, 23, 42)
    pdf.set_font("Helvetica", "", 10)
    for index, record in enumerate(records):
        if index % 2 == 0:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)
        pdf.cell(headers[0][1], 8, _truncate(record.vaccine_name, 45), fill=True)
        pdf.cell(headers[1][1], 8, _format_date_display(record.scheduled_date), fill=True)
        pdf.cell(headers[2][1], 8, _format_date_display(record.administered_date), fill=True)
        status_label = "Completed" if record.status == VaccineStatus.COMPLETED else "Pending"
        pdf.cell(headers[3][1], 8, status_label, fill=True)
        pdf.cell(headers[4][1], 8, "Yes" if record.is_recommended else "No", fill=True)
        pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        0,
        6,
        "WHO recommended vaccines are pre-loaded for each child. Update the administered date when a dose is completed.",
    )

    output = pdf.output(dest="S")
    if isinstance(output, str):
        return output.encode("latin-1")
    return bytes(output)


@router.get("/growth", response_model=list[GrowthLogRead])
async def list_growth_logs(
    child_id: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[GrowthLog]:
    stmt = (
        select(GrowthLog)
        .join(Child, GrowthLog.child_id == Child.id)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(ChildMember.user_id == current_user.id)
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
    await require_child_role(payload.child_id, session, current_user, allowed_roles=EDIT_ROLES)
    log = GrowthLog(**payload.model_dump())
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


@router.put("/growth/{log_id}", response_model=GrowthLogRead)
async def update_growth_log(
    log_id: str,
    payload: GrowthLogUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GrowthLog:
    log, membership = await _get_growth_log(log_id, session, current_user)
    _ensure_edit_permission(membership)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    await session.commit()
    await session.refresh(log)
    return log


@router.delete("/growth/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_growth_log(
    log_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    log, membership = await _get_growth_log(log_id, session, current_user)
    _ensure_edit_permission(membership)
    await session.delete(log)
    await session.commit()


@router.get("/medications", response_model=list[MedicationLogRead])
async def list_medication_logs(
    child_id: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[MedicationLog]:
    stmt = (
        select(MedicationLog)
        .join(Child, MedicationLog.child_id == Child.id)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(ChildMember.user_id == current_user.id)
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
    await require_child_role(payload.child_id, session, current_user, allowed_roles=EDIT_ROLES)
    log = MedicationLog(**payload.model_dump())
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


@router.get("/medications/export/pdf")
async def download_medication_logs_pdf(
    child_id: str = Query(..., description="Child identifier whose medication logs will be exported"),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    child, _ = await get_child_and_membership(child_id, session, current_user)
    stmt = (
        select(MedicationLog)
        .where(MedicationLog.child_id == child.id)
        .order_by(MedicationLog.administered_at.desc())
    )
    result = await session.execute(stmt)
    logs = result.scalars().all()
    pdf_bytes = _generate_medication_log_pdf(child, current_user, logs)
    filename = f"{_build_child_filename(child.name, 'medication_logs')}.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


@router.put("/medications/{log_id}", response_model=MedicationLogRead)
async def update_medication_log(
    log_id: str,
    payload: MedicationLogUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MedicationLog:
    log, membership = await _get_medication_log(log_id, session, current_user)
    _ensure_edit_permission(membership)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    await session.commit()
    await session.refresh(log)
    return log


@router.delete("/medications/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication_log(
    log_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    log, membership = await _get_medication_log(log_id, session, current_user)
    _ensure_edit_permission(membership)
    await session.delete(log)
    await session.commit()


@router.get("/vaccines", response_model=list[VaccineRecordRead])
async def list_vaccine_records(
    child_id: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[VaccineRecord]:
    if child_id:
        child, _ = await get_child_and_membership(child_id, session, current_user)
        await _ensure_recommended_vaccines_for_child(child, session)
    else:
        children_result = await session.execute(
            select(Child)
            .join(ChildMember, ChildMember.child_id == Child.id)
            .where(ChildMember.user_id == current_user.id)
        )
        for child in children_result.scalars().all():
            await _ensure_recommended_vaccines_for_child(child, session)

    stmt = (
        select(VaccineRecord)
        .join(Child, VaccineRecord.child_id == Child.id)
        .join(ChildMember, ChildMember.child_id == Child.id)
        .where(ChildMember.user_id == current_user.id)
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
    await require_child_role(payload.child_id, session, current_user, allowed_roles=EDIT_ROLES)
    payload_data = payload.model_dump()
    sanitized_admin_date = _sanitize_administered_date(
        payload.status, payload.administered_date, fallback=payload.scheduled_date
    )
    payload_data["administered_date"] = sanitized_admin_date
    record = VaccineRecord(**payload_data, is_recommended=False)
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/vaccines/export/pdf")
async def download_vaccine_schedule_pdf(
    child_id: str = Query(..., description="Child identifier whose vaccine schedule will be exported"),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    child, _ = await get_child_and_membership(child_id, session, current_user)
    await _ensure_recommended_vaccines_for_child(child, session)
    stmt = (
        select(VaccineRecord)
        .where(VaccineRecord.child_id == child.id)
        .order_by(VaccineRecord.scheduled_date.asc())
    )
    result = await session.execute(stmt)
    records = result.scalars().all()
    pdf_bytes = _generate_vaccine_schedule_pdf(child, current_user, records)
    filename = f"{_build_child_filename(child.name, 'vaccine_schedule')}.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


@router.put("/vaccines/{record_id}", response_model=VaccineRecordRead)
async def update_vaccine_record(
    record_id: str,
    payload: VaccineRecordUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> VaccineRecord:
    record, membership = await _get_vaccine_record(record_id, session, current_user)
    _ensure_edit_permission(membership)
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates or "administered_date" in updates:
        new_status = updates.get("status", record.status)
        fallback_date = updates.get("scheduled_date", record.scheduled_date)
        desired_admin_date = updates.get("administered_date", record.administered_date)
        updates["administered_date"] = _sanitize_administered_date(
            new_status, desired_admin_date, fallback=fallback_date
        )
    for key, value in updates.items():
        setattr(record, key, value)
    await session.commit()
    await session.refresh(record)
    return record


@router.delete("/vaccines/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vaccine_record(
    record_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    record, membership = await _get_vaccine_record(record_id, session, current_user)
    _ensure_edit_permission(membership)
    await session.delete(record)
    await session.commit()
