"""
SQLAlchemy Models — Schema de MOMI
Compatible con el schema existente de la Raspi
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


# ═══════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════

class AlertLevel(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class SensorType(str, enum.Enum):
    SPO2 = "SPO2"
    BLOOD_PRESSURE = "BLOOD_PRESSURE"
    FETAL_DOPPLER = "FETAL_DOPPLER"
    TOCODYNAMOMETER = "TOCODYNAMOMETER"
    EVA = "EVA"


# ═══════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════

class Doctor(Base):
    """Doctores que pueden acceder al dashboard"""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    role = Column(String(20), server_default="doctor", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    """Pacientes bajo monitoreo"""
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    medical_record_number = Column(String(50), unique=True, index=True)
    
    # Contacto
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    
    # Info obstétrica
    gestational_age_weeks = Column(Integer)
    expected_due_date = Column(DateTime)
    gravidity = Column(Integer)  # Número de embarazos
    parity = Column(Integer)     # Número de partos
    
    # Doctor propietario
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)

    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    sessions = relationship("MonitoringSession", back_populates="patient")
    alerts = relationship("Alert", back_populates="patient")


class MonitoringSession(Base):
    """Sesiones de monitoreo continuo"""
    __tablename__ = "monitoring_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime)
    duration_minutes = Column(Integer)
    
    # Estado
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    
    # Relaciones
    patient = relationship("Patient", back_populates="sessions")
    readings = relationship("SensorReading", back_populates="session", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="session", cascade="all, delete-orphan")


class SensorReading(Base):
    """Lecturas individuales de sensores"""
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"), nullable=False)
    sensor_type = Column(Enum(SensorType), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Valores (se usa según el tipo de sensor)
    heart_rate = Column(Float)          # BPM materno o fetal
    spo2 = Column(Float)                # %
    systolic_bp = Column(Integer)       # mmHg
    diastolic_bp = Column(Integer)      # mmHg
    contraction_intensity = Column(Float)  # Tocodynamometer (0-100)
    
    # Metadata
    quality_score = Column(Float)       # 0.0 - 1.0
    raw_data = Column(Text)             # JSON opcional con datos extra
    
    # Relaciones
    session = relationship("MonitoringSession", back_populates="readings")


class Event(Base):
    """Eventos durante la sesión (botón, EVA, anotaciones)"""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    event_type = Column(String(50), nullable=False)  # "BUTTON_PRESS", "EVA_STIMULATION", "NOTE"
    description = Column(Text)
    event_data = Column(Text)  # JSON con datos extra (renombrado de 'metadata' para evitar conflicto con SQLAlchemy)
    
    # Relaciones
    session = relationship("MonitoringSession", back_populates="events")


class Alert(Base):
    """Alertas generadas por el sistema"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"))
    
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    level = Column(Enum(AlertLevel), nullable=False, index=True)
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Estado
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime)
    acknowledged_by = Column(String(100))
    
    # Relaciones
    patient = relationship("Patient", back_populates="alerts")


class ChatMessage(Base):
    """Notas y mensajes asociados a una sesión"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"), nullable=False)
    
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    author = Column(String(100), nullable=False)  # username del doctor
    message = Column(Text, nullable=False)
    is_system_message = Column(Boolean, default=False)
