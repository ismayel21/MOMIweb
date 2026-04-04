"""
Events Router — Eventos registrados durante las sesiones (botón materno, EVA, etc.)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Event
from auth.dependencies import get_current_doctor

router = APIRouter()


class EventResponse(BaseModel):
    id: int
    session_id: int
    timestamp: str
    event_type: str
    description: Optional[str] = None
    event_data: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[EventResponse])
def list_events(
    session_id: int = Query(..., description="ID de la sesión"),
    event_type: Optional[str] = Query(None, description="Filtrar por tipo (BUTTON_PRESS, BUTTON_RELEASE)"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_doctor),
):
    query = db.query(Event).filter(Event.session_id == session_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    events = query.order_by(Event.timestamp).all()
    return [
        EventResponse(
            id=e.id,
            session_id=e.session_id,
            timestamp=e.timestamp.isoformat(),
            event_type=e.event_type,
            description=e.description,
            event_data=e.event_data,
        )
        for e in events
    ]
