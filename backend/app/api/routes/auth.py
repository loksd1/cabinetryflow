from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import CurrentEmployee, SessionDep
from app.core.security import create_access_token
from app.models import Employee


router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: str
    designation: str
    language: str


@router.post("/login", response_model=TokenResponse)
def login(
    session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    statement = select(Employee).where(Employee.username == form_data.username)
    employee = session.exec(statement).first()
    if not employee or employee.password != form_data.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect credentials")

    token = create_access_token(subject=employee.id)
    return TokenResponse(
        access_token=token,
        employee_id=str(employee.id),
        designation=employee.designation.value,
        language=employee.language.value,
    )


@router.get("/me", response_model=dict)
def read_current_employee(current: CurrentEmployee) -> dict[str, Any]:
    return {
        "id": str(current.id),
        "name": current.name,
        "username": current.username,
        "designation": current.designation.value,
        "language": current.language.value,
        "notes": current.notes,
    }
