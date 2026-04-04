"""
Readings routes — Consulta de lecturas de sensores
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import SensorReading, MonitoringSession, Doctor, SensorType
from readings.schemas import ReadingCreate, ReadingResponse
from auth.dependencies import get_current_doctor


router = APIRouter()


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@router.get("/", response_model=List[ReadingResponse])
async def list_readings(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    session_id: Optional[int] = None,
    sensor_type: Optional[SensorType] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Listar lecturas con filtros.
    
    - **session_id**: filtrar por sesión
    - **sensor_type**: SPO2, BLOOD_PRESSURE, FETAL_DOPPLER, etc.
    - **start_time**: desde timestamp
    - **end_time**: hasta timestamp
    """
    query = db.query(SensorReading)
    
    if session_id:
        query = query.filter(SensorReading.session_id == session_id)
    
    if sensor_type:
        query = query.filter(SensorReading.sensor_type == sensor_type)
    
    if start_time:
        query = query.filter(SensorReading.timestamp >= start_time)
    
    if end_time:
        query = query.filter(SensorReading.timestamp <= end_time)
    
    readings = query.order_by(SensorReading.timestamp).offset(skip).limit(limit).all()
    return readings


@router.get("/latest/{patient_id}", response_model=List[ReadingResponse])
async def get_latest_readings(
    patient_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Obtener las últimas lecturas de cada sensor para una paciente.
    Útil para mostrar el estado actual en el dashboard.
    """
    # Obtener la sesión activa de la paciente
    active_session = db.query(MonitoringSession).filter(
        MonitoringSession.patient_id == patient_id,
        MonitoringSession.is_active == True
    ).first()
    
    if not active_session:
        return []
    
    # Obtener última lectura de cada tipo de sensor
    latest_readings = []
    
    for sensor_type in SensorType:
        reading = db.query(SensorReading).filter(
            SensorReading.session_id == active_session.id,
            SensorReading.sensor_type == sensor_type
        ).order_by(SensorReading.timestamp.desc()).first()
        
        if reading:
            latest_readings.append(reading)
    
    return latest_readings


@router.post("/", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
async def create_reading(
    reading_data: ReadingCreate,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Crear nueva lectura.
    
    NOTA: En producción, esto vendrá del MQTT bridge (Parte 2).
    Este endpoint es útil para testing manual.
    """
    # Verificar que la sesión existe
    session = db.query(MonitoringSession).filter(
        MonitoringSession.id == reading_data.session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    reading = SensorReading(**reading_data.model_dump())
    db.add(reading)
    db.commit()
    db.refresh(reading)
    
    return reading
