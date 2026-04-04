"""
Alerts Engine — Motor de detección de anomalías
Evalúa lecturas y genera alertas automáticamente
"""

from sqlalchemy.orm import Session
from models import SensorReading, Alert, AlertLevel, SensorType, Patient
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════
# REGLAS DE ALERTAS (Configurables)
# ═══════════════════════════════════════════════════════════

ALERT_RULES = {
    # SpO2 materno
    "spo2_critical": {
        "sensor": SensorType.SPO2,
        "field": "spo2",
        "condition": lambda val: val < 90,
        "level": AlertLevel.CRITICAL,
        "title": "SpO2 Crítico",
        "message": "Saturación de oxígeno materno por debajo de 90%"
    },
    "spo2_warning": {
        "sensor": SensorType.SPO2,
        "field": "spo2",
        "condition": lambda val: 90 <= val < 94,
        "level": AlertLevel.WARNING,
        "title": "SpO2 Bajo",
        "message": "Saturación de oxígeno materno entre 90-94%"
    },
    
    # Frecuencia cardíaca materna
    "maternal_hr_high": {
        "sensor": SensorType.SPO2,
        "field": "heart_rate",
        "condition": lambda val: val > 120,
        "level": AlertLevel.WARNING,
        "title": "FC Materna Elevada",
        "message": "Frecuencia cardíaca materna superior a 120 BPM"
    },
    "maternal_hr_low": {
        "sensor": SensorType.SPO2,
        "field": "heart_rate",
        "condition": lambda val: val < 50,
        "level": AlertLevel.WARNING,
        "title": "FC Materna Baja",
        "message": "Frecuencia cardíaca materna inferior a 50 BPM"
    },
    
    # Frecuencia cardíaca fetal
    "fetal_hr_critical_high": {
        "sensor": SensorType.FETAL_DOPPLER,
        "field": "heart_rate",
        "condition": lambda val: val > 180,
        "level": AlertLevel.CRITICAL,
        "title": "Taquicardia Fetal",
        "message": "Frecuencia cardíaca fetal superior a 180 BPM"
    },
    "fetal_hr_critical_low": {
        "sensor": SensorType.FETAL_DOPPLER,
        "field": "heart_rate",
        "condition": lambda val: val < 110,
        "level": AlertLevel.CRITICAL,
        "title": "Bradicardia Fetal",
        "message": "Frecuencia cardíaca fetal inferior a 110 BPM"
    },
    "fetal_hr_warning_high": {
        "sensor": SensorType.FETAL_DOPPLER,
        "field": "heart_rate",
        "condition": lambda val: 170 <= val <= 180,
        "level": AlertLevel.WARNING,
        "title": "FC Fetal Elevada",
        "message": "Frecuencia cardíaca fetal entre 170-180 BPM"
    },
    "fetal_hr_warning_low": {
        "sensor": SensorType.FETAL_DOPPLER,
        "field": "heart_rate",
        "condition": lambda val: 110 <= val <= 120,
        "level": AlertLevel.WARNING,
        "title": "FC Fetal Baja",
        "message": "Frecuencia cardíaca fetal entre 110-120 BPM"
    },
    
    # Presión arterial
    "bp_critical_high": {
        "sensor": SensorType.BLOOD_PRESSURE,
        "field": "systolic_bp",
        "condition": lambda val: val >= 160,
        "level": AlertLevel.CRITICAL,
        "title": "Hipertensión Severa",
        "message": "Presión sistólica ≥ 160 mmHg (posible preeclampsia)"
    },
    "bp_warning_high": {
        "sensor": SensorType.BLOOD_PRESSURE,
        "field": "systolic_bp",
        "condition": lambda val: 140 <= val < 160,
        "level": AlertLevel.WARNING,
        "title": "Presión Arterial Elevada",
        "message": "Presión sistólica entre 140-160 mmHg"
    },
    "bp_diastolic_high": {
        "sensor": SensorType.BLOOD_PRESSURE,
        "field": "diastolic_bp",
        "condition": lambda val: val >= 110,
        "level": AlertLevel.CRITICAL,
        "title": "Presión Diastólica Crítica",
        "message": "Presión diastólica ≥ 110 mmHg"
    },
    
    # Contracciones (tocodynamómetro)
    "contraction_frequent": {
        "sensor": SensorType.TOCODYNAMOMETER,
        "field": "contraction_intensity",
        "condition": lambda val: val > 80,
        "level": AlertLevel.INFO,
        "title": "Contracción Intensa",
        "message": "Contracción con intensidad > 80%"
    }
}


# ═══════════════════════════════════════════════════════════
# FUNCIONES DEL MOTOR
# ═══════════════════════════════════════════════════════════

def evaluate_reading(reading: SensorReading, db: Session) -> Optional[Alert]:
    """
    Evalúa una lectura contra las reglas y retorna una alerta si aplica.
    
    Args:
        reading: Lectura del sensor
        db: Sesión de base de datos
        
    Returns:
        Alert si se detectó anomalía, None en caso contrario
    """
    for rule_name, rule in ALERT_RULES.items():
        # Verificar si la regla aplica a este sensor
        if rule["sensor"] != reading.sensor_type:
            continue
        
        # Obtener el valor del campo correspondiente
        field_value = getattr(reading, rule["field"], None)
        if field_value is None:
            continue
        
        # Evaluar condición
        try:
            if rule["condition"](field_value):
                # Obtener información de la sesión para el patient_id
                session = reading.session
                if not session:
                    logger.warning(f"Reading {reading.id} has no session")
                    continue
                
                # Verificar si ya existe una alerta similar reciente (últimos 5 minutos)
                from datetime import timedelta
                recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
                
                existing_alert = db.query(Alert).filter(
                    Alert.patient_id == session.patient_id,
                    Alert.title == rule["title"],
                    Alert.timestamp >= recent_cutoff,
                    Alert.acknowledged == False
                ).first()
                
                if existing_alert:
                    # Ya existe alerta similar reciente, no duplicar
                    logger.debug(f"Skipping duplicate alert: {rule['title']}")
                    continue
                
                # Crear alerta
                alert = Alert(
                    patient_id=session.patient_id,
                    session_id=session.id,
                    level=rule["level"],
                    title=rule["title"],
                    message=f"{rule['message']} (valor: {field_value})"
                )
                
                db.add(alert)
                db.commit()
                db.refresh(alert)
                
                logger.info(f"Alert created: {rule['title']} for patient {session.patient_id}")
                return alert
                
        except Exception as e:
            logger.error(f"Error evaluating rule {rule_name}: {e}")
            continue
    
    return None


def check_patient_alerts(patient_id: int, db: Session) -> list[Alert]:
    """
    Revisa todas las últimas lecturas de un paciente y genera alertas.
    Útil para evaluación periódica.
    
    Args:
        patient_id: ID del paciente
        db: Sesión de base de datos
        
    Returns:
        Lista de alertas generadas
    """
    from models import MonitoringSession
    
    # Obtener sesión activa
    active_session = db.query(MonitoringSession).filter(
        MonitoringSession.patient_id == patient_id,
        MonitoringSession.is_active == True
    ).first()
    
    if not active_session:
        return []
    
    # Obtener últimas lecturas (última hora)
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=1)
    
    recent_readings = db.query(SensorReading).filter(
        SensorReading.session_id == active_session.id,
        SensorReading.timestamp >= cutoff
    ).all()
    
    alerts = []
    for reading in recent_readings:
        alert = evaluate_reading(reading, db)
        if alert:
            alerts.append(alert)
    
    return alerts
