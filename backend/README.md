# MOMI Web — Backend (FastAPI)

Sistema de monitoreo prenatal remoto - API REST + WebSocket

---

## 📋 Requisitos

- Python 3.10+
- MySQL 5.7+ (la misma que tienes en la Raspi)

---

## 🚀 Instalación

### 1. Crear entorno virtual

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar base de datos

Editar `config.py` con tus credenciales de MySQL:

```python
DB_HOST = "localhost"  # O la IP de tu Raspi si la DB está ahí
DB_PORT = 3306
DB_USER = "usuario_momi"
DB_PASSWORD = "tu_password_segura"
DB_NAME = "momi_db"
```

### 4. Inicializar base de datos

```bash
python init_db.py
```

Esto creará:
- Las tablas necesarias
- Un doctor de prueba (username: `admin`, password: `admin123`)
- 3 pacientes de ejemplo
- Una sesión activa con lecturas de prueba

---

## 🏃 Ejecutar el servidor

```bash
uvicorn main:app --reload
```

El servidor estará disponible en:
- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🔐 Autenticación

Todas las rutas (excepto `/api/auth/login` y `/api/auth/register`) requieren autenticación JWT.

### Login

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Respuesta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Usar el token

En requests posteriores, incluye el header:

```
Authorization: Bearer <access_token>
```

---

## 📚 API Endpoints

### Auth
- `POST /api/auth/login` — Login (obtener JWT)
- `POST /api/auth/register` — Registrar nuevo doctor
- `GET /api/auth/me` — Obtener perfil actual

### Patients
- `GET /api/patients` — Listar pacientes (con búsqueda)
- `POST /api/patients` — Crear paciente
- `GET /api/patients/{id}` — Detalle de paciente
- `PUT /api/patients/{id}` — Actualizar paciente
- `DELETE /api/patients/{id}` — Eliminar paciente (soft delete)

### Sessions
- `GET /api/sessions` — Listar sesiones
- `GET /api/sessions/active` — Sesiones activas ahora
- `POST /api/sessions` — Iniciar nueva sesión
- `GET /api/sessions/{id}` — Detalle de sesión
- `PUT /api/sessions/{id}` — Actualizar sesión
- `POST /api/sessions/{id}/end` — Finalizar sesión

### Readings
- `GET /api/readings` — Listar lecturas (con filtros)
- `GET /api/readings/latest/{patient_id}` — Últimas lecturas
- `POST /api/readings` — Crear lectura (para testing)

---

## 🧪 Testing con Swagger UI

1. Ir a http://localhost:8000/docs
2. Click en "Authorize" (candado)
3. Hacer login en `POST /api/auth/login` con:
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
4. Copiar el `access_token` de la respuesta
5. Pegarlo en el popup de Authorize (agregar "Bearer " antes del token)
6. Click "Authorize"
7. Ya puedes probar todos los endpoints

---

## 📁 Estructura del proyecto

```
backend/
├── main.py              # FastAPI app
├── config.py            # Configuración
├── database.py          # SQLAlchemy setup
├── models.py            # Models ORM
├── init_db.py           # Script de inicialización
├── requirements.txt     # Dependencias
├── auth/
│   ├── routes.py        # Login, register, JWT
│   ├── schemas.py       # Pydantic schemas
│   └── dependencies.py  # Auth middleware
├── patients/
│   ├── routes.py        # CRUD pacientes
│   └── schemas.py
├── sessions/
│   ├── routes.py        # CRUD sesiones
│   └── schemas.py
└── readings/
    ├── routes.py        # Lecturas de sensores
    └── schemas.py
```

---

## 🔜 Siguiente paso: Parte 2

En la Parte 2 implementaremos:
- MQTT bridge (Raspi → FastAPI)
- WebSocket real-time (FastAPI → React)
- Sistema de alertas automáticas

---

## 🐛 Troubleshooting

### Error de conexión a MySQL

Verificar que:
1. MySQL está corriendo: `sudo systemctl status mysql`
2. Las credenciales en `config.py` son correctas
3. La base de datos `momi_db` existe: `CREATE DATABASE IF NOT EXISTS momi_db;`
4. El usuario tiene permisos: `GRANT ALL ON momi_db.* TO 'usuario_momi'@'localhost';`

### Error "ModuleNotFoundError"

Asegúrate de estar en el entorno virtual:
```bash
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

---

## 📝 Notas

- El servidor por defecto corre en **puerto 8000**
- El token JWT expira en **7 días** (configurable en `config.py`)
- Los passwords se hashean con **bcrypt**
- La eliminación de pacientes es **soft delete** (marca `is_active=False`)
