"""
MQTT Bridge — Conexión con el broker de la Raspberry Pi
Escucha topics MQTT y guarda datos automáticamente en la DB
"""

import paho.mqtt.client as mqtt
import json
import logging
from datetime import datetime
from typing import Optional
import asyncio
import threading

from database import SessionLocal
from models import SensorReading, SensorType, MonitoringSession, Event
from realtime.alerts_engine import evaluate_reading
from realtime.websocket import send_reading_update, send_alert_notification, send_button_event, send_bp_status, send_calibration_update, send_button_event_calibration
from config import MQTT_BROKER, MQTT_PORT, MQTT_USER, MQTT_PASSWORD, MQTT_TOPIC_BASE

logger = logging.getLogger(__name__)


class MQTTBridge:
    """
    Puente MQTT que conecta con el broker de la Raspi.
    Escucha datos de sensores y los procesa automáticamente.
    """
    
    def __init__(self):
        self.client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id="momi_backend",
            protocol=mqtt.MQTTv311
        )
        self.client.on_connect    = self.on_connect
        self.client.on_message    = self.on_message
        self.client.on_disconnect = self.on_disconnect

        # HiveMQ Cloud — TLS + credenciales
        self.client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
        import ssl, certifi
        self.client.tls_set(ca_certs=certifi.where(), tls_version=ssl.PROTOCOL_TLS_CLIENT)

        self.is_connected = False
        # Event loop del hilo principal de FastAPI (se asigna en main.py al arrancar)
        self._loop: asyncio.AbstractEventLoop | None = None
    
    def on_connect(self, client, userdata, flags, rc):
        """Callback cuando se conecta al broker"""
        RC_MESSAGES = {
            0: "Conexión aceptada",
            1: "Versión de protocolo incorrecta",
            2: "ID de cliente rechazado",
            3: "Servidor no disponible",
            4: "Usuario/contraseña incorrectos",
            5: "No autorizado",
        }
        if rc == 0:
            logger.info(f"✓ MQTT conectado a {MQTT_BROKER}:{MQTT_PORT}")
            self.is_connected = True
            client.subscribe(MQTT_TOPIC_BASE)
            logger.info(f"✓ Suscrito a {MQTT_TOPIC_BASE}")
        else:
            msg = RC_MESSAGES.get(rc, f"código {rc}")
            logger.error(f"✗ MQTT NO conectado: {msg}. Verifica IP ({MQTT_BROKER}) y que Mosquitto acepte conexiones externas (listener 1883 0.0.0.0)")
            self.is_connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Callback cuando se desconecta del broker"""
        logger.warning(f"MQTT desconectado (rc={rc}). Reconectando automáticamente...")
        self.is_connected = False
    
    def on_message(self, client, userdata, msg):
        """
        Callback cuando llega un mensaje MQTT.
        Procesa el mensaje y guarda en DB.
        """
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.debug(f"MQTT message: {topic} → {payload[:100]}...")
            
            # Parsear el topic para extraer info
            # Formato real: momi/{patient_id}/{categoria}/{sensor}
            # Ej:           momi/ISMAEL_test/madre/spo2
            parts = topic.split('/')
            if len(parts) < 4:
                logger.warning(f"Invalid topic format: {topic}")
                return

            patient_identifier = parts[1]   # "ISMAEL_test"
            category  = parts[2]            # "madre", "fetal", "toco", "feto"
            sensor_key = f"{category}/{parts[3]}"  # "madre/spo2", "fetal/bpm", etc.

            # Parsear JSON payload
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in topic {topic}: {payload}")
                return

            # ── Botón materno — guardar en DB y broadcast ────────────────
            if sensor_key == "madre/actividad_uterina":
                # Obtener patient_id de la sesión activa actual
                _db = SessionLocal()
                try:
                    _sess = _db.query(MonitoringSession).filter(MonitoringSession.is_active == True).order_by(MonitoringSession.start_time.desc()).first()
                    patient_id = _sess.patient_id if _sess else 0
                finally:
                    _db.close()
                # El ESP32 puede enviar "evento" o "event"
                raw_event = data.get("evento") or data.get("event", "")
                event_type = (
                    "BUTTON_PRESS"   if raw_event in ("inicio", "Boton_Presionado") else
                    "BUTTON_RELEASE" if raw_event in ("fin",    "Boton_Soltado")    else
                    raw_event
                )
                self._save_button_event(patient_id, event_type)
                btn_payload = {
                    "event": "Boton_Presionado" if event_type == "BUTTON_PRESS" else "Boton_Soltado",
                    "patient_id": patient_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                self._broadcast(send_button_event(patient_id, btn_payload))
                # También al canal de calibración para TecnicoDashboard
                self._broadcast(send_button_event_calibration(btn_payload))
                return

            # ── Confirmación de volumen del módulo estómago ──────────────
            if sensor_key == "control/volume":
                # El ESP32 publica el estado actual en control/volume/state
                from audio.state import update_volume_state
                vol = data.get("volume")
                if vol is not None:
                    update_volume_state(
                        float(vol),
                        float(data.get("min", 0.0)),
                        float(data.get("max", 800.0)),
                    )
                    logger.info(f"Volume state updated: {vol}")
                return

            # ── Status tensiometro — guardar estado y broadcast ──────────
            if sensor_key == "madre/status_tensiometro":
                estado = data.get("estado", "")
                # Guardar en memoria para polling REST (no depende del WebSocket)
                from bp.state import update_status
                update_status(estado)
                logger.info(f"BP status: {estado}")
                # También broadcast WebSocket (si hay clientes conectados)
                _db2 = SessionLocal()
                try:
                    _sess2 = _db2.query(MonitoringSession).filter(MonitoringSession.is_active == True).order_by(MonitoringSession.start_time.desc()).first()
                    _bp_pid = _sess2.patient_id if _sess2 else 0
                finally:
                    _db2.close()
                self._broadcast(send_bp_status(_bp_pid, {
                    "estado": estado,
                    "timestamp": datetime.utcnow().isoformat(),
                }))
                return

            # ── Datos de sensores ────────────────────────────────────────
            self.process_sensor_data(patient_identifier, category, sensor_key, data)
            
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}", exc_info=True)
    
    def _broadcast(self, coro):
        """
        Programa una corrutina en el event loop de FastAPI desde el hilo de paho.
        paho-mqtt corre en su propio hilo: asyncio.create_task() fallaría aquí.
        Se usa run_coroutine_threadsafe para cruzar al event loop correcto.
        """
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, self._loop)
        else:
            logger.warning("Event loop no disponible, broadcast WebSocket omitido")

    def process_sensor_data(self, patient_identifier: str, category: str,
                            sensor_key: str, data: dict):
        """
        Guarda una lectura en la DB y la difunde por WebSocket.

        sensor_key = "{category}/{parts[3]}", ej: "fetal/bpm", "madre/spo2"
        """
        # ── Mapa combinado categoría/sensor → SensorType ────────────────
        # Distingue madre/bpm (FC materna) de fetal/bpm (FCF)
        SENSOR_MAP = {
            "madre/spo2":             SensorType.SPO2,
            "madre/bpm":              SensorType.SPO2,           # FC materna con SpO2
            "madre/presion_arterial": SensorType.BLOOD_PRESSURE,
            "fetal/bpm":              SensorType.FETAL_DOPPLER,
            "toco/valor":             SensorType.TOCODYNAMOMETER, # stream continuo
            "toco/contraccion":       SensorType.TOCODYNAMOMETER, # evento fin contracción
        }

        sensor_type = SENSOR_MAP.get(sensor_key)
        if not sensor_type:
            return  # topic no relevante (bpm_raw, presion_raw, status, etc.)

        # ── Extraer valores según el topic ──────────────────────────────
        heart_rate = None
        spo2 = None
        systolic_bp = None
        diastolic_bp = None
        contraction_intensity = None

        if sensor_key == "madre/spo2":
            spo2 = data.get("value")
            if not spo2 or spo2 <= 0:
                return

        elif sensor_key == "madre/bpm":
            heart_rate = data.get("value")
            if not heart_rate or heart_rate <= 0:
                return

        elif sensor_key == "madre/presion_arterial":
            systolic_bp = data.get("sistolica")
            diastolic_bp = data.get("diastolica")
            heart_rate = data.get("frecuencia_cardiaca")
            if not systolic_bp or not diastolic_bp:
                return
            # Guardar resultado completo (incluye interpretacion) para polling REST
            from bp.state import update_result, update_status
            update_result({
                "sistolica": systolic_bp,
                "diastolica": diastolic_bp,
                "media": data.get("media"),
                "frecuencia_cardiaca": heart_rate,
                "interpretacion": data.get("interpretacion", ""),
                "timestamp": datetime.utcnow().isoformat(),
            })
            update_status("medicion_completada")

        elif sensor_key == "fetal/bpm":
            heart_rate = data.get("bpm_fetal")
            if not heart_rate or heart_rate <= 0:
                return

        elif sensor_key == "toco/valor":
            contraction_intensity = data.get("value")
            if contraction_intensity is None:
                return

        elif sensor_key == "toco/contraccion":
            # Solo guardar al finalizar una contracción (evento "fin")
            if data.get("event") != "fin":
                return
            contraction_intensity = data.get("intensity")
            if contraction_intensity is None:
                return

        # ── Broadcast a canal de calibración (siempre, sin sesión) ──────────
        self._broadcast(send_calibration_update({
            "sensor_type": sensor_type.value,
            "heart_rate": heart_rate,
            "spo2": spo2,
            "systolic_bp": systolic_bp,
            "diastolic_bp": diastolic_bp,
            "contraction_intensity": contraction_intensity,
            "timestamp": datetime.utcnow().isoformat(),
        }))

        # ── Buscar cualquier sesión activa (un solo dispositivo) ────────
        db = SessionLocal()
        try:
            active_session = db.query(MonitoringSession).filter(
                MonitoringSession.is_active == True
            ).order_by(MonitoringSession.start_time.desc()).first()

            if not active_session:
                logger.debug("Sin sesión activa, dato ignorado")
                return

            patient_id = active_session.patient_id

            reading = SensorReading(
                session_id=active_session.id,
                sensor_type=sensor_type,
                timestamp=datetime.utcnow(),
                heart_rate=heart_rate,
                spo2=spo2,
                systolic_bp=systolic_bp,
                diastolic_bp=diastolic_bp,
                contraction_intensity=contraction_intensity,
                quality_score=data.get("quality", 1.0),
                raw_data=json.dumps(data),
            )
            db.add(reading)
            db.commit()
            db.refresh(reading)
            logger.info(f"✓ {sensor_type.value} guardado (sesión {active_session.id})")

            # ── Alertas ─────────────────────────────────────────────────
            alert = evaluate_reading(reading, db)
            if alert:
                logger.warning(f"⚠ Alerta: {alert.title}")
                self._broadcast(send_alert_notification({
                    "id": alert.id,
                    "patient_id": alert.patient_id,
                    "level": alert.level.value,
                    "title": alert.title,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat(),
                }))

            # ── WebSocket broadcast ──────────────────────────────────────
            broadcast_data = {
                "sensor_type": sensor_type.value,
                "heart_rate": reading.heart_rate,
                "spo2": reading.spo2,
                "systolic_bp": reading.systolic_bp,
                "diastolic_bp": reading.diastolic_bp,
                "contraction_intensity": reading.contraction_intensity,
                "timestamp": reading.timestamp.isoformat(),
            }
            # Incluir interpretación en lecturas de presión arterial
            if sensor_type.value == "BLOOD_PRESSURE":
                broadcast_data["interpretacion"] = data.get("interpretacion", "")
            self._broadcast(send_reading_update(patient_id, broadcast_data))

        except Exception as e:
            logger.error(f"Error guardando lectura: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()
    
    def _save_button_event(self, patient_id: int, event_type: str):
        """Guarda un evento de botón materno en la DB."""
        db = SessionLocal()
        try:
            active_session = db.query(MonitoringSession).filter(
                MonitoringSession.is_active == True
            ).order_by(MonitoringSession.start_time.desc()).first()
            if not active_session:
                return
            ev = Event(
                session_id=active_session.id,
                timestamp=datetime.utcnow(),
                event_type=event_type,
                description="Actividad botón materno",
            )
            db.add(ev)
            db.commit()
            logger.info(f"✓ Button event saved: {event_type}")
        except Exception as e:
            logger.error(f"Error saving button event: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()

    def publish(self, topic: str, payload: dict) -> bool:
        """Publish a command to a MQTT topic."""
        import json as _json
        if not self.is_connected:
            logger.warning(f"MQTT no conectado, no se puede publicar a {topic}")
            return False
        try:
            result = self.client.publish(topic, _json.dumps(payload))
            return result.rc == 0
        except Exception as e:
            logger.error(f"Error publicando a {topic}: {e}")
            return False

    def start(self):
        """Iniciar el bridge MQTT"""
        try:
            logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
            self.client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            self.client.loop_start()
            logger.info("✓ MQTT Bridge started")
        except Exception as e:
            logger.error(f"✗ Failed to start MQTT Bridge: {e}")
    
    def stop(self):
        """Detener el bridge MQTT"""
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("✓ MQTT Bridge stopped")


# Instancia global del bridge
mqtt_bridge = MQTTBridge()