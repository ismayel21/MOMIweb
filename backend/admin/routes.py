"""
Admin routes — Gestión de usuarios (doctores y técnicos)
Solo accesible con rol 'admin'.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from database import get_db
from models import Doctor
from auth.dependencies import get_current_admin

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Schemas ──────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    role: str = "doctor"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_admin),
):
    """Listar todos los usuarios del sistema."""
    return db.query(Doctor).order_by(Doctor.created_at.desc()).all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_admin),
):
    """Crear un nuevo usuario (doctor, técnico o admin)."""
    existing = db.query(Doctor).filter(
        (Doctor.username == data.username.lower().strip()) | (Doctor.email == data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username o email ya registrado")

    user = Doctor(
        username=data.username.lower().strip(),
        email=data.email,
        full_name=data.full_name,
        hashed_password=pwd_context.hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin),
):
    """Actualizar datos, rol o estado de un usuario."""
    user = db.query(Doctor).filter(Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update = data.model_dump(exclude_unset=True)
    if "password" in update:
        user.hashed_password = pwd_context.hash(update.pop("password"))
    for field, value in update.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin),
):
    """Desactivar un usuario (soft delete)."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")

    user = db.query(Doctor).filter(Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = False
    db.commit()
