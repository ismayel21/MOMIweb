"""
Alert routes — Gestión de alertas
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Alert, Patient, Doctor, AlertLevel
from alerts.schemas import AlertCreate, AlertResponse, AlertAcknowledge
from auth.dependencies import get_current_doctor


router = APIRouter()


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    patient_id: Optional[int] = None,
    level: Optional[AlertLevel] = None,
    acknowledged: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Listar alertas con filtros.
    
    - **patient_id**: filtrar por paciente
    - **level**: INFO, WARNING, CRITICAL
    - **acknowledged**: solo reconocidas o no reconocidas
    """
    from models import Patient as PatientModel
    query = db.query(Alert).join(PatientModel).filter(
        PatientModel.doctor_id == current_doctor.id
    )

    if patient_id:
        query = query.filter(Alert.patient_id == patient_id)
    
    if level:
        query = query.filter(Alert.level == level)
    
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    
    alerts = query.order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return alerts


@router.get("/unacknowledged", response_model=List[AlertResponse])
async def list_unacknowledged_alerts(
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Obtener todas las alertas no reconocidas.
    Útil para mostrar notificaciones.
    """
    from models import Patient as PatientModel
    alerts = db.query(Alert).join(PatientModel).filter(
        PatientModel.doctor_id == current_doctor.id,
        Alert.acknowledged == False,
    ).order_by(Alert.timestamp.desc()).all()
    return alerts


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Obtener detalle de una alerta.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return alert


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Crear alerta manual.
    
    NOTA: En producción, la mayoría de alertas se crean automáticamente
    por el motor de reglas (alerts_engine.py).
    """
    # Verificar que la paciente existe
    patient = db.query(Patient).filter(Patient.id == alert_data.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    alert = Alert(**alert_data.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    return alert


@router.put("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    ack_data: AlertAcknowledge,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Marcar alerta como reconocida.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    if alert.acknowledged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alert already acknowledged"
        )
    
    alert.acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = ack_data.acknowledged_by
    
    db.commit()
    db.refresh(alert)
    
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor)
):
    """
    Eliminar alerta.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    db.delete(alert)
    db.commit()
    
    return None
