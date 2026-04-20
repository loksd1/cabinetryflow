from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import Session, SQLModel, Field, select

from app.api.deps import AdminEmployee, SessionDep, TaskCreatorEmployee
from app.models import Designation, Employee, Language


router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeBase(SQLModel):
    name: str = Field(max_length=255)
    username: str = Field(max_length=255)
    password: str = Field(max_length=255)
    designation: Designation = Designation.JUNIOR_CARPENTER
    notes: str | None = None
    language: Language = Language.EN
    active: bool = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(SQLModel):
    name: str | None = None
    username: str | None = None
    password: str | None = None
    designation: Designation | None = None
    notes: str | None = None
    language: Language | None = None
    active: bool | None = None


class EmployeePublic(SQLModel):
    id: str
    name: str
    username: str
    designation: Designation
    notes: str | None = None
    language: Language
    active: bool


@router.get("/", response_model=list[EmployeePublic])
def list_employees(session: SessionDep, _: TaskCreatorEmployee) -> list[EmployeePublic]:
    employees = session.exec(select(Employee)).all()
    return [
        EmployeePublic(
            id=str(e.id),
            name=e.name,
            username=e.username,
            designation=e.designation,
            notes=e.notes,
            language=e.language,
            active=e.active,
        )
        for e in employees
    ]


@router.post("/", response_model=EmployeePublic, status_code=status.HTTP_201_CREATED)
def create_employee(
    *, session: SessionDep, employee_in: EmployeeCreate, _: AdminEmployee
) -> EmployeePublic:
    existing = session.exec(
        select(Employee).where(Employee.username == employee_in.username)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    employee = Employee.model_validate(employee_in)
    session.add(employee)
    session.commit()
    session.refresh(employee)

    return EmployeePublic(
        id=str(employee.id),
        name=employee.name,
        username=employee.username,
        designation=employee.designation,
        notes=employee.notes,
        language=employee.language,
        active=employee.active,
    )


@router.get("/{employee_id}", response_model=EmployeePublic)
def read_employee(
    employee_id: str, session: SessionDep, _: TaskCreatorEmployee
) -> EmployeePublic:
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return EmployeePublic(
        id=str(employee.id),
        name=employee.name,
        username=employee.username,
        designation=employee.designation,
        notes=employee.notes,
        language=employee.language,
        active=employee.active,
    )


@router.patch("/{employee_id}", response_model=EmployeePublic)
def update_employee(
    employee_id: str, *, session: SessionDep, employee_in: EmployeeUpdate, _: AdminEmployee
) -> EmployeePublic:
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = employee_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    session.add(employee)
    session.commit()
    session.refresh(employee)

    return EmployeePublic(
        id=str(employee.id),
        name=employee.name,
        username=employee.username,
        designation=employee.designation,
        notes=employee.notes,
        language=employee.language,
        active=employee.active,
    )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: str, session: SessionDep, _: AdminEmployee) -> None:
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    session.delete(employee)
    session.commit()
