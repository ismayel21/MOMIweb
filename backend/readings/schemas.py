"""
Pydantic schemas para lecturas de sensores
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models import SensorType


class ReadingBase(BaseModel):
    session_id: int
    sensor_type: SensorType
    timestamp: datetime
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    contraction_intensity: Optional[float] = None
    quality_score: Optional[float] = None
    raw_data: Optional[str] = None


class ReadingCreate(ReadingBase):
    pass


class ReadingResponse(ReadingBase):
    id: int
    
    class Config:
        from_attributes = True
