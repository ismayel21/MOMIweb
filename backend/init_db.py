"""
Script para inicializar la base de datos con datos de prueba.

Uso:
    python init_db.py
"""

from datetime import datetime, timedelta
from passlib.context import CryptContext

from database import SessionLocal, engine, Base
from models import Doctor, Patient, MonitoringSession, SensorReading, Alert, SensorType, AlertLevel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def init_database():
    """Crear tablas y datos iniciales"""
    
    print("🔧 Creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tablas creadas")
    
    db = SessionLocal()
    
    try:
        # ═══════════════════════════════════════════════════════════
        # 1. Crear doctor de prueba
        # ═══════════════════════════════════════════════════════════
        
        existing_doctor = db.query(Doctor).filter(Doctor.username == "admin").first()
        if not existing_doctor:
            print("\n👨‍⚕️ Creando doctor de prueba...")
            doctor = Doctor(
                username="admin",
                email="admin@momi.com",
                full_name="Dr. Juan Pérez",
                hashed_password=pwd_context.hash("admin123"),
                is_active=True
            )
            db.add(doctor)
            db.commit()
            print("✓ Doctor creado:")
            print("   Username: admin")
            print("   Password: admin123")
        else:
            print("\n✓ Doctor 'admin' ya existe")
        
        # ═══════════════════════════════════════════════════════════
        # 2. Crear pacientes de prueba
        # ═══════════════════════════════════════════════════════════
        
        existing_patients = db.query(Patient).count()
        if existing_patients == 0:
            print("\n🤰 Creando pacientes de prueba...")
            
            patients_data = [
                {
                    "first_name": "María",
                    "last_name": "García",
                    "date_of_birth": datetime(1990, 5, 15),
                    "medical_record_number": "HCL-001",
                    "phone": "+591 70123456",
                    "email": "maria.garcia@email.com",
                    "gestational_age_weeks": 34,
                    "expected_due_date": datetime.now() + timedelta(days=42),
                    "gravidity": 2,
                    "parity": 1
                },
                {
                    "first_name": "Ana",
                    "last_name": "Rodríguez",
                    "date_of_birth": datetime(1987, 8, 22),
                    "medical_record_number": "HCL-002",
                    "phone": "+591 71234567",
                    "email": "ana.rodriguez@email.com",
                    "gestational_age_weeks": 28,
                    "expected_due_date": datetime.now() + timedelta(days=84),
                    "gravidity": 1,
                    "parity": 0
                },
                {
                    "first_name": "Lucía",
                    "last_name": "Fernández",
                    "date_of_birth": datetime(1993, 12, 3),
                    "medical_record_number": "HCL-003",
                    "phone": "+591 72345678",
                    "email": "lucia.fernandez@email.com",
                    "gestational_age_weeks": 38,
                    "expected_due_date": datetime.now() + timedelta(days=14),
                    "gravidity": 3,
                    "parity": 2
                }
            ]
            
            for patient_data in patients_data:
                patient = Patient(**patient_data)
                db.add(patient)
            
            db.commit()
            print(f"✓ {len(patients_data)} pacientes creadas")
        else:
            print(f"\n✓ {existing_patients} pacientes ya existen")
        
        # ═══════════════════════════════════════════════════════════
        # 3. Crear sesión de ejemplo (opcional)
        # ═══════════════════════════════════════════════════════════
        
        existing_sessions = db.query(MonitoringSession).count()
        if existing_sessions == 0:
            print("\n📊 Creando sesión de monitoreo de ejemplo...")
            
            # Obtener primera paciente
            patient = db.query(Patient).first()
            
            if patient:
                session = MonitoringSession(
                    patient_id=patient.id,
                    start_time=datetime.now() - timedelta(hours=1),
                    end_time=datetime.now() - timedelta(minutes=1),
                    duration_minutes=59,
                    is_active=False,
                    notes="Sesión de ejemplo (histórico)"
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                
                # Crear algunas lecturas de ejemplo
                print("   Agregando lecturas de prueba...")
                base_time = datetime.now() - timedelta(minutes=30)
                
                for i in range(10):
                    # SpO2 reading
                    reading_spo2 = SensorReading(
                        session_id=session.id,
                        sensor_type=SensorType.SPO2,
                        timestamp=base_time + timedelta(minutes=i*3),
                        heart_rate=75 + (i % 5),
                        spo2=97 + (i % 3),
                        quality_score=0.95
                    )
                    db.add(reading_spo2)
                    
                    # Fetal Doppler reading
                    reading_fetal = SensorReading(
                        session_id=session.id,
                        sensor_type=SensorType.FETAL_DOPPLER,
                        timestamp=base_time + timedelta(minutes=i*3),
                        heart_rate=140 + (i % 10),
                        quality_score=0.90
                    )
                    db.add(reading_fetal)
                
                db.commit()
                print("✓ Sesión activa creada con lecturas de ejemplo")
        else:
            print(f"\n✓ {existing_sessions} sesiones ya existen")
        
        print("\n" + "="*60)
        print("✅ Base de datos inicializada correctamente")
        print("="*60)
        print("\n🚀 Para iniciar el servidor:")
        print("   cd backend")
        print("   uvicorn main:app --reload")
        print("\n🔑 Credenciales de prueba:")
        print("   Username: admin")
        print("   Password: admin123")
        print("\n📚 API Docs: http://localhost:8000/docs")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
