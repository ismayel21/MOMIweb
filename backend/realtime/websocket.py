"""
WebSocket Manager — Streaming de datos en tiempo real
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestor de conexiones WebSocket.
    Mantiene track de clientes conectados y broadcast de mensajes.
    """
    
    def __init__(self):
        # Conexiones por patient_id: {patient_id: [websocket1, websocket2, ...]}
        self.patient_connections: Dict[int, Set[WebSocket]] = {}

        # Conexiones globales para alertas
        self.alert_connections: Set[WebSocket] = set()

        # Conexiones para canal de calibración
        self.calibration_connections: Set[WebSocket] = set()
    
    async def connect_patient(self, websocket: WebSocket, patient_id: int):
        """Conectar un cliente al stream de una paciente"""
        await websocket.accept()
        
        if patient_id not in self.patient_connections:
            self.patient_connections[patient_id] = set()
        
        self.patient_connections[patient_id].add(websocket)
        logger.info(f"Client connected to patient {patient_id} stream. Total: {len(self.patient_connections[patient_id])}")
    
    def disconnect_patient(self, websocket: WebSocket, patient_id: int):
        """Desconectar cliente del stream de una paciente"""
        if patient_id in self.patient_connections:
            self.patient_connections[patient_id].discard(websocket)
            logger.info(f"Client disconnected from patient {patient_id} stream. Remaining: {len(self.patient_connections[patient_id])}")
            
            # Limpiar set vacío
            if not self.patient_connections[patient_id]:
                del self.patient_connections[patient_id]
    
    async def connect_alerts(self, websocket: WebSocket):
        """Conectar un cliente al stream de alertas globales"""
        await websocket.accept()
        self.alert_connections.add(websocket)
        logger.info(f"Client connected to alerts stream. Total: {len(self.alert_connections)}")
    
    def disconnect_alerts(self, websocket: WebSocket):
        """Desconectar cliente del stream de alertas"""
        self.alert_connections.discard(websocket)
        logger.info(f"Client disconnected from alerts stream. Remaining: {len(self.alert_connections)}")

    async def connect_calibration(self, websocket: WebSocket):
        """Conectar un cliente al canal de calibración"""
        await websocket.accept()
        self.calibration_connections.add(websocket)
        logger.info(f"Calibration client connected. Total: {len(self.calibration_connections)}")

    def disconnect_calibration(self, websocket: WebSocket):
        """Desconectar cliente del canal de calibración"""
        self.calibration_connections.discard(websocket)

    async def broadcast_calibration(self, message: dict):
        """Enviar mensaje a todos los clientes del canal de calibración"""
        if not self.calibration_connections:
            return
        message_json = json.dumps(message, default=str)
        dead = set()
        for ws in self.calibration_connections:
            try:
                await ws.send_text(message_json)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect_calibration(ws)
    
    async def broadcast_to_patient(self, patient_id: int, message: dict):
        """
        Enviar mensaje a todos los clientes conectados a una paciente.
        
        Args:
            patient_id: ID de la paciente
            message: Diccionario con datos a enviar
        """
        if patient_id not in self.patient_connections:
            return
        
        # Serializar mensaje
        message_json = json.dumps(message, default=str)
        
        # Enviar a todos los clientes conectados
        dead_connections = set()
        for websocket in self.patient_connections[patient_id]:
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending to patient {patient_id} client: {e}")
                dead_connections.add(websocket)
        
        # Limpiar conexiones muertas
        for websocket in dead_connections:
            self.disconnect_patient(websocket, patient_id)
    
    async def broadcast_alert(self, alert_data: dict):
        """
        Enviar alerta a todos los clientes conectados al stream de alertas.
        
        Args:
            alert_data: Diccionario con datos de la alerta
        """
        if not self.alert_connections:
            return
        
        # Serializar mensaje
        message_json = json.dumps(alert_data, default=str)
        
        # Enviar a todos los clientes
        dead_connections = set()
        for websocket in self.alert_connections:
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending alert: {e}")
                dead_connections.add(websocket)
        
        # Limpiar conexiones muertas
        for websocket in dead_connections:
            self.disconnect_alerts(websocket)
    
    def get_stats(self) -> dict:
        """Retornar estadísticas de conexiones activas"""
        return {
            "patient_streams": {
                patient_id: len(connections)
                for patient_id, connections in self.patient_connections.items()
            },
            "alert_connections": len(self.alert_connections),
            "calibration_connections": len(self.calibration_connections),
            "total_connections": sum(len(c) for c in self.patient_connections.values()) + len(self.alert_connections) + len(self.calibration_connections)
        }


# Instancia global del manager
manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════
# FUNCIONES HELPER
# ═══════════════════════════════════════════════════════════

async def send_reading_update(patient_id: int, reading_data: dict):
    """
    Helper para enviar actualización de lectura.
    Llamar desde MQTT bridge cuando lleguen nuevos datos.
    """
    message = {
        "type": "reading",
        "timestamp": datetime.utcnow().isoformat(),
        "data": reading_data
    }
    await manager.broadcast_to_patient(patient_id, message)


async def send_button_event(patient_id: int, event_data: dict):
    """
    Helper para enviar evento de botón materno.
    Llamar desde MQTT bridge cuando llegue actividad_uterina.
    """
    message = {
        "type": "button_event",
        "timestamp": datetime.utcnow().isoformat(),
        "data": event_data
    }
    await manager.broadcast_to_patient(patient_id, message)


async def send_alert_notification(alert_data: dict):
    """
    Helper para enviar notificación de alerta.
    Llamar desde alerts_engine cuando se genere una alerta.
    """
    message = {
        "type": "alert",
        "timestamp": datetime.utcnow().isoformat(),
        "data": alert_data
    }
    await manager.broadcast_alert(message)


async def send_bp_status(patient_id: int, status_data: dict):
    """
    Helper para enviar estado del tensiometro al frontend.
    Llamar desde MQTT bridge cuando llegue status_tensiometro.
    """
    message = {
        "type": "bp_status",
        "timestamp": datetime.utcnow().isoformat(),
        "data": status_data
    }
    await manager.broadcast_to_patient(patient_id, message)


async def send_button_event_calibration(event_data: dict):
    """
    Reenvía eventos del botón materno al canal de calibración.
    Permite que TecnicoDashboard los muestre en el CTG sin sesión activa.
    """
    message = {
        "type": "button_event",
        "timestamp": datetime.utcnow().isoformat(),
        "data": event_data,
    }
    await manager.broadcast_calibration(message)


async def send_calibration_update(data: dict):
    """
    Helper para enviar datos al canal de calibración.
    Se llama siempre que llega un dato de sensor, sin requerir sesión activa.
    """
    message = {
        "type": "calibration",
        "timestamp": datetime.utcnow().isoformat(),
        "data": data
    }
    await manager.broadcast_calibration(message)


async def send_ai_prediction(patient_id: int, prediction_data: dict):
    """
    Helper para enviar predicción de IA (hipoxemia materna).
    La Raspberry Pi publica el resultado del predictor cada 5 s,
    el MQTT bridge lo recibe y lo reenvía aquí.

    prediction_data:
        class          — "normal" | "pre_hipoxemia" | "hipoxemia"
        confidence     — 0.0-1.0
        risk_level     — "low" | "medium" | "high"
        spo2_trend     — "stable" | "descending" | "critical"
        spo2_current   — float
        hr_current     — float | null
        buffer_fullness— 0.0-1.0
    """
    message = {
        "type": "ai_prediction",
        "timestamp": datetime.utcnow().isoformat(),
        "data": prediction_data
    }
    await manager.broadcast_to_patient(patient_id, message)
    # También enviar al canal de calibración para el técnico
    await manager.broadcast_calibration(message)
