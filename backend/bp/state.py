"""
Estado en memoria del tensiómetro.
Permite que el frontend consulte el estado actual sin depender del WebSocket.
"""
from datetime import datetime
from typing import Optional

_status = {
    "estado": "idle",
    "timestamp": "",
}

_last_result: Optional[dict] = None


def update_status(estado: str):
    _status["estado"] = estado
    _status["timestamp"] = datetime.utcnow().isoformat()


def get_status() -> dict:
    return dict(_status)


def update_result(result: dict):
    global _last_result
    _last_result = result


def get_last_result() -> Optional[dict]:
    return _last_result
