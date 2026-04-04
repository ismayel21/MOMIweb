"""
Auth dependencies — JWT validation
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import Doctor
from config import SECRET_KEY, ALGORITHM
from auth.schemas import TokenData


# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_doctor(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Doctor:
    """
    Dependency que valida el JWT y retorna el doctor actual.
    Úsalo en rutas protegidas:
    
    @router.get("/protected")
    def protected_route(current_doctor: Doctor = Depends(get_current_doctor)):
        ...
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    doctor = db.query(Doctor).filter(Doctor.username == token_data.username).first()
    if doctor is None:
        raise credentials_exception
    
    if not doctor.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return doctor


def get_current_admin(current_doctor: Doctor = Depends(get_current_doctor)) -> Doctor:
    """Dependency que verifica que el usuario tiene rol 'admin'."""
    if current_doctor.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_doctor
