from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from sqlmodel import Session, select

from app.core.db import engine
from app.core.security import create_access_token
from app.models import Complexity, Designation, Employee, Language, Project, Task, TaskType, Urgency


def _write_pdf(path: Path, pages: int) -> None:
    page_objects = b"\n".join(
        f"<< /Type /Page /Parent 1 0 R >>".encode() for _ in range(pages)
    )
    path.write_bytes(b"%PDF-1.4\n" + page_objects + b"\n%%EOF")


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


def _create_task(
    *,
    assignee_id: str,
    parent_project_id: str,
    task_type: TaskType,
    complexity: Complexity = Complexity.NORMAL,
) -> str:
    with Session(engine) as session:
        task = Task(
            title=f"{task_type.value}-{uuid4().hex[:6]}",
            assignee_id=assignee_id,
            parent_project_id=parent_project_id,
            task_type=task_type,
            complexity=complexity,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return str(task.id)


def _create_project(
    *,
    technical_drawing: str | None = "/uploads/projects/test-drawing.pdf",
    three_d_model: str | None = "/uploads/projects/test-model.glb",
    misc_files: list[str] | None = None,
) -> Project:
    with Session(engine) as session:
        project = Project(
            name=f"Project-{uuid4().hex[:8]}",
            notes="Project notes",
            urgency=Urgency.NORMAL,
            complexity=Complexity.NORMAL,
            technical_drawing=technical_drawing,
            three_d_model=three_d_model,
            misc_files=misc_files or ["/uploads/project-misc/spec-sheet.txt"],
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        return project


def test_creating_complex_project_creates_cutting_task_for_least_loaded_senior(
    client,
    tmp_path,
) -> None:
    admin = _create_employee(designation=Designation.ADMIN, username_prefix="admin-project")
    _create_employee(designation=Designation.CNC_MACHINIST, username_prefix="cnc-busy")
    senior = _create_employee(designation=Designation.SENIOR_CARPENTER, username_prefix="senior-free")

    busy_pdf = tmp_path / "busy.pdf"
    _write_pdf(busy_pdf, pages=10)
    project_pdf = tmp_path / "project.pdf"
    _write_pdf(project_pdf, pages=2)

    busy_project_response = client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={
            "name": f"Busy Project {uuid4().hex[:6]}",
            "notes": None,
            "urgency": "NORMAL",
            "complexity": "COMPLEX",
            "technical_drawing": str(busy_pdf),
            "three_d_model": None,
            "misc_files": [],
            "deadline": None,
        },
    )
    assert busy_project_response.status_code == 201

    with Session(engine) as session:
        busy_project_id = busy_project_response.json()["id"]
        busy_cutting_task = session.exec(
            select(Task).where(
                Task.parent_project_id == busy_project_id,
                Task.task_type == TaskType.CUTTING,
            )
        ).first()
        assert busy_cutting_task is not None
        assert busy_cutting_task.assignee_id is not None
        cnc_employee = session.get(Employee, busy_cutting_task.assignee_id)
        assert cnc_employee is not None
        assert cnc_employee.designation == Designation.CNC_MACHINIST

    response = client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={
            "name": f"Complex Project {uuid4().hex[:6]}",
            "notes": None,
            "urgency": "NORMAL",
            "complexity": "COMPLEX",
            "technical_drawing": str(project_pdf),
            "three_d_model": None,
            "misc_files": [],
            "deadline": None,
        },
    )

    assert response.status_code == 201

    with Session(engine) as session:
        project_id = response.json()["id"]
        cutting_task = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.CUTTING,
            )
        ).first()
        assert cutting_task is not None
        assert str(cutting_task.assignee_id) == str(senior.id)


def test_completing_workflow_creates_next_tasks_with_expected_assignees(
    client,
    tmp_path,
) -> None:
    admin = _create_employee(designation=Designation.ADMIN, username_prefix="admin-flow")
    senior = _create_employee(designation=Designation.SENIOR_CARPENTER, username_prefix="senior-flow")
    junior = _create_employee(designation=Designation.JUNIOR_CARPENTER, username_prefix="junior-flow")
    painter = _create_employee(designation=Designation.PAINTER, username_prefix="painter-flow")

    project_pdf = tmp_path / "flow.pdf"
    _write_pdf(project_pdf, pages=3)

    project_response = client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={
            "name": f"Workflow Project {uuid4().hex[:6]}",
            "notes": None,
            "urgency": "NORMAL",
            "complexity": "COMPLEX",
            "technical_drawing": str(project_pdf),
            "three_d_model": None,
            "misc_files": [],
            "deadline": None,
        },
    )
    assert project_response.status_code == 201
    project_id = project_response.json()["id"]

    with Session(engine) as session:
        cutting_task = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.CUTTING,
            )
        ).first()
        assert cutting_task is not None
        cutting_task_id = str(cutting_task.id)

    complete_cutting = client.patch(
        f"/api/v1/tasks/{cutting_task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={"status": "COMPLETED"},
    )
    assert complete_cutting.status_code == 200

    with Session(engine) as session:
        assembly_task = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.ASSEMBLY,
            )
        ).first()
        assert assembly_task is not None
        assert str(assembly_task.assignee_id) == str(senior.id)
        assembly_task_id = str(assembly_task.id)

    complete_assembly = client.patch(
        f"/api/v1/tasks/{assembly_task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={"status": "COMPLETED"},
    )
    assert complete_assembly.status_code == 200

    with Session(engine) as session:
        disassembly_task = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.DISASSEMBLY,
            )
        ).first()
        assert disassembly_task is not None
        assert str(disassembly_task.assignee_id) == str(senior.id)
        disassembly_task_id = str(disassembly_task.id)

    complete_disassembly = client.patch(
        f"/api/v1/tasks/{disassembly_task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={"status": "COMPLETED"},
    )
    assert complete_disassembly.status_code == 200

    with Session(engine) as session:
        finishing_task = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.FINISHING,
            )
        ).first()
        assert finishing_task is not None
        assert str(finishing_task.assignee_id) == str(painter.id)
        assert str(finishing_task.assignee_id) != str(junior.id)


def test_completing_any_task_rebalances_remaining_open_tasks(client, tmp_path) -> None:
    admin = _create_employee(designation=Designation.ADMIN, username_prefix="admin-rebalance")
    junior_one = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="junior-one",
    )
    junior_two = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="junior-two",
    )

    project_pdf = tmp_path / "rebalance.pdf"
    _write_pdf(project_pdf, pages=2)

    project_response = client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={
            "name": f"Rebalance Project {uuid4().hex[:6]}",
            "notes": None,
            "urgency": "NORMAL",
            "complexity": "NORMAL",
            "technical_drawing": str(project_pdf),
            "three_d_model": None,
            "misc_files": [],
            "deadline": None,
        },
    )
    assert project_response.status_code == 201
    project_id = project_response.json()["id"]

    _create_task(
        assignee_id=str(junior_one.id),
        parent_project_id=project_id,
        task_type=TaskType.ASSEMBLY,
        complexity=Complexity.NORMAL,
    )
    _create_task(
        assignee_id=str(junior_one.id),
        parent_project_id=project_id,
        task_type=TaskType.ASSEMBLY,
        complexity=Complexity.NORMAL,
    )
    _create_task(
        assignee_id=str(junior_one.id),
        parent_project_id=project_id,
        task_type=TaskType.OTHER,
        complexity=Complexity.NORMAL,
    )

    with Session(engine) as session:
        other_task = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.OTHER,
            )
        ).first()
        assert other_task is not None
        other_task_id = str(other_task.id)

    complete_other = client.patch(
        f"/api/v1/tasks/{other_task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={"status": "COMPLETED"},
    )
    assert complete_other.status_code == 200

    with Session(engine) as session:
        assembly_tasks = session.exec(
            select(Task).where(
                Task.parent_project_id == project_id,
                Task.task_type == TaskType.ASSEMBLY,
                Task.status != Task.Status.COMPLETED,
            )
        ).all()
        assignee_ids = {str(task.assignee_id) for task in assembly_tasks}
        assert str(junior_one.id) in assignee_ids
        assert str(junior_two.id) in assignee_ids


def test_my_tasks_returns_parent_project_assets_and_assignee_name(client) -> None:
    junior = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="junior-my-tasks",
    )
    project = _create_project(
        technical_drawing="/uploads/projects/task-drawing.pdf",
        three_d_model="/uploads/projects/task-model.glb",
        misc_files=["/uploads/project-misc/cut-list.xlsx"],
    )
    _create_task(
        assignee_id=str(junior.id),
        parent_project_id=str(project.id),
        task_type=TaskType.ASSEMBLY,
        complexity=Complexity.NORMAL,
    )

    response = client.get(
        "/api/v1/tasks/mine",
        headers={"Authorization": f"Bearer {create_access_token(str(junior.id))}"},
    )

    assert response.status_code == 200
    tasks = response.json()
    matching_task = next(
        task for task in tasks if task["parent_project_id"] == str(project.id)
    )
    assert matching_task["assignee_name"] == junior.name
    assert matching_task["parent_project"]["id"] == str(project.id)
    assert matching_task["parent_project"]["name"] == project.name
    assert (
        matching_task["parent_project"]["technical_drawing"]
        == "/uploads/projects/task-drawing.pdf"
    )
    assert (
        matching_task["parent_project"]["three_d_model"]
        == "/uploads/projects/task-model.glb"
    )
    assert matching_task["parent_project"]["misc_files"] == [
        "/uploads/project-misc/cut-list.xlsx"
    ]


def test_only_admin_can_list_all_tasks(client) -> None:
    admin = _create_employee(designation=Designation.ADMIN, username_prefix="admin-list-tasks")
    senior = _create_employee(
        designation=Designation.SENIOR_CARPENTER,
        username_prefix="senior-list-tasks",
    )
    project = _create_project()
    _create_task(
        assignee_id=str(senior.id),
        parent_project_id=str(project.id),
        task_type=TaskType.ASSEMBLY,
    )

    admin_response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
    )
    assert admin_response.status_code == 200
    assert isinstance(admin_response.json(), list)

    senior_response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {create_access_token(str(senior.id))}"},
    )
    assert senior_response.status_code == 403
    assert senior_response.json()["detail"] == "Admin access required"


def test_non_admin_can_view_projects_but_cannot_create_or_update_them(client, tmp_path) -> None:
    senior = _create_employee(
        designation=Designation.SENIOR_CARPENTER,
        username_prefix="senior-project-access",
    )
    project_pdf = tmp_path / "access-control.pdf"
    _write_pdf(project_pdf, pages=2)

    create_response = client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {create_access_token(str(senior.id))}"},
        json={
            "name": f"Forbidden Project {uuid4().hex[:6]}",
            "notes": None,
            "urgency": "NORMAL",
            "complexity": "NORMAL",
            "technical_drawing": str(project_pdf),
            "three_d_model": None,
            "misc_files": [],
            "deadline": None,
        },
    )
    assert create_response.status_code == 403
    assert create_response.json()["detail"] == "Admin access required"

    project = _create_project()

    list_response = client.get(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {create_access_token(str(senior.id))}"},
    )
    assert list_response.status_code == 200
    assert any(item["id"] == str(project.id) for item in list_response.json())

    read_response = client.get(
        f"/api/v1/projects/{project.id}",
        headers={"Authorization": f"Bearer {create_access_token(str(senior.id))}"},
    )
    assert read_response.status_code == 200
    assert read_response.json()["id"] == str(project.id)

    update_response = client.patch(
        f"/api/v1/projects/{project.id}",
        headers={"Authorization": f"Bearer {create_access_token(str(senior.id))}"},
        json={"notes": "Should not be allowed"},
    )
    assert update_response.status_code == 403
    assert update_response.json()["detail"] == "Admin access required"


def test_non_admin_can_only_read_their_own_task(client) -> None:
    junior_one = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="junior-own-task",
    )
    junior_two = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="junior-other-task",
    )
    project = _create_project()
    own_task_id = _create_task(
        assignee_id=str(junior_one.id),
        parent_project_id=str(project.id),
        task_type=TaskType.ASSEMBLY,
    )
    other_task_id = _create_task(
        assignee_id=str(junior_two.id),
        parent_project_id=str(project.id),
        task_type=TaskType.OTHER,
    )

    own_task_response = client.get(
        f"/api/v1/tasks/{own_task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(junior_one.id))}"},
    )
    assert own_task_response.status_code == 200
    assert own_task_response.json()["id"] == own_task_id

    other_task_response = client.get(
        f"/api/v1/tasks/{other_task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(junior_one.id))}"},
    )
    assert other_task_response.status_code == 403
    assert other_task_response.json()["detail"] == "Not allowed to view this task"


def test_task_assignee_can_only_update_notes_and_status(client) -> None:
    junior = _create_employee(
        designation=Designation.JUNIOR_CARPENTER,
        username_prefix="junior-edit-own-task",
    )
    project = _create_project()
    task_id = _create_task(
        assignee_id=str(junior.id),
        parent_project_id=str(project.id),
        task_type=TaskType.ASSEMBLY,
        complexity=Complexity.NORMAL,
    )
    original_deadline = datetime.now(timezone.utc) + timedelta(days=2)

    with Session(engine) as session:
        task = session.get(Task, task_id)
        assert task is not None
        task.deadline = original_deadline
        task.urgency = Urgency.NORMAL
        task.notes = "Original notes"
        session.add(task)
        session.commit()

    response = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers={"Authorization": f"Bearer {create_access_token(str(junior.id))}"},
        json={
            "notes": "Updated from My Tasks",
            "status": "IN_PROGRESS",
            "deadline": (original_deadline + timedelta(days=3)).isoformat(),
            "urgency": "EXTREMELY_URGENT",
        },
    )

    assert response.status_code == 200

    with Session(engine) as session:
        updated_task = session.get(Task, task_id)
        assert updated_task is not None
        assert updated_task.notes == "Updated from My Tasks"
        assert updated_task.status == Task.Status.IN_PROGRESS
        assert updated_task.deadline == original_deadline
        assert updated_task.urgency == Urgency.NORMAL


def test_admin_can_update_all_project_fields(client) -> None:
    admin = _create_employee(designation=Designation.ADMIN, username_prefix="admin-project-edit")
    project = _create_project(
        technical_drawing="/uploads/projects/original.pdf",
        three_d_model="/uploads/projects/original.glb",
        misc_files=["/uploads/project-misc/original.txt"],
    )

    response = client.patch(
        f"/api/v1/projects/{project.id}",
        headers={"Authorization": f"Bearer {create_access_token(str(admin.id))}"},
        json={
            "name": "Updated Project",
            "notes": "Updated project notes",
            "urgency": "URGENT",
            "complexity": "COMPLEX",
            "technical_drawing": "/uploads/projects/updated.pdf",
            "three_d_model": "/uploads/projects/updated.glb",
            "misc_files": ["/uploads/project-misc/updated-1.txt", "/uploads/project-misc/updated-2.txt"],
            "completed": True,
            "deadline": datetime.now(timezone.utc).isoformat(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Project"
    assert body["notes"] == "Updated project notes"
    assert body["urgency"] == "URGENT"
    assert body["complexity"] == "COMPLEX"
    assert body["technical_drawing"] == "/uploads/projects/updated.pdf"
    assert body["three_d_model"] == "/uploads/projects/updated.glb"
    assert body["misc_files"] == [
        "/uploads/project-misc/updated-1.txt",
        "/uploads/project-misc/updated-2.txt",
    ]
    assert body["completed"] is True