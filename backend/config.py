"""
Configuración global de MOMI Web
"""

import os
from typing import Optional

# ═══════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════

# MySQL (la misma DB que ya tienes en la Raspi)
# MySQL local
DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "momi_user"  # ← Era "usuario_momi"
DB_PASSWORD = "Momi2024!Strong"  # ← Era "tu_password_segura"
DB_NAME = "momi_db"


# Para producción con MySQL:
# DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Para pruebas locales con SQLite (no requiere MySQL):
DATABASE_URL = "sqlite:///./momi_test.db"

# ═══════════════════════════════════════════════════════════
# JWT AUTH
# ═══════════════════════════════════════════════════════════

# IMPORTANTE: Cambiar SECRET_KEY en producción
SECRET_KEY = os.getenv("SECRET_KEY", "MOMI_SECRET_KEY_CHANGE_IN_PRODUCTION_123456")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días

# ═══════════════════════════════════════════════════════════
# MQTT (para tiempo real - Parte 2)
# ═══════════════════════════════════════════════════════════

MQTT_BROKER   = os.getenv("MQTT_BROKER",   "54c76c91462845b3b5fdab8073dd625d.s1.eu.hivemq.cloud")
MQTT_PORT     = int(os.getenv("MQTT_PORT", "8883"))
MQTT_USER     = os.getenv("MQTT_USER",     "ISMAEL2101")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "Momi1234")
MQTT_TOPIC_BASE = "momi/#"  # Suscribirse a todos los topics
MQTT_DEVICE_ID  = os.getenv("MQTT_DEVICE_ID", "ISMAEL_test")

# ═══════════════════════════════════════════════════════════
# APP SETTINGS
# ═══════════════════════════════════════════════════════════

APP_NAME = "MOMI Web"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
