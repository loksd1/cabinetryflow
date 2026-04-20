from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import case
from sqlmodel import Session, SQLModel, Field, select

from app.api.deps import AdminEmployee, CurrentEmployee, SessionDep, TaskCreatorEmployee
from app.models import (
    Complexity,
    Employee,
    LogActionType,
    LogEntityType,
    Project,
    Task,
    TaskType,
    Urgency,
)
from app.services.logs import create_log_entry
from app.services.workflow import maybe_build_follow_up_task, rebalance_open_tasks


router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskBase(SQLModel):
    title: str = Field(max_length=255)
    notes: str | None = None
    task_type: TaskType = TaskType.OTHER
    urgency: Urgency = Urgency.NORMAL
    deadline: Any | None = None
    files: list[str] = []
    photos: list[str] | None = None
    status: Task.Status = Task.Status.POSTED


class TaskCreate(TaskBase):
    parent_project_id: str
    assignee_id: str | None = None


class TaskUpdate(SQLModel):
    title: str | None = None
    notes: str | None = None
    task_type: TaskType | None = None
    urgency: Urgency | None = None
    deadline: Any | None = None
    files: list[str] | None = None
    photos: list[str] | None = None
    status: Task.Status | None = None
    assignee_id: str | None = None


class TaskProjectPublic(SQLModel):
    id: str
    name: str
    notes: str | None = None
    urgency: Urgency
    complexity: Complexity
    technical_drawing: str | None = None
    three_d_model: str | None = None
    misc_files: list[str] = []
    completed: bool
    deadline: Any


class TaskPublic(TaskBase):
    id: str
    parent_project_id: str | None
    assignee_id: str | None
    assignee_name: str | None = None
    parent_project: TaskProjectPublic | None = None


def _project_to_public(project: Project) -> TaskProjectPublic:
    return TaskProjectPublic(
        id=str(project.id),
        name=project.name,
        notes=project.notes,
        urgency=project.urgency,
        complexity=project.complexity,
        technical_drawing=project.technical_drawing,
        three_d_model=project.three_d_model,
        misc_files=project.misc_files,
        completed=project.completed,
        deadline=project.deadline,
    )


def _task_to_public(task: Task) -> TaskPublic:
    return TaskPublic(
        id=str(task.id),
        title=task.title,
        notes=task.notes,
        task_type=task.task_type,
        urgency=task.urgency,
        deadline=task.deadline,
        files=task.files,
        photos=task.photos,
        status=task.status,
        parent_project_id=str(task.parent_project_id) if task.parent_project_id else None,
        assignee_id=str(task.assignee_id) if task.assignee_id else None,
        assignee_name=task.assignee.name if task.assignee else None,
        parent_project=_project_to_public(task.parent_project)
        if task.parent_project
        else None,
    )


@router.post("/", response_model=TaskPublic, status_code=status.HTTP_201_CREATED)
def create_task(
    *,
    session: SessionDep,
    task_in: TaskCreate,
    current: TaskCreatorEmployee,
) -> TaskPublic:
    project = session.get(Project, task_in.parent_project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Parent project not found")

    assignee: Employee | None = None
    if task_in.assignee_id:
        assignee = session.get(Employee, task_in.assignee_id)
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")

    task = Task(
        title=task_in.title,
        notes=task_in.notes,
        task_type=task_in.task_type,
        urgency=task_in.urgency,
        deadline=task_in.deadline,
        files=task_in.files,
        photos=task_in.photos,
        status=task_in.status,
        parent_project_id=project.id,
        assignee_id=assignee.id if assignee else None,
        complexity=project.complexity,
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    if assignee:
        session.add(
            create_log_entry(
                entity_type=LogEntityType.TASK,
                entity_id=task.id,
                action=LogActionType.TASK_ASSIGNED,
                field_name="assignee_id",
                old_value=None,
                new_value=str(assignee.id),
                message=f"Task assigned to {assignee.name}",
                project_id=project.id,
                task_id=task.id,
                actor_employee_id=current.id,
            )
        )
        session.commit()

    return _task_to_public(task)


@router.get("/", response_model=list[TaskPublic])
def list_all_tasks(session: SessionDep, _: AdminEmployee) -> list[TaskPublic]:
    tasks = session.exec(
        select(Task)
        .where(Task.status != Task.Status.COMPLETED)
        .order_by(
            case((Task.deadline.is_(None), 1), else_=0),
            Task.deadline,
            Task.title,
        )
    ).all()
    return [_task_to_public(t) for t in tasks]


@router.get("/mine", response_model=list[TaskPublic])
def list_my_tasks(session: SessionDep, current: CurrentEmployee) -> list[TaskPublic]:
    tasks = session.exec(
        select(Task)
        .where(
            Task.assignee_id == current.id,
            Task.status != Task.Status.COMPLETED,
        )
        .order_by(
            case((Task.deadline.is_(None), 1), else_=0),
            Task.deadline,
            Task.title,
        )
    ).all()
    return [_task_to_public(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskPublic)
def read_task(task_id: str, session: SessionDep, current: CurrentEmployee) -> TaskPublic:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if (
        current.designation is not current.designation.__class__.ADMIN
        and task.assignee_id != current.id
    ):
        raise HTTPException(status_code=403, detail="Not allowed to view this task")

    return _task_to_public(task)


@router.patch("/{task_id}", response_model=TaskPublic)
def update_task(
    task_id: str,
    *,
    session: SessionDep,
    task_in: TaskUpdate,
    current: CurrentEmployee,
) -> TaskPublic:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    is_task_creator = current.designation in {
        current.designation.__class__.ADMIN,
        current.designation.__class__.SENIOR_CARPENTER,
        current.designation.__class__.CNC_MACHINIST,
    }

    update_data = task_in.model_dump(exclude_unset=True)
    previous_status = task.status
    previous_assignee_id = task.assignee_id
    previous_assignee_name = task.assignee.name if task.assignee else None

    if not is_task_creator:
        if task.assignee_id != current.id:
            raise HTTPException(status_code=403, detail="Not allowed to modify this task")
        allowed_fields = {"notes", "status"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}

    if "assignee_id" in update_data and update_data["assignee_id"] is not None:
        new_assignee = session.get(Employee, update_data["assignee_id"])
        if not new_assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")

    for field, value in update_data.items():
        setattr(task, field, value)

    session.add(task)
    session.commit()
    session.refresh(task)

    log_entries_added = False

    if previous_status != task.status:
        session.add(
            create_log_entry(
                entity_type=LogEntityType.TASK,
                entity_id=task.id,
                action=LogActionType.STATUS_UPDATED,
                field_name="status",
                old_value=previous_status.value,
                new_value=task.status.value,
                message=f"Task status changed from {previous_status.value} to {task.status.value}",
                project_id=task.parent_project_id,
                task_id=task.id,
                actor_employee_id=current.id,
            )
        )
        log_entries_added = True

    if previous_assignee_id != task.assignee_id:
        new_assignee_name = task.assignee.name if task.assignee else None
        assignment_message = (
            f"Task assigned to {new_assignee_name}"
            if new_assignee_name
            else "Task unassigned"
        )
        session.add(
            create_log_entry(
                entity_type=LogEntityType.TASK,
                entity_id=task.id,
                action=LogActionType.TASK_ASSIGNED,
                field_name="assignee_id",
                old_value=str(previous_assignee_id) if previous_assignee_id else None,
                new_value=str(task.assignee_id) if task.assignee_id else None,
                message=assignment_message,
                project_id=task.parent_project_id,
                task_id=task.id,
                actor_employee_id=current.id,
            )
        )
        log_entries_added = True

    if previous_status != Task.Status.COMPLETED and task.status == Task.Status.COMPLETED:
        follow_up_task = maybe_build_follow_up_task(session, task)
        if follow_up_task:
            session.add(follow_up_task)
        if follow_up_task or rebalance_open_tasks(session) or log_entries_added:
            session.commit()
    elif log_entries_added:
        session.commit()

    return _task_to_public(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, session: SessionDep, _: TaskCreatorEmployee) -> None:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    session.delete(task)
    session.commit()
