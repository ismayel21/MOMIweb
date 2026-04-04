"""
═══════════════════════════════════════════════════════════
  DEVICE ROUTES — Endpoints públicos para el Raspberry Pi
  No requieren autenticación de doctor (son del dispositivo)
═══════════════════════════════════════════════════════════
"""

import time
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Doctor, Patient

router = APIRouter()


# ═══════════════════════════════════════════════════════════
#  GET /api/device/doctors
#  Lista pública de doctores activos (para el picker del raspi)
# ═══════════════════════════════════════════════════════════

@router.get("/doctors")
def list_doctors(db: Session = Depends(get_db)):
    """Retorna los doctores activos — sin auth, para el Raspberry Pi."""
    doctors = (
        db.query(Doctor)
        .filter(Doctor.is_active == True, Doctor.role == "doctor")
        .order_by(Doctor.full_name)
        .all()
    )
    return [
        {"id": d.id, "full_name": d.full_name or d.username}
        for d in doctors
    ]


# ═══════════════════════════════════════════════════════════
#  GET /api/device/lookup?q=
#  Búsqueda de pacientes por nombre o número de expediente
# ═══════════════════════════════════════════════════════════

@router.get("/lookup")
def lookup_patients(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    """Busca pacientes por nombre o HC — sin auth, para el Raspberry Pi."""
    term = f"%{q}%"
    patients = (
        db.query(Patient)
        .filter(
            Patient.is_active == True,
            (
                Patient.first_name.like(term)
                | Patient.last_name.like(term)
                | Patient.medical_record_number.like(term)
            ),
        )
        .limit(8)
        .all()
    )
    return [
        {
            "id": p.id,
            "full_name": f"{p.first_name} {p.last_name}",
            "medical_record_number": p.medical_record_number,
            "gestational_age_weeks": p.gestational_age_weeks,
            "doctor_id": p.doctor_id,
        }
        for p in patients
    ]


# ═══════════════════════════════════════════════════════════
#  POST /api/device/self-register
#  Registro autónomo de paciente nueva desde el Raspberry Pi
# ═══════════════════════════════════════════════════════════

class SelfRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    age_years: int
    gestational_age_weeks: Optional[int] = None
    doctor_id: int


@router.post("/self-register", status_code=201)
def self_register(data: SelfRegisterRequest, db: Session = Depends(get_db)):
    """
    Crea una paciente nueva asociada al doctor elegido.
    Llamado desde el Raspberry Pi cuando la paciente no existe en el sistema.
    """
    doctor = db.query(Doctor).filter(
        Doctor.id == data.doctor_id,
        Doctor.is_active == True,
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    mrn = f"RASPI-{int(time.time())}"
    dob = datetime.now() - timedelta(days=data.age_years * 365)

    patient = Patient(
        first_name=data.first_name,
        last_name=data.last_name,
        date_of_birth=dob,
        medical_record_number=mrn,
        gestational_age_weeks=data.gestational_age_weeks,
        doctor_id=data.doctor_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    return {
        "id": patient.id,
        "full_name": f"{patient.first_name} {patient.last_name}",
        "medical_record_number": patient.medical_record_number,
        "gestational_age_weeks": patient.gestational_age_weeks,
        "doctor_id": patient.doctor_id,
    }
