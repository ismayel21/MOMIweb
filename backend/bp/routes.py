from fastapi import APIRouter
from realtime.mqtt_bridge import mqtt_bridge
from bp.state import get_status, get_last_result
import config

router = APIRouter()


def _topic():
    return f"momi/{config.MQTT_DEVICE_ID}/madre/control_tensiometro"


@router.post("/start")
async def start_bp():
    ok = mqtt_bridge.publish(_topic(), {"comando": "iniciar_medicion"})
    if not ok:
        return {"status": "offline", "detail": "Estación no conectada. Inicia la medición desde el dispositivo."}
    return {"status": "sent", "comando": "iniciar_medicion"}


@router.post("/stop")
async def stop_bp():
    ok = mqtt_bridge.publish(_topic(), {"comando": "detener"})
    if not ok:
        return {"status": "offline", "detail": "Estación no conectada."}
    return {"status": "sent", "comando": "detener"}


@router.post("/emergency")
async def emergency_bp():
    ok = mqtt_bridge.publish(_topic(), {"comando": "emergencia"})
    if not ok:
        return {"status": "offline", "detail": "Estación no conectada."}
    return {"status": "sent", "comando": "emergencia"}


@router.get("/status")
async def bp_status():
    """Estado actual del proceso de medición (para polling desde el frontend)."""
    return get_status()


@router.get("/last")
async def bp_last():
    """Último resultado de presión arterial disponible."""
    result = get_last_result()
    if not result:
        raise HTTPException(status_code=404, detail="Sin medición disponible")
    return result
