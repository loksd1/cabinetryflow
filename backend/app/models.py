import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, JSON
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class Designation(str, Enum):
    SENIOR_CARPENTER = "Senior Carpenter"
    MIDDLE_CARPENTER = "Middle Carpenter"
    JUNIOR_CARPENTER = "Junior Carpenter"
    PAINTER = "Painter"
    CNC_MACHINIST = "CNC Machinist"
    ADMIN = "Admin"


class Language(str, Enum):
    EN = "EN"
    TK = "TK"
    RU = "RU"
    UZ = "UZ"


class Urgency(str, Enum):
    EXTREMELY_URGENT = "EXTREMELY_URGENT"
    URGENT = "URGENT"
    NORMAL = "NORMAL"
    LOW = "LOW"


class Complexity(str, Enum):
    SIMPLE = "SIMPLE"
    NORMAL = "NORMAL"
    COMPLEX = "COMPLEX"


class Employee(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
    )
    name: str = Field(max_length=255)
    username: str = Field(max_length=255, unique=True, index=True)
    password: str = Field(max_length=255, description="Plaintext password for local use.")
    designation: Designation = Field(index=True)
    notes: str | None = Field(default=None)
    language: Language = Field(default=Language.EN, index=True)
    active: bool = Field(default=True, index=True)

    tasks: list["Task"] = Relationship(back_populates="assignee")


class Project(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
    )
    name: str = Field(max_length=255)
    notes: str | None = Field(default=None)

    deadline: datetime = Field(
        sa_type=DateTime(timezone=True),
        default_factory=get_datetime_utc,
    )

    urgency: Urgency = Field(default=Urgency.NORMAL, index=True)

    complexity: Complexity = Field(default=Complexity.NORMAL, index=True)

    technical_drawing: str | None = Field(
        default=None,
        description="Path or URL to the technical drawing PDF file.",
        max_length=1024,
    )

    tasks: list["Task"] = Relationship(back_populates="parent_project")

    three_d_model: str | None = Field(
        default=None,
        description="Link to a 3D model resource.",
        max_length=1024,
    )

    misc_files: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
        description="List of links or paths to miscellaneous files.",
    )

    completed: bool = Field(default=False, index=True)


class TaskType(str, Enum):
    CUTTING = "CUTTING"
    ASSEMBLY = "ASSEMBLY"
    DISASSEMBLY = "DISASSEMBLY"
    FINISHING = "FINISHING"
    OTHER = "OTHER"


class Task(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
    )
    title: str = Field(max_length=255)
    notes: str | None = Field(default=None)

    assignee_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="employee.id",
        description="Employee responsible for this task.",
    )
    parent_project_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="project.id",
        description="Project this task belongs to (optional).",
    )

    files: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
        description="List of links to files related to the task.",
    )
    photos: list[str] | None = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
        description="Optional list of links to photos for this task.",
    )

    deadline: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )

    urgency: Urgency = Field(default=Urgency.NORMAL, index=True)

    complexity: Complexity = Field(default=Complexity.NORMAL, index=True)

    task_type: TaskType = Field(
        default=TaskType.OTHER,
        description=(
            "Type of task: CUTTING, ASSEMBLY, DISASSEMBLY, FINISHING, OTHER."
        ),
        index=True,
    )

    class Status(str, Enum):
        POSTED = "POSTED"
        IN_PROGRESS = "IN_PROGRESS"
        WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
        WAITING_FOR_SUPPLY = "WAITING_FOR_SUPPLY"
        COMPLETED = "COMPLETED"

    status: "Task.Status" = Field(
        default="POSTED",
        description=(
            "Status of the task: POSTED, IN_PROGRESS, WAITING_FOR_APPROVAL, "
            "WAITING_FOR_SUPPLY, COMPLETED."
        ),
        index=True,
    )

    assignee: Employee | None = Relationship(back_populates="tasks")
    parent_project: Project | None = Relationship(back_populates="tasks")


class LogEntityType(str, Enum):
    PROJECT = "PROJECT"
    TASK = "TASK"


class LogActionType(str, Enum):
    STATUS_UPDATED = "STATUS_UPDATED"
    TASK_ASSIGNED = "TASK_ASSIGNED"


class LogEntry(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
    )
    created_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        default_factory=get_datetime_utc,
        index=True,
    )
    entity_type: LogEntityType = Field(index=True)
    entity_id: uuid.UUID = Field(index=True)
    action: LogActionType = Field(index=True)
    field_name: str = Field(max_length=64)
    old_value: str | None = Field(default=None, max_length=255)
    new_value: str | None = Field(default=None, max_length=255)
    message: str = Field(max_length=1024)
    project_id: uuid.UUID | None = Field(default=None, index=True)
    task_id: uuid.UUID | None = Field(default=None, index=True)
    actor_employee_id: uuid.UUID | None = Field(default=None, index=True)

