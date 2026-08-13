from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.enums import UserRole


class UserCreate(BaseModel):
    company: str
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.USER


class UserResponse(BaseModel):
    id: str
    company: str
    name: str
    role: UserRole
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
