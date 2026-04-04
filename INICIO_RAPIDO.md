# 🚀 MOMI Web — Parte 1 COMPLETADA

## ✅ Lo que acabamos de construir

Backend completo en FastAPI con:
- ✅ Autenticación JWT (login/register)
- ✅ CRUD de pacientes
- ✅ CRUD de sesiones de monitoreo
- ✅ Sistema de lecturas de sensores
- ✅ Base de datos MySQL (SQLAlchemy ORM)
- ✅ Documentación interactiva automática (Swagger)
- ✅ Script de inicialización con datos de prueba

---

## 📦 Archivos creados

```
momi-web/
└── backend/
    ├── main.py                  # App FastAPI
    ├── config.py                # Configuración
    ├── database.py              # SQLAlchemy setup
    ├── models.py                # ORM models
    ├── init_db.py               # Inicializar DB
    ├── test_api.py              # Tests
    ├── requirements.txt         # Dependencias
    ├── README.md                # Documentación
    ├── .env.example             # Variables de entorno
    ├── .gitignore
    ├── auth/
    │   ├── routes.py            # Login, JWT
    │   ├── schemas.py
    │   └── dependencies.py
    ├── patients/
    │   ├── routes.py            # CRUD pacientes
    │   └── schemas.py
    ├── sessions/
    │   ├── routes.py            # CRUD sesiones
    │   └── schemas.py
    └── readings/
        ├── routes.py            # Lecturas sensores
        └── schemas.py
```

**20 archivos** en total.

---

## 🏃 Cómo ejecutar (pasos rápidos)

### 1. Configurar la base de datos

**Opción A: Usar la DB de la Raspi (recomendado)**
```bash
# Editar backend/config.py
DB_HOST = "192.168.50.1"  # IP de la Raspi
DB_USER = "usuario_momi"
DB_PASSWORD = "tu_password_actual"
DB_NAME = "momi_db"
```

**Opción B: MySQL local**
```bash
# Instalar MySQL en tu PC de desarrollo
sudo apt install mysql-server  # Linux
# brew install mysql          # macOS

# Crear base de datos
mysql -u root -p
CREATE DATABASE momi_db;
CREATE USER 'usuario_momi'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL ON momi_db.* TO 'usuario_momi'@'localhost';
```

### 2. Instalar dependencias

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Inicializar DB con datos de prueba

```bash
python init_db.py
```

Esto crea:
- Doctor: `admin` / `admin123`
- 3 pacientes de ejemplo
- 1 sesión activa con lecturas

### 4. Ejecutar servidor

```bash
uvicorn main:app --reload
```

### 5. Probar

**Opción A: Swagger UI (recomendado)**
- Abrir: http://localhost:8000/docs
- Click en "Authorize"
- Login con `admin` / `admin123`
- Copiar el `access_token`
- Pegar en el popup (agregar "Bearer " antes)
- Probar todos los endpoints

**Opción B: Script de prueba**
```bash
python test_api.py
```

---

## 🎯 API Endpoints disponibles

### Auth
- `POST /api/auth/login` — Obtener JWT token
- `POST /api/auth/register` — Crear doctor
- `GET /api/auth/me` — Perfil actual

### Patients
- `GET /api/patients` — Listar (con búsqueda)
- `POST /api/patients` — Crear
- `GET /api/patients/{id}` — Detalle
- `PUT /api/patients/{id}` — Editar
- `DELETE /api/patients/{id}` — Eliminar (soft)

### Sessions
- `GET /api/sessions` — Listar (con filtros)
- `GET /api/sessions/active` — Solo activas
- `POST /api/sessions` — Iniciar nueva
- `GET /api/sessions/{id}` — Detalle
- `PUT /api/sessions/{id}` — Actualizar
- `POST /api/sessions/{id}/end` — Finalizar

### Readings
- `GET /api/readings` — Listar (con filtros)
- `GET /api/readings/latest/{patient_id}` — Últimas por paciente
- `POST /api/readings` — Crear (manual, para testing)

---

## 🧪 Ejemplo de uso completo

### 1. Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Respuesta:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### 2. Listar pacientes
```bash
TOKEN="tu_token_aqui"

curl -X GET "http://localhost:8000/api/patients" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Ver sesiones activas
```bash
curl -X GET "http://localhost:8000/api/sessions/active" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Ver últimas lecturas
```bash
curl -X GET "http://localhost:8000/api/readings/latest/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Modelos de datos

### Doctor
- username, email, password (hashed)
- full_name, is_active

### Patient
- Datos personales: nombre, fecha nacimiento, historia clínica
- Contacto: teléfono, email, dirección
- Obstétrica: edad gestacional, FPP, G/P

### MonitoringSession
- patient_id
- start_time, end_time, duration
- is_active, notes

### SensorReading
- session_id, sensor_type, timestamp
- heart_rate, spo2, bp, contraction_intensity
- quality_score

---

## 🔜 Siguiente: Parte 2

En la Parte 2 implementaremos:

1. **MQTT Bridge**
   - Cliente MQTT en FastAPI
   - Suscripción a topics de la Raspi
   - Auto-inserción de lecturas en DB

2. **WebSocket Real-time**
   - Stream de datos en vivo
   - Push de alertas
   - Sincronización multi-cliente

3. **Sistema de Alertas**
   - Reglas automáticas (SpO2 < 90%, HR > 180)
   - Notificaciones push
   - Dashboard de alertas

4. **Frontend React** (Parte 3)
   - Dashboard con gráficas CTG en vivo
   - Gestión de pacientes
   - Historial con replay de sesiones

---

## 💡 Tips

- La DB se crea automáticamente con `init_db.py`
- Los endpoints están protegidos con JWT (excepto login/register)
- Las eliminaciones son soft-delete (`is_active=False`)
- El token expira en 7 días (configurable)
- Swagger UI es tu mejor amigo para testing

---

## 🐛 Troubleshooting

**"Connection refused to MySQL"**
- Verifica que MySQL esté corriendo
- Revisa las credenciales en `config.py`
- Si usas la DB de la Raspi, verifica conectividad de red

**"ModuleNotFoundError"**
- Activa el entorno virtual: `source venv/bin/activate`
- Reinstala: `pip install -r requirements.txt`

**"401 Unauthorized"**
- El token JWT expiró o es inválido
- Haz login de nuevo para obtener un nuevo token

---

## ✅ Checklist de validación

- [ ] Servidor inicia sin errores
- [ ] Login funciona y retorna token
- [ ] GET /api/patients retorna las 3 pacientes de prueba
- [ ] GET /api/sessions/active retorna 1 sesión activa
- [ ] GET /api/readings/latest/1 retorna lecturas
- [ ] Swagger UI funciona en /docs
- [ ] test_api.py pasa todas las pruebas

Si todos pasan: **¡Parte 1 completa! 🎉**

---

**Ismael**, revisa el README.md completo para más detalles. Cuando estés listo, seguimos con la Parte 2 (MQTT + WebSocket real-time).
