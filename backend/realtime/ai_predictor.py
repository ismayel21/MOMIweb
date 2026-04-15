"""
═══════════════════════════════════════════════════════════
  AI Predictor (Backend) — Clasificador de riesgo hipoxémico

  Réplica del predictor de la Raspberry Pi adaptada para
  ejecutarse directamente en el backend web.

  Usa reglas clínicas (no requiere TFLite). Se alimenta
  desde el MQTT bridge cada vez que llegan datos de SpO₂
  o FC materna, y emite predicciones cada PREDICT_INTERVAL.

  Esto permite que la web muestre predicciones IA sin
  depender de que la Raspberry Pi esté encendida.
═══════════════════════════════════════════════════════════
"""

import asyncio
import logging
import time
from collections import deque
from datetime import datetime

logger = logging.getLogger(__name__)

# ─── Parámetros (idénticos al predictor de la Raspi) ────────────────────────

WINDOW       = 60    # muestras en la ventana deslizante (~60 s a 1 Hz)
MIN_SAMPLES  = 8     # mínimo para empezar a predecir

# Umbrales SpO₂
SPO2_NORMAL       = 95.0
SPO2_PRE_HYPOXIA  = 91.0

# Umbrales de tendencia (caída en %)
TREND_DESCENDING  = 2.0
TREND_CRITICAL    = 4.5

# FC materna
HR_HIGH  = 100
HR_LOW   = 60

# Muestras recientes para promedio "actual"
RECENT_N = 5

# Intervalo mínimo entre predicciones (segundos)
PREDICT_INTERVAL = 5.0

CLASS_NAMES = ["normal", "pre_hipoxemia", "hipoxemia"]


class BackendAIPredictor:
    """
    Clasificador de riesgo hipoxémico que corre en el backend.
    Thread-safe: se alimenta desde el hilo MQTT de paho y se
    consulta desde asyncio.
    """

    def __init__(self):
        self._spo2_buf: deque = deque(maxlen=WINDOW)
        self._hr_buf: deque   = deque(maxlen=WINDOW)
        self._last_prediction_time: float = 0.0
        self._last_result: dict = self._unknown_result(0)

    # ── Ingesta de datos ──────────────────────────────────────────────────

    def push_spo2(self, val: float):
        """Llamar desde el hilo MQTT cada vez que llega madre/spo2."""
        if 50.0 <= val <= 100.0:
            self._spo2_buf.append(float(val))

    def push_hr(self, val: float):
        """Llamar desde el hilo MQTT cada vez que llega madre/bpm."""
        if 20.0 <= val <= 250.0:
            self._hr_buf.append(float(val))

    # ── Predicción ────────────────────────────────────────────────────────

    def should_predict(self) -> bool:
        """Retorna True si ya pasó suficiente tiempo y hay datos."""
        if len(self._spo2_buf) < MIN_SAMPLES:
            return False
        return (time.time() - self._last_prediction_time) >= PREDICT_INTERVAL

    def predict(self) -> dict:
        """
        Ejecuta la predicción basada en reglas clínicas.
        Retorna dict compatible con el formato del AIPredictor de la Raspi.
        """
        n = len(self._spo2_buf)

        if n < MIN_SAMPLES:
            result = self._unknown_result(n)
            self._last_result = result
            return result

        self._last_prediction_time = time.time()

        spo2_list = list(self._spo2_buf)
        hr_list   = list(self._hr_buf)

        # ── Valores actuales ─────────────────────────────────────────
        spo2_current = _mean(spo2_list[-RECENT_N:])
        hr_current   = _mean(hr_list[-RECENT_N:]) if hr_list else None

        # ── Tendencia SpO₂ ───────────────────────────────────────────
        spo2_trend = _compute_spo2_trend(spo2_list)

        # ── Clasificación ────────────────────────────────────────────
        pred = _classify_spo2(spo2_current, spo2_trend)

        # Escalar si FC anormal + pre-hipoxemia
        if hr_current is not None and pred == "pre_hipoxemia":
            if hr_current > HR_HIGH or hr_current < HR_LOW:
                pred = "hipoxemia"

        risk = _risk_level(pred)

        # ── Confianza ────────────────────────────────────────────────
        fill_score  = min(1.0, n / WINDOW)
        consistency = _consistency(spo2_list)
        confidence  = fill_score * 0.6 + consistency * 0.4

        result = {
            "class":           pred,
            "confidence":      round(confidence, 2),
            "risk_level":      risk,
            "spo2_trend":      spo2_trend,
            "spo2_current":    round(spo2_current, 1),
            "hr_current":      round(hr_current, 0) if hr_current else None,
            "buffer_fullness": round(n / WINDOW, 2),
        }

        self._last_result = result
        logger.info(
            f"✓ AI prediction (backend): {pred} "
            f"(conf {confidence:.0%}, SpO₂ {spo2_current:.1f}%, "
            f"trend {spo2_trend})"
        )
        return result

    @property
    def last_result(self) -> dict:
        return self._last_result

    def reset(self):
        """Limpiar buffers (nueva sesión, etc.)."""
        self._spo2_buf.clear()
        self._hr_buf.clear()
        self._last_prediction_time = 0.0
        self._last_result = self._unknown_result(0)

    @staticmethod
    def _unknown_result(n: int) -> dict:
        return {
            "class":          "unknown",
            "confidence":     0.0,
            "risk_level":     "low",
            "spo2_trend":     "stable",
            "spo2_current":   None,
            "hr_current":     None,
            "buffer_fullness": n / WINDOW if WINDOW else 0,
        }


# ─── Helpers (idénticos al predictor de la Raspi) ───────────────────────────

def _mean(lst: list) -> float:
    return sum(lst) / len(lst) if lst else 0.0


def _compute_spo2_trend(spo2_list: list) -> str:
    n = len(spo2_list)
    third = max(1, n // 3)
    spo2_early  = _mean(spo2_list[:third])
    spo2_recent = _mean(spo2_list[-third:])
    drop = spo2_early - spo2_recent

    if drop >= TREND_CRITICAL:
        return "critical"
    if drop >= TREND_DESCENDING:
        return "descending"
    return "stable"


def _classify_spo2(spo2: float, trend: str) -> str:
    if spo2 < SPO2_PRE_HYPOXIA or trend == "critical":
        return "hipoxemia"
    if spo2 < SPO2_NORMAL or trend == "descending":
        return "pre_hipoxemia"
    return "normal"


def _risk_level(cls: str) -> str:
    return {
        "normal": "low",
        "pre_hipoxemia": "medium",
        "hipoxemia": "high",
    }.get(cls, "low")


def _consistency(lst: list) -> float:
    if len(lst) < 2:
        return 0.0
    mean = _mean(lst)
    variance = sum((x - mean) ** 2 for x in lst) / len(lst)
    std = variance ** 0.5
    return max(0.0, min(1.0, 1.0 - (std / 5.0)))


# ─── Instancia global ──────────────────────────────────────────────────────

ai_predictor = BackendAIPredictor()
