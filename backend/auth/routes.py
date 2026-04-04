"""
Auth routes — Login, Register, Get Current User
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

from database import get_db
from models import Doctor
from auth.schemas import DoctorCreate, DoctorResponse, Token, LoginRequest
from auth.dependencies import get_current_doctor
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


router = APIRouter() 

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_doctor(db: Session, username: str, password: str):
    doctor = db.query(Doctor).filter(Doctor.username == username).first()
    if not doctor:
        return None
    if not verify_password(password, doctor.hashed_password):
        return None
    return doctor


# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),  # ← CAMBIADO
    db: Session = Depends(get_db)
):
    """
    Login con username y password usando OAuth2 form-data.
    Retorna JWT token.
    """
    doctor = authenticate_doctor(db, form_data.username, form_data.password)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": doctor.username, "role": doctor.role}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db)
):
    """
    Crear nuevo doctor.
    En producción, esto debería estar protegido (solo admin).
    """
    # Verificar si ya existe
    existing = db.query(Doctor).filter(
        (Doctor.username == doctor_data.username) | (Doctor.email == doctor_data.email)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Crear doctor
    hashed_password = get_password_hash(doctor_data.password)
    doctor = Doctor(
        username=doctor_data.username,
        email=doctor_data.email,
        full_name=doctor_data.full_name,
        hashed_password=hashed_password,
        role=doctor_data.role
    )
    
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    
    return doctor


@router.get("/me", response_model=DoctorResponse)
async def get_me(current_doctor: Doctor = Depends(get_current_doctor)):
    """
    Obtener perfil del doctor actual (validando JWT).
    """
    return current_doctor
