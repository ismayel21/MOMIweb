"""
═══════════════════════════════════════════════════════════
  DEVICE ROUTES — Endpoints públicos para el Raspberry Pi
  No requieren autenticación de doctor (son del dispositivo)
═══════════════════════════════════════════════════════════
"""

import uuid
import json
import time
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Doctor, Patient, MonitoringSession, SensorReading, SensorType, Event

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


# ═══════════════════════════════════════════════════════════
#  POST /api/device/sessions
#  Crear sesión de monitoreo desde el dispositivo
# ═══════════════════════════════════════════════════════════

class DeviceSessionCreate(BaseModel):
    patient_id: int                      # ID entero del web (de lookup/self-register)
    session_uuid: Optional[str] = None   # UUID local del Raspi; si None se genera uno nuevo
    notes: Optional[str] = None


@router.post("/sessions", status_code=201)
def create_device_session(data: DeviceSessionCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva sesión de monitoreo desde el Raspberry Pi.
    Idempotente: si ya existe la session_uuid devuelve la existente.
    Responde con session_id (int) + session_uuid para que el Raspi los almacene.
    """
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {data.patient_id} not found")

    session_uuid = data.session_uuid or str(uuid.uuid4())

    # Idempotencia: no crear duplicados si el dispositivo reintenta
    existing = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if existing:
        return {
            "session_id":   existing.id,
            "session_uuid": existing.session_uuid,
            "patient_id":   existing.patient_id,
            "start_time":   existing.start_time.isoformat(),
        }

    session = MonitoringSession(
        patient_id=data.patient_id,
        session_uuid=session_uuid,
        notes=data.notes,
        start_time=datetime.utcnow(),
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id":   session.id,
        "session_uuid": session.session_uuid,
        "patient_id":   session.patient_id,
        "start_time":   session.start_time.isoformat(),
    }


# ═══════════════════════════════════════════════════════════
#  POST /api/device/sessions/{uuid}/end
# ═══════════════════════════════════════════════════════════

@router.post("/sessions/{session_uuid}/end")
def end_device_session(session_uuid: str, db: Session = Depends(get_db)):
    """Finaliza una sesión de monitoreo desde el dispositivo."""
    session = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.is_active:
        end_time = datetime.utcnow()
        session.end_time = end_time
        session.duration_minutes = int((end_time - session.start_time).total_seconds() / 60)
        session.is_active = False
        db.commit()

    return {"ok": True, "session_id": session.id, "session_uuid": session_uuid}


# ═══════════════════════════════════════════════════════════
#  POST /api/device/sessions/{uuid}/readings
#  Batch push de lecturas desde el SQLite local del Raspi
# ═══════════════════════════════════════════════════════════

# Tabla de conversión sensor Raspi → SensorType web
_SENSOR_MAP = {
    "spo2": SensorType.SPO2,
    "hr":   SensorType.SPO2,            # HR materna llega junto con SpO2
    "bp":   SensorType.BLOOD_PRESSURE,
    "fhr":  SensorType.FETAL_DOPPLER,
    "toco": SensorType.TOCODYNAMOMETER,
}


class ReadingItem(BaseModel):
    sensor: str    # "spo2" | "hr" | "bp" | "fhr" | "toco"
    data: dict     # JSON de la lectura
    timestamp: str # ISO datetime (local Raspi)


class BatchReadingsRequest(BaseModel):
    readings: List[ReadingItem]


@router.post("/sessions/{session_uuid}/readings", status_code=201)
def push_readings(
    session_uuid: str,
    body: BatchReadingsRequest,
    db: Session = Depends(get_db),
):
    """
    Batch insert de lecturas desde el Raspberry Pi al historial web.
    Llamado por mysql_sync al subir lecturas acumuladas offline.
    """
    session = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    inserted = 0
    for item in body.readings:
        sensor_type = _SENSOR_MAP.get(item.sensor)
        if sensor_type is None:
            continue  # sensor desconocido (p.ej. uterine_button) → ignorar aquí

        data = item.data
        ts = _parse_ts(item.timestamp)

        reading = SensorReading(
            session_id=session.id,
            sensor_type=sensor_type,
            timestamp=ts,
        )

        if item.sensor == "spo2":
            reading.spo2 = _f(data.get("val"))
            reading.heart_rate = _f(data.get("bpm"))
        elif item.sensor == "hr":
            reading.heart_rate = _f(data.get("bpm"))
        elif item.sensor == "bp":
            reading.systolic_bp  = _i(data.get("sys"))
            reading.diastolic_bp = _i(data.get("dia"))
            calidad = data.get("calidad", "")
            reading.quality_score = (
                1.0 if calidad == "medida" else
                0.7 if calidad == "estimada" else
                0.5
            )
        elif item.sensor == "fhr":
            reading.heart_rate = _f(data.get("bpm") or data.get("bpm_fetal"))
        elif item.sensor == "toco":
            reading.contraction_intensity = _f(data.get("intensity"))

        db.add(reading)
        inserted += 1

    db.commit()
    return {"ok": True, "inserted": inserted}


# ═══════════════════════════════════════════════════════════
#  POST /api/device/sessions/{uuid}/button
#  Percepción materna — pulsación del botón físico
# ═══════════════════════════════════════════════════════════

class ButtonEventRequest(BaseModel):
    event_type: str            # "BUTTON_PRESS" | "BUTTON_RELEASE"
    timestamp: Optional[str] = None  # ISO datetime; None → ahora
    duration_ms: Optional[int] = None  # solo para BUTTON_RELEASE


@router.post("/sessions/{session_uuid}/button", status_code=201)
async def push_button_event(
    session_uuid: str,
    body: ButtonEventRequest,
    db: Session = Depends(get_db),
):
    """
    Registra un evento de percepción materna o EVA.
    Se almacena en la tabla events y aparece como marca temporal en el CTG del historial.
    EVA_START / EVA_STOP también se transmiten por WebSocket para el dashboard en vivo.
    """
    session = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    _VALID_EVENTS = {"BUTTON_PRESS", "BUTTON_RELEASE", "EVA_START", "EVA_STOP"}
    if body.event_type not in _VALID_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=f"event_type must be one of: {', '.join(sorted(_VALID_EVENTS))}"
        )

    ts = _parse_ts(body.timestamp) if body.timestamp else datetime.utcnow()

    event = Event(
        session_id=session.id,
        event_type=body.event_type,
        timestamp=ts,
        description="Percepción materna",
        event_data=json.dumps({"duration_ms": body.duration_ms}) if body.duration_ms else None,
    )
    db.add(event)
    db.commit()

    # Retransmitir EVA por WebSocket para que el CTG en vivo muestre las marcas
    if body.event_type in ("EVA_START", "EVA_STOP"):
        from realtime.websocket import send_button_event
        await send_button_event(session.patient_id, {
            "event": body.event_type,
            "patient_id": session.patient_id,
            "timestamp": ts.isoformat(),
        })

    return {"ok": True, "event_id": event.id}


# ═══════════════════════════════════════════════════════════
#  GET /api/device/sessions/{uuid}/state
#  Raspi consulta cada ~40s para detectar fin de sesión o cambio de EVA
# ═══════════════════════════════════════════════════════════

@router.get("/sessions/{session_uuid}/state")
def get_session_state(session_uuid: str, db: Session = Depends(get_db)):
    sess = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if not sess:
        return {"active": False, "eva_enabled": False, "not_found": True}
    return {
        "active":      sess.is_active,
        "eva_enabled": bool(sess.eva_enabled),
        "not_found":   False,
    }


# ═══════════════════════════════════════════════════════════
#  PATCH /api/device/sessions/{uuid}/eva
#  La web activa/desactiva EVA — el Raspi lo recoge en el poll
# ═══════════════════════════════════════════════════════════

class EvaStateRequest(BaseModel):
    enabled: bool


@router.patch("/sessions/{session_uuid}/eva")
def set_eva_state(
    session_uuid: str,
    body: EvaStateRequest,
    db: Session = Depends(get_db),
):
    sess = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.eva_enabled = body.enabled
    db.commit()

    # Publicar directamente al nodo EVA vía MQTT
    from realtime.mqtt_bridge import mqtt_bridge
    from config import MQTT_DEVICE_ID
    topic = f"momi/{MQTT_DEVICE_ID}/feto/eva/control"
    mqtt_bridge.publish(topic, {"bloqueado": not sess.eva_enabled})

    return {"ok": True, "eva_enabled": sess.eva_enabled}


# ═══════════════════════════════════════════════════════════
#  PUT /api/device/sessions/{uuid}/eva_state
#  El Raspi reporta su estado real de bloqueo EVA — solo actualiza DB,
#  sin reenviar MQTT (para no crear loop de retroalimentación).
# ═══════════════════════════════════════════════════════════

@router.put("/sessions/{session_uuid}/eva_state")
def report_eva_state(
    session_uuid: str,
    body: EvaStateRequest,
    db: Session = Depends(get_db),
):
    sess = db.query(MonitoringSession).filter(
        MonitoringSession.session_uuid == session_uuid
    ).first()
    if not sess:
        return {"ok": False, "detail": "not found"}
    sess.eva_enabled = body.enabled
    db.commit()
    return {"ok": True, "eva_enabled": sess.eva_enabled}


# ─── Helpers internos ────────────────────────────────────────

def _f(v) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _i(v) -> Optional[int]:
    try:
        return int(round(float(v))) if v is not None else None
    except (TypeError, ValueError):
        return None


def _parse_ts(ts_str: str) -> datetime:
    """Parsea un string ISO/SQLite a datetime; fallback a utcnow."""
    if not ts_str:
        return datetime.utcnow()
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S.%f",
    ):
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            pass
    return datetime.utcnow()
