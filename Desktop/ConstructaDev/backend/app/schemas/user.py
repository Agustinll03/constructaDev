from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class InviteRequest(BaseModel):
    email: EmailStr
    role: Literal["admin", "collaborator"] = "collaborator"


class InviteResponse(BaseModel):
    invite_token: str
    invite_url: str


class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8)
