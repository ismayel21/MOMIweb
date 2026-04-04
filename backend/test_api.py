"""
Script de prueba rápida del API
Asegúrate de que el servidor esté corriendo antes de ejecutar esto.

Uso:
    python test_api.py
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"


def test_api():
    print("🧪 Probando MOMI API...")
    print("="*60)
    
    # ═══════════════════════════════════════════════════════════
    # 1. Health check
    # ═══════════════════════════════════════════════════════════
    print("\n1️⃣ Health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    assert response.status_code == 200
    print("   ✓ OK")
    
    # ═══════════════════════════════════════════════════════════
    # 2. Login
    # ═══════════════════════════════════════════════════════════
    print("\n2️⃣ Login...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print(f"   Status: {response.status_code}")
    assert response.status_code == 200
    
    token_data = response.json()
    token = token_data["access_token"]
    print(f"   Token obtenido: {token[:30]}...")
    print("   ✓ OK")
    
    # Headers con auth
    headers = {"Authorization": f"Bearer {token}"}
    
    # ═══════════════════════════════════════════════════════════
    # 3. Get current user
    # ═══════════════════════════════════════════════════════════
    print("\n3️⃣ Get current user...")
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    print(f"   Status: {response.status_code}")
    user = response.json()
    print(f"   Usuario: {user['username']} ({user['email']})")
    print("   ✓ OK")
    
    # ═══════════════════════════════════════════════════════════
    # 4. List patients
    # ═══════════════════════════════════════════════════════════
    print("\n4️⃣ List patients...")
    response = requests.get(f"{BASE_URL}/api/patients", headers=headers)
    print(f"   Status: {response.status_code}")
    patients = response.json()
    print(f"   Pacientes encontradas: {len(patients)}")
    if patients:
        print(f"   Primera: {patients[0]['first_name']} {patients[0]['last_name']}")
    print("   ✓ OK")
    
    # ═══════════════════════════════════════════════════════════
    # 5. Get patient detail
    # ═══════════════════════════════════════════════════════════
    if patients:
        print("\n5️⃣ Get patient detail...")
        patient_id = patients[0]['id']
        response = requests.get(f"{BASE_URL}/api/patients/{patient_id}", headers=headers)
        print(f"   Status: {response.status_code}")
        patient = response.json()
        print(f"   Paciente: {patient['first_name']} {patient['last_name']}")
        print(f"   Historia: {patient['medical_record_number']}")
        print(f"   Edad gestacional: {patient.get('gestational_age_weeks', 'N/A')} semanas")
        print("   ✓ OK")
    
    # ═══════════════════════════════════════════════════════════
    # 6. List active sessions
    # ═══════════════════════════════════════════════════════════
    print("\n6️⃣ List active sessions...")
    response = requests.get(f"{BASE_URL}/api/sessions/active", headers=headers)
    print(f"   Status: {response.status_code}")
    active_sessions = response.json()
    print(f"   Sesiones activas: {len(active_sessions)}")
    if active_sessions:
        session = active_sessions[0]
        print(f"   Sesión ID: {session['id']}")
        print(f"   Paciente ID: {session['patient_id']}")
        print(f"   Inicio: {session['start_time']}")
    print("   ✓ OK")
    
    # ═══════════════════════════════════════════════════════════
    # 7. Get latest readings
    # ═══════════════════════════════════════════════════════════
    if patients:
        print("\n7️⃣ Get latest readings...")
        patient_id = patients[0]['id']
        response = requests.get(f"{BASE_URL}/api/readings/latest/{patient_id}", headers=headers)
        print(f"   Status: {response.status_code}")
        readings = response.json()
        print(f"   Lecturas disponibles: {len(readings)}")
        for reading in readings:
            sensor = reading['sensor_type']
            if reading.get('heart_rate'):
                print(f"   {sensor}: HR={reading['heart_rate']} BPM")
            if reading.get('spo2'):
                print(f"   {sensor}: SpO2={reading['spo2']}%")
        print("   ✓ OK")
    
    # ═══════════════════════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════════════════════
    print("\n" + "="*60)
    print("✅ Todas las pruebas pasaron correctamente")
    print("="*60)
    print("\n🚀 El API está funcionando correctamente!")
    print("\n📚 Documentación interactiva:")
    print(f"   {BASE_URL}/docs")
    print("="*60 + "\n")


if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: No se puede conectar al servidor")
        print("   Asegúrate de que el servidor esté corriendo:")
        print("   uvicorn main:app --reload")
    except AssertionError as e:
        print(f"\n❌ Test falló: {e}")
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
