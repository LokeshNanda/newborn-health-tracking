from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Sequence


@dataclass(frozen=True)
class VaccineScheduleEntry:
    vaccine_name: str
    weeks_after_birth: int

    @property
    def offset(self) -> timedelta:
        return timedelta(weeks=self.weeks_after_birth)


WHO_VACCINE_SCHEDULE: Sequence[VaccineScheduleEntry] = (
    VaccineScheduleEntry("Bacillus Calmette-Guérin (BCG)", 0),
    VaccineScheduleEntry("Hepatitis B - Birth dose", 0),
    VaccineScheduleEntry("Oral Polio Vaccine (OPV-0)", 0),
    VaccineScheduleEntry("DTwP-HepB-Hib (Pentavalent) - Dose 1", 6),
    VaccineScheduleEntry("Oral Polio Vaccine (OPV-1)", 6),
    VaccineScheduleEntry("Pneumococcal Conjugate Vaccine (PCV-1)", 6),
    VaccineScheduleEntry("Rotavirus Vaccine - Dose 1", 6),
    VaccineScheduleEntry("DTwP-HepB-Hib (Pentavalent) - Dose 2", 10),
    VaccineScheduleEntry("Oral Polio Vaccine (OPV-2)", 10),
    VaccineScheduleEntry("Pneumococcal Conjugate Vaccine (PCV-2)", 10),
    VaccineScheduleEntry("Rotavirus Vaccine - Dose 2", 10),
    VaccineScheduleEntry("DTwP-HepB-Hib (Pentavalent) - Dose 3", 14),
    VaccineScheduleEntry("Oral Polio Vaccine (OPV-3)", 14),
    VaccineScheduleEntry("Inactivated Polio Vaccine (IPV-1)", 14),
    VaccineScheduleEntry("Pneumococcal Conjugate Vaccine (PCV-3)", 14),
    VaccineScheduleEntry("Measles & Rubella (MR-1)", 39),  # ~9 months
    VaccineScheduleEntry("Japanese Encephalitis (JE-1)", 39),
    VaccineScheduleEntry("Hepatitis A - Dose 1", 52),  # ~12 months
    VaccineScheduleEntry("Measles & Rubella (MR-2)", 78),  # ~18 months
    VaccineScheduleEntry("DTwP Booster", 78),
)
