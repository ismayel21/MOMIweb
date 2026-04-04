"""
Patient routes — CRUD operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Patient, Doctor
from patients.schemas import PatientCreate, PatientUpdate, PatientResponse, PatientDetail
from auth.dependencies import get_current_doctor


router = APIRouter()


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Listar pacientes con búsqueda y paginación.
    
    - **search**: busca en nombre, apellido, y número de historia
    - **active_only**: solo pacientes activas
    """
    query = db.query(Patient).filter(Patient.doctor_id == current_doctor.id)

    if active_only:
        query = query.filter(Patient.is_active == True)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Patient.first_name.like(search_term)) |
            (Patient.last_name.like(search_term)) |
            (Patient.medical_record_number.like(search_term))
        )
    
    patients = query.offset(skip).limit(limit).all()
    return patients


@router.get("/{patient_id}", response_model=PatientDetail)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Obtener detalle de una paciente.
    """
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_doctor.id,
    ).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Crear nueva paciente.
    """
    # Verificar si el número de historia ya existe
    existing = db.query(Patient).filter(
        Patient.medical_record_number == patient_data.medical_record_number
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medical record number already exists"
        )
    
    patient = Patient(**patient_data.model_dump(), doctor_id=current_doctor.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Actualizar datos de una paciente.
    """
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_doctor.id,
    ).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Actualizar solo campos no-None
    update_data = patient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    db.commit()
    db.refresh(patient)
    
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Eliminar paciente (soft delete — marca como inactiva).
    """
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_doctor.id,
    ).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    patient.is_active = False
    db.commit()
    
    return None
