from app.models import LogActionType, LogEntityType, LogEntry


def create_log_entry(
    *,
    entity_type: LogEntityType,
    entity_id,
    action: LogActionType,
    field_name: str,
    message: str,
    old_value: str | None = None,
    new_value: str | None = None,
    project_id=None,
    task_id=None,
    actor_employee_id=None,
) -> LogEntry:
    return LogEntry(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        message=message,
        project_id=project_id,
        task_id=task_id,
        actor_employee_id=actor_employee_id,
    )