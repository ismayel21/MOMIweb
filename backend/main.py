"""
MOMI Web Backend — FastAPI Application
Plataforma de monitoreo prenatal remoto
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
import logging

from database import engine, Base, get_db
from auth.routes import router as auth_router
from patients.routes import router as patients_router
from sessions.routes import router as sessions_router
from readings.routes import router as readings_router
from alerts.routes import router as alerts_router
from events.routes import router as events_router
from bp.routes import router as bp_router
from audio.routes import router as audio_router
from admin.routes import router as admin_router
from device.routes import router as device_router
from realtime.mqtt_bridge import mqtt_bridge
from realtime.websocket import manager
from auth.dependencies import get_current_doctor

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Crear tablas e iniciar MQTT bridge al iniciar
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas e iniciar MQTT
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Base de datos inicializada")

    # Migraciones para columnas nuevas en tablas existentes
    from sqlalchemy import text
    migrations = [
        ("ALTER TABLE doctors ADD COLUMN role VARCHAR(20) DEFAULT 'doctor'",  "role → doctors"),
        ("ALTER TABLE patients ADD COLUMN doctor_id INTEGER REFERENCES doctors(id)", "doctor_id → patients"),
    ]
    with engine.connect() as conn:
        for sql, label in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                logger.info(f"✓ Migración: {label}")
            except Exception:
                pass  # Columna ya existe

    # Capturar el event loop de FastAPI/uvicorn ANTES de iniciar paho
    # (paho corre en su propio hilo y necesita este loop para los broadcasts)
    import asyncio
    mqtt_bridge._loop = asyncio.get_event_loop()

    # Iniciar MQTT bridge
    mqtt_bridge.start()
    logger.info("✓ MQTT Bridge iniciado")
    
    yield
    
    # Shutdown: detener MQTT
    mqtt_bridge.stop()
    logger.info("✓ Cerrando aplicación")


# Crear app
app = FastAPI(
    title="MOMI API",
    description="Sistema de Monitoreo Materno Inteligente",
    version="2.0.0",
    lifespan=lifespan
)

# CORS — permite dev local + cualquier origen en producción
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"https://.*",   # cualquier dominio HTTPS en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas REST
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(patients_router, prefix="/api/patients", tags=["Patients"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(readings_router, prefix="/api/readings", tags=["Readings"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(events_router, prefix="/api/events", tags=["Events"])
app.include_router(bp_router, prefix="/api/bp", tags=["BloodPressure"])
app.include_router(audio_router, prefix="/api/audio", tags=["Audio"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(device_router, prefix="/api/device", tags=["Device"])


# ═══════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.websocket("/ws/live/{patient_id}")
async def websocket_patient_stream(websocket: WebSocket, patient_id: int):
    """
    WebSocket para stream en vivo de datos de una paciente.
    
    Envía actualizaciones en tiempo real de todas las lecturas de sensores.
    """
    await manager.connect_patient(websocket, patient_id)
    try:
        while True:
            # Mantener conexión abierta
            # Los datos se envían via manager.broadcast_to_patient() desde MQTT bridge
            data = await websocket.receive_text()
            
            # Manejar mensajes del cliente si es necesario
            # Por ahora solo mantener conexión viva
            
    except WebSocketDisconnect:
        manager.disconnect_patient(websocket, patient_id)
        logger.info(f"Client disconnected from patient {patient_id} stream")


@app.websocket("/ws/alerts")
async def websocket_alerts_stream(websocket: WebSocket):
    """
    WebSocket para stream global de alertas.

    Envía notificaciones de todas las alertas generadas en el sistema.
    """
    await manager.connect_alerts(websocket)
    try:
        while True:
            # Mantener conexión abierta
            # Las alertas se envían via manager.broadcast_alert() desde alerts_engine
            data = await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect_alerts(websocket)
        logger.info("Client disconnected from alerts stream")


@app.websocket("/ws/calibration")
async def websocket_calibration(websocket: WebSocket):
    """
    WebSocket para modo calibración/técnico.
    Recibe todos los datos de sensores sin requerir sesión activa.
    """
    await manager.connect_calibration(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_calibration(websocket)
        logger.info("Calibration client disconnected")


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "app": "MOMI API",
        "version": "2.0.0",
        "status": "online",
        "features": ["REST API", "WebSocket", "MQTT Bridge", "Alerts"]
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mqtt_connected": mqtt_bridge.is_connected,
        "websocket_stats": manager.get_stats()
    }


@app.get("/debug")
async def debug(db=Depends(get_db)):
    """
    Endpoint de diagnóstico — abre http://localhost:8000/debug en el browser
    para ver el estado completo del sistema.
    """
    from models import MonitoringSession, SensorReading, Patient
    from sqlalchemy import func

    active_sessions = db.query(MonitoringSession).filter(
        MonitoringSession.is_active == True
    ).all()

    # Últimas 5 lecturas
    last_readings = db.query(SensorReading).order_by(
        SensorReading.timestamp.desc()
    ).limit(5).all()

    # Contar lecturas por tipo
    counts = db.query(
        SensorReading.sensor_type, func.count(SensorReading.id)
    ).group_by(SensorReading.sensor_type).all()

    return {
        "mqtt": {
            "connected": mqtt_bridge.is_connected,
            "broker": f"{__import__('config').MQTT_BROKER}:{__import__('config').MQTT_PORT}",
            "topic": __import__('config').MQTT_TOPIC_BASE,
        },
        "active_sessions": [
            {"id": s.id, "patient_id": s.patient_id, "start": str(s.start_time)}
            for s in active_sessions
        ],
        "websocket_clients": manager.get_stats(),
        "readings_by_type": {str(k): v for k, v in counts},
        "last_5_readings": [
            {
                "id": r.id,
                "type": str(r.sensor_type),
                "timestamp": str(r.timestamp),
                "heart_rate": r.heart_rate,
                "spo2": r.spo2,
                "systolic_bp": r.systolic_bp,
                "contraction": r.contraction_intensity,
            }
            for r in last_readings
        ],
    }


# ═══════════════════════════════════════════════════════════
# SERVE FRONTEND (producción: dist/ del build de React)
# ═══════════════════════════════════════════════════════════
DIST_DIR = Path(__file__).parent.parent / "frontend" / "dist"

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Sirve index.html para cualquier ruta — permite React Router."""
        index = DIST_DIR / "index.html"
        return FileResponse(str(index))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
