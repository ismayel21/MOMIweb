from fastapi import APIRouter
from pydantic import BaseModel
from realtime.mqtt_bridge import mqtt_bridge
from audio.state import get_volume_state
import config

router = APIRouter()

GAIN_MIN = 0.0
GAIN_MAX = 800.0


def _topic():
    return f"momi/{config.MQTT_DEVICE_ID}/control/volume/set"


@router.post("/up")
async def volume_up():
    ok = mqtt_bridge.publish(_topic(), {"action": "up"})
    if not ok:
        return {"status": "offline", "detail": "Estación no conectada."}
    return {"status": "sent", "action": "up"}


@router.post("/down")
async def volume_down():
    ok = mqtt_bridge.publish(_topic(), {"action": "down"})
    if not ok:
        return {"status": "offline", "detail": "Estación no conectada."}
    return {"status": "sent", "action": "down"}


class VolumeSetRequest(BaseModel):
    volume: float


@router.post("/set")
async def volume_set(req: VolumeSetRequest):
    gain = max(GAIN_MIN, min(GAIN_MAX, req.volume))
    ok = mqtt_bridge.publish(_topic(), {"volume": gain})
    if not ok:
        return {"status": "offline", "detail": "Estación no conectada."}
    return {"status": "sent", "volume": gain}


@router.get("/state")
async def volume_state():
    """Estado actual del volumen (actualizado cuando el ESP32 confirma el cambio)."""
    return get_volume_state()
