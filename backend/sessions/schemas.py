"""
Pydantic schemas para sesiones de monitoreo
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SessionBase(BaseModel):
    patient_id: int
    notes: Optional[str] = None


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SessionEnd(BaseModel):
    notes: Optional[str] = None


class SessionResponse(SessionBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_active: bool
    
    class Config:
        from_attributes = True


class SessionDetail(SessionResponse):
    """Detalle con métricas agregadas (para Parte 2)"""
    # avg_maternal_hr: Optional[float] = None
    # avg_fetal_hr: Optional[float] = None
    # num_contractions: Optional[int] = None
    # ...
    pass
