from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import Field, SQLModel, select

from app.api.deps import AdminEmployee, CurrentEmployee, SessionDep
from app.models import (
    Complexity,
    LogActionType,
    LogEntityType,
    Project,
    TaskType,
    Urgency,
)
from app.services.logs import create_log_entry
from app.services.workflow import (
    build_workflow_task,
    calculate_project_load,
    choose_cutting_assignee,
)


router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectBase(SQLModel):
    name: str = Field(max_length=255)
    notes: str | None = None
    urgency: Urgency = Urgency.NORMAL
    complexity: Complexity = Complexity.NORMAL
    technical_drawing: str | None = Field(
        default=None,
        max_length=1024,
        description="Path or URL to the technical drawing PDF file.",
    )
    three_d_model: str | None = Field(
        default=None,
        max_length=1024,
        description="Link to a 3D model resource.",
    )
    misc_files: list[str] = []


class ProjectCreate(ProjectBase):
    deadline: Any | None = None


class ProjectUpdate(SQLModel):
    name: str | None = None
    notes: str | None = None
    urgency: Urgency | None = None
    complexity: Complexity | None = None
    technical_drawing: str | None = None
    three_d_model: str | None = None
    misc_files: list[str] | None = None
    deadline: Any | None = None
    completed: bool | None = None


class ProjectPublic(ProjectBase):
    id: str
    completed: bool
    deadline: Any


@router.post("/", response_model=ProjectPublic, status_code=status.HTTP_201_CREATED)
def create_project(
    *, session: SessionDep, project_in: ProjectCreate, _: AdminEmployee
) -> ProjectPublic:
    project = Project(
        name=project_in.name,
        notes=project_in.notes,
        urgency=project_in.urgency,
        complexity=project_in.complexity,
        technical_drawing=project_in.technical_drawing,
        three_d_model=project_in.three_d_model,
        misc_files=project_in.misc_files,
        deadline=project_in.deadline or Project.model_fields["deadline"].default_factory(),
    )

    try:
        calculate_project_load(project, strict=True)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="A readable technical drawing PDF is required to create a project",
        ) from exc

    session.add(project)

    cutting_assignee = choose_cutting_assignee(session, project)
    session.add(build_workflow_task(project, TaskType.CUTTING, cutting_assignee))

    session.commit()
    session.refresh(project)

    return ProjectPublic(
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


@router.get("/", response_model=list[ProjectPublic])
def list_projects(session: SessionDep, _: CurrentEmployee) -> list[ProjectPublic]:
    projects = session.exec(select(Project)).all()
    return [
        ProjectPublic(
            id=str(p.id),
            name=p.name,
            notes=p.notes,
            urgency=p.urgency,
            complexity=p.complexity,
            technical_drawing=p.technical_drawing,
            three_d_model=p.three_d_model,
            misc_files=p.misc_files,
            completed=p.completed,
            deadline=p.deadline,
        )
        for p in projects
    ]


@router.get("/{project_id}", response_model=ProjectPublic)
def read_project(project_id: str, session: SessionDep, _: CurrentEmployee) -> ProjectPublic:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectPublic(
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


@router.patch("/{project_id}", response_model=ProjectPublic)
def update_project(
    project_id: str,
    *,
    session: SessionDep,
    project_in: ProjectUpdate,
    current: AdminEmployee,
) -> ProjectPublic:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_in.model_dump(exclude_unset=True)
    previous_completed = project.completed

    for field, value in update_data.items():
        setattr(project, field, value)

    session.add(project)
    session.commit()
    session.refresh(project)

    if previous_completed != project.completed:
        session.add(
            create_log_entry(
                entity_type=LogEntityType.PROJECT,
                entity_id=project.id,
                action=LogActionType.STATUS_UPDATED,
                field_name="completed",
                old_value=str(previous_completed),
                new_value=str(project.completed),
                message=(
                    "Project marked completed"
                    if project.completed
                    else "Project reopened"
                ),
                project_id=project.id,
                actor_employee_id=current.id,
            )
        )
        session.commit()

    return ProjectPublic(
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


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, session: SessionDep, _: AdminEmployee) -> None:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    session.delete(project)
    session.commit()
