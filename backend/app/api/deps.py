from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.models import Designation, Employee


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=True,
)


class TokenPayload(BaseModel):
    sub: str


TokenDep = Annotated[str, Depends(oauth2_scheme)]


def get_current_employee(session: SessionDep, token: TokenDep) -> Employee:
    try:
        from app.core.security import decode_access_token

        payload = decode_access_token(token)
        token_data = TokenPayload(**payload)
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from None

    employee = session.get(Employee, token_data.sub)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    return employee


CurrentEmployee = Annotated[Employee, Depends(get_current_employee)]


def get_current_admin(current: CurrentEmployee) -> Employee:
    if current.designation is not Designation.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current


AdminEmployee = Annotated[Employee, Depends(get_current_admin)]


def get_current_task_creator(current: CurrentEmployee) -> Employee:
    if current.designation not in {
        Designation.ADMIN,
        Designation.SENIOR_CARPENTER,
        Designation.CNC_MACHINIST,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task creation access required",
        )
    return current


TaskCreatorEmployee = Annotated[Employee, Depends(get_current_task_creator)]

