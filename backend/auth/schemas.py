"""
Pydantic schemas para autenticación
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class DoctorBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None


class DoctorCreate(DoctorBase):
    password: str
    role: str = "doctor"


class DoctorResponse(DoctorBase):
    id: int
    is_active: bool
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
