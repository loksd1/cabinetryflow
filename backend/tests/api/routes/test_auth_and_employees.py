from uuid import uuid4

from sqlmodel import Session

from app.core.db import engine
from app.core.security import create_access_token
from app.models import Designation, Employee, Language


def _create_employee(*, designation: Designation, username_prefix: str) -> Employee:
    username = f"{username_prefix}-{uuid4().hex[:8]}"
    with Session(engine) as session:
        employee = Employee(
            name=username_prefix.title(),
            username=username,
            password="Test12345+",
            designation=designation,
            language=Language.EN,
        )
        session.add(employee)
        session.commit()
        session.refresh(employee)
        return employee


def test_stale_token_returns_unauthorized(client) -> None:
    token = create_access_token("00000000-0000-0000-0000-000000000000")

    response = client.post(
        "/api/v1/employees/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Example Employee",
            "username": f"example-{uuid4().hex[:8]}",
            "password": "Test12345+",
            "designation": "Junior Carpenter",
            "language": "EN",
            "notes": None,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_admin_can_create_employee(client) -> None:
    admin = _create_employee(
        designation=Designation.ADMIN,
        username_prefix="admin",
    )
    token = create_access_token(str(admin.id))

    response = client.post(
        "/api/v1/employees/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "New Employee",
            "username": f"new-employee-{uuid4().hex[:8]}",
            "password": "Test12345+",
            "designation": "Junior Carpenter",
            "language": "EN",
            "notes": "Created from test",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New Employee"
    assert body["designation"] == "Junior Carpenter"
    assert body["language"] == "EN"
    assert body["active"] is True


def test_admin_can_update_employee_all_fields_including_active(client) -> None:
    admin = _create_employee(
        designation=Designation.ADMIN,
        username_prefix="admin-editor",
    )
    employee = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="employee-to-edit",
    )
    token = create_access_token(str(admin.id))

    response = client.patch(
        f"/api/v1/employees/{employee.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Edited Employee",
            "username": f"edited-{uuid4().hex[:8]}",
            "password": "Updated12345+",
            "designation": "Painter",
            "language": "RU",
            "notes": "Updated by admin",
            "active": False,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Edited Employee"
    assert body["designation"] == "Painter"
    assert body["language"] == "RU"
    assert body["notes"] == "Updated by admin"
    assert body["active"] is False


def test_login_returns_employee_language(client) -> None:
    employee = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="login-language",
    )

    with Session(engine) as session:
        persisted_employee = session.get(Employee, employee.id)
        assert persisted_employee is not None
        persisted_employee.language = Language.RU
        session.add(persisted_employee)
        session.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": employee.username,
            "password": "Test12345+",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["designation"] == "Junior Carpenter"
    assert body["language"] == "RU"