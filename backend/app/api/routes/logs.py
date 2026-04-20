from fastapi import APIRouter
from sqlmodel import SQLModel, select

from app.api.deps import AdminEmployee, SessionDep
from app.models import Employee, LogEntry


router = APIRouter(prefix="/logs", tags=["logs"])


class LogEntryPublic(SQLModel):
    id: str
    created_at: str
    entity_type: str
    entity_id: str
    action: str
    field_name: str
    old_value: str | None = None
    new_value: str | None = None
    message: str
    project_id: str | None = None
    task_id: str | None = None
    actor_employee_id: str | None = None
    actor_employee_name: str | None = None


@router.get("/", response_model=list[LogEntryPublic])
def list_logs(session: SessionDep, _: AdminEmployee) -> list[LogEntryPublic]:
    entries = session.exec(select(LogEntry).order_by(LogEntry.created_at.desc())).all()
    result: list[LogEntryPublic] = []

    for entry in entries:
        actor = session.get(Employee, entry.actor_employee_id) if entry.actor_employee_id else None
        result.append(
            LogEntryPublic(
                id=str(entry.id),
                created_at=entry.created_at.isoformat(),
                entity_type=entry.entity_type.value,
                entity_id=str(entry.entity_id),
                action=entry.action.value,
                field_name=entry.field_name,
                old_value=entry.old_value,
                new_value=entry.new_value,
                message=entry.message,
                project_id=str(entry.project_id) if entry.project_id else None,
                task_id=str(entry.task_id) if entry.task_id else None,
                actor_employee_id=str(entry.actor_employee_id)
                if entry.actor_employee_id
                else None,
                actor_employee_name=actor.name if actor else None,
            )
        )

    return result