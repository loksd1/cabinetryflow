from __future__ import annotations

import re
import uuid
from collections.abc import Sequence
from pathlib import Path

import httpx
from sqlmodel import Session, select

from app.core.uploads import resolve_upload_root
from app.models import Complexity, Designation, Employee, Project, Task, TaskType


COMPLEXITY_MULTIPLIERS: dict[Complexity, float] = {
    Complexity.SIMPLE: 1.0,
    Complexity.NORMAL: 2.0,
    Complexity.COMPLEX: 4.0,
}

TASK_TYPE_MULTIPLIERS: dict[TaskType, float] = {
    TaskType.CUTTING: 5.0,
    TaskType.ASSEMBLY: 5.0,
    TaskType.DISASSEMBLY: 1.0,
    TaskType.FINISHING: 7.5,
    TaskType.OTHER: 1.0,
}

CARPENTER_DESIGNATIONS = {
    Designation.SENIOR_CARPENTER,
    Designation.MIDDLE_CARPENTER,
    Designation.JUNIOR_CARPENTER,
}

FOLLOW_UP_TASK_TYPE: dict[TaskType, TaskType] = {
    TaskType.CUTTING: TaskType.ASSEMBLY,
    TaskType.ASSEMBLY: TaskType.DISASSEMBLY,
    TaskType.DISASSEMBLY: TaskType.FINISHING,
}

TASK_TITLE: dict[TaskType, str] = {
    TaskType.CUTTING: "Cutting",
    TaskType.ASSEMBLY: "Assembly",
    TaskType.DISASSEMBLY: "Disassembly",
    TaskType.FINISHING: "Finishing",
    TaskType.OTHER: "Other",
}


def _read_technical_drawing_bytes(source: str) -> bytes:
    if source.startswith("/uploads/"):
        relative = source.removeprefix("/uploads/")
        file_path = resolve_upload_root() / relative
        return file_path.read_bytes()

    if source.startswith(("http://", "https://")):
        response = httpx.get(source, timeout=10.0)
        response.raise_for_status()
        return response.content

    return Path(source).read_bytes()


def _extract_pdf_page_count(pdf_bytes: bytes) -> int:
    page_matches = re.findall(rb"/Type\s*/Page\b", pdf_bytes)
    if page_matches:
        return len(page_matches)

    count_matches = [int(match) for match in re.findall(rb"/Count\s+(\d+)", pdf_bytes)]
    if count_matches:
        return max(count_matches)

    raise ValueError("Could not determine PDF page count")


def get_technical_drawing_page_count(
    technical_drawing: str | None,
    *,
    strict: bool = False,
) -> int:
    if not technical_drawing:
        if strict:
            raise ValueError("Technical drawing is required to calculate project load")
        return 1

    try:
        pdf_bytes = _read_technical_drawing_bytes(technical_drawing)
        return _extract_pdf_page_count(pdf_bytes)
    except Exception:
        if strict:
            raise
        return 1


def calculate_project_load(project: Project, *, strict: bool = False) -> float:
    page_count = get_technical_drawing_page_count(project.technical_drawing, strict=strict)
    return float(page_count) * COMPLEXITY_MULTIPLIERS[project.complexity]


def calculate_task_load(task_type: TaskType, project_load: float) -> float:
    return project_load * TASK_TYPE_MULTIPLIERS[task_type]


def _load_map_for_employees(
    session: Session,
    employees: Sequence[Employee],
) -> dict[uuid.UUID, float]:
    employee_ids = [employee.id for employee in employees]
    loads = {employee.id: 0.0 for employee in employees}
    if not employee_ids:
        return loads

    tasks = session.exec(
        select(Task).where(
            Task.assignee_id.in_(employee_ids),
            Task.status != Task.Status.COMPLETED,
        )
    ).all()

    project_ids = [task.parent_project_id for task in tasks if task.parent_project_id is not None]
    project_map: dict[uuid.UUID, Project] = {}
    if project_ids:
        projects = session.exec(select(Project).where(Project.id.in_(project_ids))).all()
        project_map = {project.id: project for project in projects}

    project_load_map = {
        project_id: calculate_project_load(project)
        for project_id, project in project_map.items()
    }

    for task in tasks:
        if not task.assignee_id or not task.parent_project_id:
            continue
        project_load = project_load_map.get(task.parent_project_id)
        if project_load is None:
            continue
        loads[task.assignee_id] += calculate_task_load(task.task_type, project_load)

    return loads


def _average_load(employees: Sequence[Employee], load_map: dict[uuid.UUID, float]) -> float | None:
    if not employees:
        return None
    return sum(load_map.get(employee.id, 0.0) for employee in employees) / len(employees)


def _least_loaded_employee(
    employees: Sequence[Employee],
    load_map: dict[uuid.UUID, float],
) -> Employee | None:
    if not employees:
        return None

    return min(
        employees,
        key=lambda employee: (
            load_map.get(employee.id, 0.0),
            employee.name,
            employee.username,
        ),
    )


def _employees_by_designations(
    session: Session,
    designations: set[Designation],
) -> list[Employee]:
    if not designations:
        return []
    return session.exec(select(Employee).where(Employee.designation.in_(designations))).all()


def _candidate_employees_for_task_type(
    session: Session,
    project: Project,
    task_type: TaskType,
    load_map: dict[uuid.UUID, float] | None = None,
) -> list[Employee]:
    if task_type == TaskType.FINISHING:
        return _employees_by_designations(session, {Designation.PAINTER})

    if task_type in {TaskType.ASSEMBLY, TaskType.DISASSEMBLY}:
        if project.complexity == Complexity.COMPLEX:
            return _employees_by_designations(session, {Designation.SENIOR_CARPENTER})
        return _employees_by_designations(session, CARPENTER_DESIGNATIONS)

    if task_type != TaskType.CUTTING:
        return []

    cncs = _employees_by_designations(session, {Designation.CNC_MACHINIST})
    seniors = _employees_by_designations(session, {Designation.SENIOR_CARPENTER})
    carpenters = _employees_by_designations(session, CARPENTER_DESIGNATIONS)

    working_load_map = load_map
    if working_load_map is None:
        combined = list({employee.id: employee for employee in [*cncs, *seniors, *carpenters]}.values())
        working_load_map = _load_map_for_employees(session, combined)

    avg_cnc = _average_load(cncs, working_load_map)
    avg_senior = _average_load(seniors, working_load_map)
    avg_carpenter = _average_load(carpenters, working_load_map)

    if project.complexity == Complexity.SIMPLE:
        return carpenters

    if project.complexity == Complexity.COMPLEX:
        if (
            avg_cnc is not None
            and avg_senior is not None
            and avg_cnc > (1.5 * avg_senior)
            and seniors
        ):
            return seniors

    if project.complexity in {Complexity.NORMAL, Complexity.COMPLEX}:
        if (
            avg_cnc is not None
            and avg_carpenter is not None
            and avg_cnc > (1.5 * avg_carpenter)
            and carpenters
        ):
            return carpenters

    return cncs or seniors or carpenters


def _balance_score(load_map: dict[uuid.UUID, float], employee_ids: Sequence[uuid.UUID]) -> float:
    if not employee_ids:
        return 0.0
    loads = [load_map.get(employee_id, 0.0) for employee_id in employee_ids]
    average = sum(loads) / len(loads)
    return sum((load - average) ** 2 for load in loads)


def _rebalance_move_improves(
    load_map: dict[uuid.UUID, float],
    *,
    current_assignee_id: uuid.UUID,
    new_assignee_id: uuid.UUID,
    task_load: float,
    candidate_ids: Sequence[uuid.UUID],
) -> bool:
    if current_assignee_id == new_assignee_id:
        return False

    before_score = _balance_score(load_map, candidate_ids)
    simulated_load_map = dict(load_map)
    simulated_load_map[current_assignee_id] = (
        simulated_load_map.get(current_assignee_id, 0.0) - task_load
    )
    simulated_load_map[new_assignee_id] = simulated_load_map.get(new_assignee_id, 0.0) + task_load
    after_score = _balance_score(simulated_load_map, candidate_ids)
    return after_score + 1e-9 < before_score


def choose_cutting_assignee(session: Session, project: Project) -> Employee | None:
    employees = session.exec(select(Employee)).all()
    load_map = _load_map_for_employees(session, employees)
    candidates = _candidate_employees_for_task_type(
        session,
        project,
        TaskType.CUTTING,
        load_map,
    )
    return _least_loaded_employee(candidates, load_map)


def choose_follow_up_assignee(
    session: Session,
    project: Project,
    task_type: TaskType,
) -> Employee | None:
    employees = session.exec(select(Employee)).all()
    load_map = _load_map_for_employees(session, employees)
    candidates = _candidate_employees_for_task_type(session, project, task_type, load_map)
    return _least_loaded_employee(candidates, load_map)


def build_workflow_task(
    project: Project,
    task_type: TaskType,
    assignee: Employee | None,
) -> Task:
    return Task(
        title=f"{project.name} - {TASK_TITLE[task_type]}",
        notes=f"Automatically generated {TASK_TITLE[task_type].lower()} task.",
        task_type=task_type,
        urgency=project.urgency,
        deadline=project.deadline,
        status=Task.Status.POSTED,
        parent_project_id=project.id,
        assignee_id=assignee.id if assignee else None,
        complexity=project.complexity,
    )


def maybe_build_follow_up_task(session: Session, completed_task: Task) -> Task | None:
    next_task_type = FOLLOW_UP_TASK_TYPE.get(completed_task.task_type)
    if not next_task_type or not completed_task.parent_project_id:
        return None

    project = session.get(Project, completed_task.parent_project_id)
    if not project:
        return None

    existing_next = session.exec(
        select(Task).where(
            Task.parent_project_id == project.id,
            Task.task_type == next_task_type,
        )
    ).first()
    if existing_next:
        return None

    assignee = choose_follow_up_assignee(session, project, next_task_type)
    return build_workflow_task(project, next_task_type, assignee)


def rebalance_open_tasks(session: Session) -> bool:
    open_tasks = session.exec(
        select(Task).where(
            Task.status != Task.Status.COMPLETED,
            Task.parent_project_id.is_not(None),
        )
    ).all()
    if not open_tasks:
        return False

    project_ids = [task.parent_project_id for task in open_tasks if task.parent_project_id is not None]
    projects = session.exec(select(Project).where(Project.id.in_(project_ids))).all()
    project_map = {project.id: project for project in projects}
    if not project_map:
        return False

    employees = session.exec(select(Employee)).all()
    load_map = _load_map_for_employees(session, employees)
    project_load_map = {
        project_id: calculate_project_load(project)
        for project_id, project in project_map.items()
    }

    ranked_tasks: list[tuple[Task, Project, float]] = []
    for task in open_tasks:
        if not task.parent_project_id:
            continue
        project = project_map.get(task.parent_project_id)
        if not project:
            continue
        ranked_tasks.append(
            (task, project, calculate_task_load(task.task_type, project_load_map[project.id]))
        )

    ranked_tasks.sort(key=lambda item: item[2], reverse=True)

    changed = False
    for task, project, task_load in ranked_tasks:
        candidates = _candidate_employees_for_task_type(
            session,
            project,
            task.task_type,
            load_map,
        )
        if not candidates:
            continue

        candidate_ids = [candidate.id for candidate in candidates]
        least_loaded_candidate = _least_loaded_employee(candidates, load_map)
        if least_loaded_candidate is None:
            continue

        if task.assignee_id is None:
            task.assignee_id = least_loaded_candidate.id
            session.add(task)
            load_map[least_loaded_candidate.id] = (
                load_map.get(least_loaded_candidate.id, 0.0) + task_load
            )
            changed = True
            continue

        if task.assignee_id not in candidate_ids:
            previous_assignee_id = task.assignee_id
            task.assignee_id = least_loaded_candidate.id
            session.add(task)
            load_map[previous_assignee_id] = load_map.get(previous_assignee_id, 0.0) - task_load
            load_map[least_loaded_candidate.id] = (
                load_map.get(least_loaded_candidate.id, 0.0) + task_load
            )
            changed = True
            continue

        if _rebalance_move_improves(
            load_map,
            current_assignee_id=task.assignee_id,
            new_assignee_id=least_loaded_candidate.id,
            task_load=task_load,
            candidate_ids=candidate_ids,
        ):
            previous_assignee_id = task.assignee_id
            task.assignee_id = least_loaded_candidate.id
            session.add(task)
            load_map[previous_assignee_id] = load_map.get(previous_assignee_id, 0.0) - task_load
            load_map[least_loaded_candidate.id] = (
                load_map.get(least_loaded_candidate.id, 0.0) + task_load
            )
            changed = True

    return changed