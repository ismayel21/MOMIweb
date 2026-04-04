"""
Session routes — Crear, listar, finalizar sesiones
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import MonitoringSession, Patient, Doctor
from sessions.schemas import SessionCreate, SessionUpdate, SessionResponse, SessionDetail, SessionEnd
from auth.dependencies import get_current_doctor


router = APIRouter()


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@router.get("/", response_model=List[SessionResponse])
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    patient_id: Optional[int] = None,
    active_only: bool = False,
    date_from: Optional[datetime] = Query(None, description="Filtrar sesiones desde esta fecha (ISO 8601)"),
    date_to: Optional[datetime] = Query(None, description="Filtrar sesiones hasta esta fecha (ISO 8601)"),
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Listar sesiones con filtros.

    - **patient_id**: filtrar por paciente
    - **active_only**: solo sesiones activas
    - **date_from**: desde fecha/hora (ISO 8601)
    - **date_to**: hasta fecha/hora (ISO 8601)
    """
    # Solo sesiones de pacientes del doctor actual
    query = db.query(MonitoringSession).join(Patient).filter(
        Patient.doctor_id == current_doctor.id
    )

    if patient_id:
        query = query.filter(MonitoringSession.patient_id == patient_id)

    if active_only:
        query = query.filter(MonitoringSession.is_active == True)

    if date_from:
        query = query.filter(MonitoringSession.start_time >= date_from)

    if date_to:
        query = query.filter(MonitoringSession.start_time <= date_to)

    sessions = query.order_by(MonitoringSession.start_time.desc()).offset(skip).limit(limit).all()
    return sessions


@router.get("/active", response_model=Optional[SessionResponse])
async def get_active_session(db: Session = Depends(get_db)):
    """
    Obtener la sesión de monitoreo activa actual.
    Retorna null si no hay sesión activa.
    """
    session = db.query(MonitoringSession).filter(
        MonitoringSession.is_active == True
    ).first()

    return session  # Retorna None si no existe


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Obtener detalle de una sesión.
    """
    session = db.query(MonitoringSession).filter(MonitoringSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return session


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Iniciar nueva sesión de monitoreo.
    """
    # Verificar que la paciente existe
    patient = db.query(Patient).filter(Patient.id == session_data.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Crear sesión
    session = MonitoringSession(
        patient_id=session_data.patient_id,
        notes=session_data.notes,
        start_time=datetime.utcnow(),
        is_active=True
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Actualizar sesión (ej: agregar notas).
    """
    session = db.query(MonitoringSession).filter(MonitoringSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    update_data = session_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    
    return session


@router.get("/{session_id}/summary")
async def get_session_summary(
    session_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """
    Resumen estadístico de una sesión: promedios de signos vitales,
    número de contracciones y análisis de pulsaciones del botón materno.
    """
    from models import SensorReading, SensorType, Event
    from sqlalchemy import func

    session = db.query(MonitoringSession).join(Patient).filter(
        MonitoringSession.id == session_id,
        Patient.doctor_id == current_doctor.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    def avg_field(sensor, field):
        row = db.query(func.avg(field)).filter(
            SensorReading.session_id == session_id,
            SensorReading.sensor_type == sensor,
            field.isnot(None),
        ).scalar()
        return round(float(row), 1) if row else None

    avg_fhr   = avg_field(SensorType.FETAL_DOPPLER,   SensorReading.heart_rate)
    avg_fcm   = avg_field(SensorType.SPO2,             SensorReading.heart_rate)
    avg_spo2  = avg_field(SensorType.SPO2,             SensorReading.spo2)
    avg_sys   = avg_field(SensorType.BLOOD_PRESSURE,   SensorReading.systolic_bp)
    avg_dia   = avg_field(SensorType.BLOOD_PRESSURE,   SensorReading.diastolic_bp)

    # Número de contracciones (eventos de fin de contracción guardados)
    contractions = db.query(func.count(SensorReading.id)).filter(
        SensorReading.session_id == session_id,
        SensorReading.sensor_type == SensorType.TOCODYNAMOMETER,
        SensorReading.contraction_intensity > 0,
    ).scalar() or 0

    # Análisis del botón materno
    events = db.query(Event).filter(
        Event.session_id == session_id,
        Event.event_type.in_(["BUTTON_PRESS", "BUTTON_RELEASE"]),
    ).order_by(Event.timestamp).all()

    btn_count = 0
    btn_durations = []
    last_press = None
    for ev in events:
        if ev.event_type == "BUTTON_PRESS":
            last_press = ev.timestamp
            btn_count += 1
        elif ev.event_type == "BUTTON_RELEASE" and last_press:
            dur_s = (ev.timestamp - last_press).total_seconds()
            btn_durations.append(dur_s)
            last_press = None

    avg_btn_duration = round(sum(btn_durations) / len(btn_durations), 1) if btn_durations else None

    return {
        "session_id":        session_id,
        "avg_fhr":           avg_fhr,
        "avg_maternal_hr":   avg_fcm,
        "avg_spo2":          avg_spo2,
        "avg_systolic_bp":   avg_sys,
        "avg_diastolic_bp":  avg_dia,
        "contraction_count": contractions,
        "button_press_count":     btn_count,
        "avg_button_duration_s":  avg_btn_duration,
    }


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: int,
    end_data: SessionEnd,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Finalizar sesión activa.
    """
    session = db.query(MonitoringSession).filter(MonitoringSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already ended"
        )
    
    # Finalizar
    end_time = datetime.utcnow()
    duration = int((end_time - session.start_time).total_seconds() / 60)
    
    session.end_time = end_time
    session.duration_minutes = duration
    session.is_active = False
    
    if end_data.notes:
        session.notes = end_data.notes
    
    db.commit()
    db.refresh(session)
    
    return session
