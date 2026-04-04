"""
Pydantic schemas para pacientes
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: datetime
    medical_record_number: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gestational_age_weeks: Optional[int] = None
    expected_due_date: Optional[datetime] = None
    gravidity: Optional[int] = None
    parity: Optional[int] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gestational_age_weeks: Optional[int] = None
    expected_due_date: Optional[datetime] = None
    gravidity: Optional[int] = None
    parity: Optional[int] = None
    is_active: Optional[bool] = None


class PatientResponse(PatientBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PatientDetail(PatientResponse):
    """Detalle con últimas métricas (para implementar en Parte 2)"""
    # latest_spo2: Optional[float] = None
    # latest_heart_rate: Optional[float] = None
    # ...
    pass
