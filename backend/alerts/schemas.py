"""
Pydantic schemas para alertas
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models import AlertLevel


class AlertBase(BaseModel):
    patient_id: int
    session_id: Optional[int] = None
    level: AlertLevel
    title: str
    message: str


class AlertCreate(AlertBase):
    pass


class AlertAcknowledge(BaseModel):
    acknowledged_by: str


class AlertResponse(AlertBase):
    id: int
    timestamp: datetime
    acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    
    class Config:
        from_attributes = True
