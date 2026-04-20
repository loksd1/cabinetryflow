import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { BookText, ClipboardList, FolderKanban, LogOut, Plus, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { DataTable } from "@/components/Common/DataTable"
import { LanguageSwitcher } from "@/components/Common/LanguageSwitcher"
import { PdfViewer } from "@/components/Common/PdfViewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import i18n, {
  getCurrentLocale,
  translateComplexity,
  translateDesignation,
  translateLanguageCode,
  translateLogActionType,
  translateLogEntityType,
  translateLogFieldName,
  translateLogMessage,
  translateTaskStatus,
  translateTaskType,
  translateUrgency,
} from "@/i18n"
import {
  api,
  type ComplexityLevel,
  type Designation,
  type EmployeeLanguage,
  type EmployeeSummary,
  type LogEntrySummary,
  type ProjectSummary,
  type TaskStatus,
  type TaskSummary,
  type TaskType,
  type UrgencyLevel,
  resolveAssetUrl,
  uploadFile,
} from "@/lib/api"
import { getErrorMessage } from "@/utils"

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return i18n.t("common.noDeadline")
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return i18n.t("common.noDeadline")

  return new Intl.DateTimeFormat(getCurrentLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const DEFAULT_DEADLINE_TIME = "17:00"
type TaskSortField = "deadline" | "task_type" | "assignee_name"
type SortDirection = "asc" | "desc"

const compareNullableDateStrings = (left?: string | null, right?: string | null) => {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1

  return new Date(left).getTime() - new Date(right).getTime()
}

const compareText = (left?: string | null, right?: string | null) => {
  const leftValue = (left ?? "").trim()
  const rightValue = (right ?? "").trim()

  if (!leftValue && !rightValue) return 0
  if (!leftValue) return 1
  if (!rightValue) return -1

  return leftValue.localeCompare(rightValue, getCurrentLocale(), {
    sensitivity: "base",
  })
}

const sortTasks = (
  tasks: TaskSummary[],
  field: TaskSortField,
  direction: SortDirection = "asc",
) => {
  const sorted = [...tasks].sort((left, right) => {
    let result = 0

    if (field === "deadline") {
      result = compareNullableDateStrings(left.deadline, right.deadline)
    } else if (field === "task_type") {
      result = compareText(left.task_type, right.task_type)
      if (result === 0) {
        result = compareNullableDateStrings(left.deadline, right.deadline)
      }
    } else {
      result = compareText(left.assignee_name, right.assignee_name)
      if (result === 0) {
        result = compareNullableDateStrings(left.deadline, right.deadline)
      }
    }

    if (result === 0) {
      result = compareText(left.title, right.title)
    }

    return direction === "desc" ? -result : result
  })

  return sorted
}

function DeadlineField({
  value,
  onChange,
  label = i18n.t("common.deadline"),
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  const [datePart, setDatePart] = useState("")
  const [timePart, setTimePart] = useState(DEFAULT_DEADLINE_TIME)

  useEffect(() => {
    if (!value) {
      setDatePart("")
      setTimePart(DEFAULT_DEADLINE_TIME)
      return
    }

    setDatePart(value.slice(0, 10))
    setTimePart(value.slice(11, 16) || DEFAULT_DEADLINE_TIME)
  }, [value])

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Input
          type="date"
          value={datePart}
          onChange={(e) => {
            const nextDate = e.target.value
            setDatePart(nextDate)
            if (!nextDate) {
              setTimePart(DEFAULT_DEADLINE_TIME)
              onChange("")
              return
            }
            onChange(`${nextDate}T${timePart || DEFAULT_DEADLINE_TIME}`)
          }}
        />
        <Input
          type="time"
          value={timePart}
          disabled={!datePart}
          onChange={(e) => {
            const nextTime = e.target.value || DEFAULT_DEADLINE_TIME
            setTimePart(nextTime)
            if (!datePart) return
            onChange(`${datePart}T${nextTime}`)
          }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {i18n.t("app.deadlineHelp")}
      </p>
    </div>
  )
}

export const Route = createFileRoute("/app")({
  component: AppPage,
  head: () => ({
    meta: [
      {
        title: i18n.t("app.metaTitle"),
      },
    ],
  }),
  beforeLoad: () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null
    if (!token) {
      throw redirect({ to: "/" })
    }
  },
})

function AppPage() {
  const { t } = useTranslation()
  const { user, designation, isAdmin, canManageTasks, logout } = useAuth()
  const queryClient = useQueryClient()
  const [adminTaskSortField, setAdminTaskSortField] =
    useState<TaskSortField>("deadline")
  const [adminTaskSortDirection, setAdminTaskSortDirection] =
    useState<SortDirection>("asc")

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get<EmployeeSummary[]>("/employees/")
      return res.data
    },
    enabled: canManageTasks,
  })

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ProjectSummary[]>("/projects/")
      return res.data
    },
    enabled: !!user,
  })

  const tasksAllQuery = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const res = await api.get<TaskSummary[]>("/tasks/")
      return res.data
    },
    enabled: isAdmin,
  })

  const tasksMineQuery = useQuery({
    queryKey: ["tasks", "mine"],
    queryFn: async () => {
      const res = await api.get<TaskSummary[]>("/tasks/mine")
      return res.data
    },
  })

  const logsQuery = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await api.get<LogEntrySummary[]>("/logs/")
      return res.data
    },
    enabled: isAdmin,
  })

  const sortedAllTasks = useMemo(
    () =>
      sortTasks(
        tasksAllQuery.data ?? [],
        adminTaskSortField,
        adminTaskSortDirection,
      ),
    [adminTaskSortDirection, adminTaskSortField, tasksAllQuery.data],
  )

  const sortedMyTasks = useMemo(
    () => sortTasks(tasksMineQuery.data ?? [], "deadline", "asc"),
    [tasksMineQuery.data],
  )

  const logColumns = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: t("logs.headers.time"),
        cell: ({ row }: { row: { original: LogEntrySummary } }) =>
          formatDateTime(row.original.created_at),
      },
      {
        accessorKey: "entity_type",
        header: t("logs.headers.entity"),
        cell: ({ row }: { row: { original: LogEntrySummary } }) =>
          translateLogEntityType(row.original.entity_type),
      },
      {
        accessorKey: "action",
        header: t("logs.headers.action"),
        cell: ({ row }: { row: { original: LogEntrySummary } }) =>
          translateLogActionType(row.original.action),
      },
      {
        accessorKey: "field_name",
        header: t("logs.headers.field"),
        cell: ({ row }: { row: { original: LogEntrySummary } }) =>
          translateLogFieldName(row.original.field_name),
      },
      {
        accessorKey: "message",
        header: t("logs.headers.message"),
        cell: ({ row }: { row: { original: LogEntrySummary } }) => (
          <div className="max-w-[28rem] whitespace-normal text-xs leading-relaxed">
            {translateLogMessage({
              action: row.original.action,
              message: row.original.message,
              oldValue: row.original.old_value,
              newValue: row.original.new_value,
            })}
          </div>
        ),
      },
      {
        accessorKey: "actor_employee_name",
        header: t("logs.headers.actor"),
        cell: ({ row }: { row: { original: LogEntrySummary } }) =>
          row.original.actor_employee_name ?? t("common.system"),
      },
    ],
    [t],
  )

  const [activeTab, setActiveTab] = useState<string>(
    isAdmin ? "tasks" : "my-tasks",
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex flex-col gap-4 border-b px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            CabinetryFlow
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            {t("common.workspace")}
          </h1>
        </div>
        <div className="flex w-full items-start justify-between gap-3 sm:w-auto sm:items-center sm:justify-end">
          {user && (
            <div className="flex min-w-0 flex-col leading-tight sm:items-end">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                {isAdmin && designation && (
                  <Badge variant="outline">{translateDesignation(designation)}</Badge>
                )}
              </span>
            </div>
          )}
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon-sm"
            className="border border-border/60"
            onClick={logout}
            aria-label={t("common.logout")}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 lg:w-fit">
            {isAdmin && <TabsTrigger value="tasks">{t("app.tabs.tasks")}</TabsTrigger>}
            <TabsTrigger value="projects">{t("app.tabs.projects")}</TabsTrigger>
            {isAdmin && <TabsTrigger value="team">{t("app.tabs.team")}</TabsTrigger>}
            {isAdmin && <TabsTrigger value="logs">{t("app.tabs.logs")}</TabsTrigger>}
            <TabsTrigger value="my-tasks">{t("app.tabs.myTasks")}</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="tasks" className="space-y-4">
              <Card className="p-4 md:p-5 bg-muted/30">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                      {t("app.allTasks")}
                    </h2>
                  </div>
                  <CreateTaskButton
                    employees={employeesQuery.data ?? []}
                    projects={projectsQuery.data ?? []}
                    onCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ["tasks"] })
                      queryClient.invalidateQueries({
                        queryKey: ["tasks", "mine"],
                      })
                    }}
                  />
                </div>
                <div className="mb-4 flex flex-col gap-2 rounded-md border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    {t("app.sortTasksHint")}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={adminTaskSortField}
                      onValueChange={(value) =>
                        setAdminTaskSortField(value as TaskSortField)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[13rem]">
                        <SelectValue placeholder={t("common.sortBy")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadline">{t("app.sortField.deadline")}</SelectItem>
                        <SelectItem value="task_type">{t("app.sortField.taskType")}</SelectItem>
                        <SelectItem value="assignee_name">{t("app.sortField.assignee")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        setAdminTaskSortDirection((current) =>
                          current === "asc" ? "desc" : "asc",
                        )
                      }
                    >
                      {adminTaskSortDirection === "asc"
                        ? t("common.ascending")
                        : t("common.descending")}
                    </Button>
                  </div>
                </div>
                <TasksList
                  loading={tasksAllQuery.isLoading}
                  tasks={sortedAllTasks}
                  compact={false}
                  allowManageFields
                />
              </Card>
            </TabsContent>
          )}

          <TabsContent value="projects">
            <Card className="p-4 md:p-5 bg-muted/30">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                    {t("app.projectsHeading")}
                  </h2>
                </div>
                {isAdmin && (
                  <CreateProjectButton
                    onCreated={() =>
                      queryClient.invalidateQueries({ queryKey: ["projects"] })
                    }
                  />
                )}
              </div>
              <ProjectsPanel
                loading={projectsQuery.isLoading}
                projects={projectsQuery.data ?? []}
              />
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team">
              <Card className="p-4 md:p-5 border-dashed bg-muted/40">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                      {t("app.teamHeading")}
                    </h2>
                  </div>
                  <CreateEmployeeButton
                    onChanged={() =>
                      queryClient.invalidateQueries({ queryKey: ["employees"] })
                    }
                  />
                </div>
                <EmployeesPanel
                  loading={employeesQuery.isLoading}
                  employees={employeesQuery.data ?? []}
                />
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="logs">
              <Card className="p-4 md:p-5 bg-muted/30">
                <div className="mb-3 flex items-center gap-2">
                  <BookText className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                    {t("app.activityLogs")}
                  </h2>
                </div>
                {logsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">{t("app.loading.logs")}</p>
                ) : (
                  <DataTable columns={logColumns} data={logsQuery.data ?? []} />
                )}
              </Card>
            </TabsContent>
          )}

          <TabsContent value="my-tasks">
            <Card className="p-4 md:p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                    {t("app.tabs.myTasks")}
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground sm:text-right">
                  {t("app.myTasksHint")}
                </span>
              </div>
              <TasksList
                loading={tasksMineQuery.isLoading}
                tasks={sortedMyTasks}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}

function EmployeesPanel({
  employees,
  loading,
}: {
  employees: EmployeeSummary[]
  loading: boolean
}) {
  if (loading)
    return <p className="text-xs text-muted-foreground">{i18n.t("app.loading.team")}</p>
  if (!employees.length)
    return <p className="text-xs text-muted-foreground">{i18n.t("app.empty.employees")}</p>

  return (
    <div className="space-y-1 text-sm">
      {employees.map((e) => (
        <EmployeeRow key={e.id} employee={e} />
      ))}
    </div>
  )
}

function EmployeeRow({ employee }: { employee: EmployeeSummary }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(employee.name)
  const [username, setUsername] = useState(employee.username)
  const [password, setPassword] = useState("")
  const [designation, setDesignation] = useState<Designation>(employee.designation)
  const [language, setLanguage] = useState<EmployeeLanguage>(employee.language)
  const [notes, setNotes] = useState(employee.notes ?? "")
  const [active, setActive] = useState(employee.active)
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.patch(`/employees/${employee.id}`, {
        name,
        username,
        password: password || undefined,
        designation,
        language,
        notes: notes || null,
        active,
      })
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setOpen(false)
      setPassword("")
      toast.success(i18n.t("toasts.employeeUpdated"))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-background/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2">
      <div className="flex flex-col min-w-0">
        <span className="font-medium leading-tight">{employee.name}</span>
        <span className="text-xs text-muted-foreground">{employee.username}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{translateDesignation(employee.designation)}</Badge>
        <Badge variant="outline">
          {employee.active ? i18n.t("common.active") : i18n.t("common.inactive")}
        </Badge>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              {i18n.t("common.edit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{i18n.t("app.dialogs.editEmployeeTitle")}</DialogTitle>
              <DialogDescription>
                {i18n.t("app.dialogs.editEmployeeDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{i18n.t("common.name")}</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{i18n.t("common.username")}</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{i18n.t("common.password")}</label>
                <Input
                  type="password"
                  placeholder={i18n.t("app.form.leaveBlankKeepPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{i18n.t("common.role")}</label>
                  <Select
                    value={designation}
                    onValueChange={(v) => setDesignation(v as Designation)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">{translateDesignation("Admin")}</SelectItem>
                      <SelectItem value="Senior Carpenter">{translateDesignation("Senior Carpenter")}</SelectItem>
                      <SelectItem value="Middle Carpenter">{translateDesignation("Middle Carpenter")}</SelectItem>
                      <SelectItem value="Junior Carpenter">{translateDesignation("Junior Carpenter")}</SelectItem>
                      <SelectItem value="Painter">{translateDesignation("Painter")}</SelectItem>
                      <SelectItem value="CNC Machinist">{translateDesignation("CNC Machinist")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">{i18n.t("common.language")}</label>
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as EmployeeLanguage)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EN">{translateLanguageCode("EN")}</SelectItem>
                      <SelectItem value="TK">{translateLanguageCode("TK")}</SelectItem>
                      <SelectItem value="RU">{translateLanguageCode("RU")}</SelectItem>
                      <SelectItem value="UZ">{translateLanguageCode("UZ")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{i18n.t("common.notes")}</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex items-start gap-2 rounded-md border px-3 py-2 sm:items-center">
                <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
                <Label>{i18n.t("app.form.employeeIsActive")}</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? i18n.t("common.saving") : i18n.t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function ProjectsPanel({
  projects,
  loading,
}: {
  projects: ProjectSummary[]
  loading: boolean
}) {
  const { isAdmin } = useAuth()
  if (loading)
    return <p className="text-xs text-muted-foreground">{i18n.t("app.loading.projects")}</p>
  if (!projects.length)
    return <p className="text-xs text-muted-foreground">{i18n.t("app.empty.projects")}</p>

  return (
    <div className="space-y-2 text-sm">
      {projects.map((p) => (
        <ProjectRow key={p.id} project={p} canEdit={isAdmin} />
      ))}
    </div>
  )
}

function ProjectRow({
  project,
  canEdit,
}: {
  project: ProjectSummary
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const technicalDrawingUrl = resolveAssetUrl(project.technical_drawing)
  const threeDModelUrl = resolveAssetUrl(project.three_d_model)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [notes, setNotes] = useState(project.notes ?? "")
  const [deadline, setDeadline] = useState(
    toLocalDateTimeInput(project.deadline),
  )
  const [urgency, setUrgency] = useState<UrgencyLevel>(project.urgency)
  const [complexity, setComplexity] = useState<ComplexityLevel>(project.complexity)
  const [technicalDrawing, setTechnicalDrawing] = useState(
    project.technical_drawing ?? "",
  )
  const [threeDModel, setThreeDModel] = useState(project.three_d_model ?? "")
  const [miscFilesText, setMiscFilesText] = useState(project.misc_files.join("\n"))
  const [completed, setCompleted] = useState(project.completed)
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    try {
      setSaving(true)
      await api.patch(`/projects/${project.id}`, {
        name,
        notes: notes || null,
        urgency,
        complexity,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        technical_drawing: technicalDrawing || null,
        three_d_model: threeDModel || null,
        misc_files: miscFilesText
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        completed,
      })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setOpen(false)
      toast.success(i18n.t("toasts.projectUpdated"))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background/60 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span className="font-medium leading-tight">{project.name}</span>
        <div className="flex flex-wrap items-center gap-2">
          {project.completed && <Badge variant="outline">{i18n.t("common.completed")}</Badge>}
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                >
                  {i18n.t("common.edit")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{i18n.t("app.dialogs.editProjectTitle")}</DialogTitle>
                  <DialogDescription>
                    {i18n.t("app.dialogs.editProjectDescription")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{i18n.t("common.name")}</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{i18n.t("common.notes")}</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <DeadlineField value={deadline} onChange={setDeadline} />
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{i18n.t("common.urgency")}</label>
                      <Select
                        value={urgency}
                        onValueChange={(v) => setUrgency(v as UrgencyLevel)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXTREMELY_URGENT">{translateUrgency("EXTREMELY_URGENT")}</SelectItem>
                          <SelectItem value="URGENT">{translateUrgency("URGENT")}</SelectItem>
                          <SelectItem value="NORMAL">{translateUrgency("NORMAL")}</SelectItem>
                          <SelectItem value="LOW">{translateUrgency("LOW")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{i18n.t("common.complexity")}</label>
                      <Select
                        value={complexity}
                        onValueChange={(v) => setComplexity(v as ComplexityLevel)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SIMPLE">{translateComplexity("SIMPLE")}</SelectItem>
                          <SelectItem value="NORMAL">{translateComplexity("NORMAL")}</SelectItem>
                          <SelectItem value="COMPLEX">{translateComplexity("COMPLEX")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{i18n.t("app.form.technicalDrawingUrl")}</label>
                    <Input
                      value={technicalDrawing}
                      onChange={(e) => setTechnicalDrawing(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{i18n.t("app.form.threeDModelUrl")}</label>
                    <Input
                      value={threeDModel}
                      onChange={(e) => setThreeDModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{i18n.t("app.form.miscFileUrls")}</label>
                    <Textarea
                      value={miscFilesText}
                      onChange={(e) => setMiscFilesText(e.target.value)}
                      rows={4}
                      placeholder={i18n.t("app.form.oneUrlPerLine")}
                    />
                  </div>
                  <div className="flex items-start gap-2 rounded-md border px-3 py-2 sm:items-center">
                    <Checkbox
                      checked={completed}
                      onCheckedChange={(checked) => setCompleted(checked === true)}
                    />
                    <Label>{i18n.t("app.form.projectCompleted")}</Label>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving}>
                      {saving ? i18n.t("common.saving") : i18n.t("common.save")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {project.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {project.notes}
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {technicalDrawingUrl && (
          <a
            href={technicalDrawingUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="underline underline-offset-2"
          >
            PDF
          </a>
        )}
        {threeDModelUrl && (
          <a
            href={threeDModelUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="underline underline-offset-2"
          >
            {i18n.t("app.form.threeDModel")}
          </a>
        )}
      </div>
    </div>
  )
}

function CreateEmployeeButton({ onChanged }: { onChanged: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: {
      name: string
      username: string
      password: string
      designation: Designation
      language: EmployeeLanguage
      notes: string
      active: boolean
    }) => {
      await api.post("/employees/", {
        name: payload.name,
        username: payload.username,
        password: payload.password,
        designation: payload.designation,
        language: payload.language,
        notes: payload.notes || null,
        active: payload.active,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      onChanged()
    },
  })

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [designation, setDesignation] = useState<Designation>("Admin")
  const [language, setLanguage] = useState<EmployeeLanguage>("EN")
  const [notes, setNotes] = useState("")
  const [active, setActive] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({
        name,
        username,
        password,
        designation,
        language,
        notes,
        active,
      })
      setOpen(false)
      setName("")
      setUsername("")
      setPassword("")
      setNotes("")
      setActive(true)
      toast.success(i18n.t("toasts.employeeCreated"))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full sm:w-auto">
          <Plus className="mr-1 size-3.5" /> {i18n.t("app.addMember")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i18n.t("app.dialogs.newEmployeeTitle")}</DialogTitle>
          <DialogDescription>
            {i18n.t("app.dialogs.newEmployeeDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.name")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.username")}</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.password")}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.role")}</label>
              <Select
                value={designation}
                onValueChange={(v) => setDesignation(v as Designation)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">{translateDesignation("Admin")}</SelectItem>
                  <SelectItem value="Senior Carpenter">
                    {translateDesignation("Senior Carpenter")}
                  </SelectItem>
                  <SelectItem value="Middle Carpenter">
                    {translateDesignation("Middle Carpenter")}
                  </SelectItem>
                  <SelectItem value="Junior Carpenter">
                    {translateDesignation("Junior Carpenter")}
                  </SelectItem>
                  <SelectItem value="Painter">{translateDesignation("Painter")}</SelectItem>
                  <SelectItem value="CNC Machinist">{translateDesignation("CNC Machinist")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.language")}</label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as EmployeeLanguage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">{translateLanguageCode("EN")}</SelectItem>
                  <SelectItem value="TK">{translateLanguageCode("TK")}</SelectItem>
                  <SelectItem value="RU">{translateLanguageCode("RU")}</SelectItem>
                  <SelectItem value="UZ">{translateLanguageCode("UZ")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.notes")}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-start gap-2 rounded-md border px-3 py-2 sm:items-center">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
            <Label>{i18n.t("app.form.employeeIsActive")}</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? i18n.t("common.creating") : i18n.t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateProjectButton({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: {
      name: string
      notes: string
      urgency: UrgencyLevel
      complexity: ComplexityLevel
      deadline: string | null
      technical_drawing: string | null
      three_d_model: string | null
      misc_files: string[]
    }) => {
      await api.post("/projects/", {
        name: payload.name,
        notes: payload.notes || null,
        urgency: payload.urgency,
        complexity: payload.complexity,
        deadline: payload.deadline,
        technical_drawing: payload.technical_drawing,
        three_d_model: payload.three_d_model,
        misc_files: payload.misc_files,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      onCreated()
    },
  })

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [technicalDrawing, setTechnicalDrawing] = useState("")
  const [threeDModel, setThreeDModel] = useState("")
  const [technicalDrawingFile, setTechnicalDrawingFile] = useState<File | null>(
    null,
  )
  const [threeDModelFile, setThreeDModelFile] = useState<File | null>(null)
  const [miscFiles, setMiscFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState("")
  const [urgency, setUrgency] = useState<UrgencyLevel>("NORMAL")
  const [complexity, setComplexity] = useState<ComplexityLevel>("NORMAL")
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsUploading(true)

      let technicalDrawingUrl = technicalDrawing || null
      if (technicalDrawingFile) {
        const uploaded = await uploadFile(technicalDrawingFile, "projects")
        technicalDrawingUrl = uploaded.url
      }

      let threeDModelUrl = threeDModel || null
      if (threeDModelFile) {
        const uploaded = await uploadFile(threeDModelFile, "projects")
        threeDModelUrl = uploaded.url
      }

      const miscFileUrls: string[] = []
      for (const f of miscFiles) {
        const uploaded = await uploadFile(f, "project-misc")
        miscFileUrls.push(uploaded.url)
      }

      await mutation.mutateAsync({
        name,
        notes,
        urgency,
        complexity,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        technical_drawing: technicalDrawingUrl,
        three_d_model: threeDModelUrl,
        misc_files: miscFileUrls,
      })
      setOpen(false)
      setName("")
      setNotes("")
      setTechnicalDrawing("")
      setThreeDModel("")
      setTechnicalDrawingFile(null)
      setThreeDModelFile(null)
      setMiscFiles([])
      setDeadline("")
      setUrgency("NORMAL")
      setComplexity("NORMAL")
      toast.success(i18n.t("toasts.projectCreated"))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full sm:w-auto">
          <Plus className="mr-1 size-3.5" /> {i18n.t("app.newProject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{i18n.t("app.dialogs.newProjectTitle")}</DialogTitle>
          <DialogDescription>
            {i18n.t("app.dialogs.newProjectDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.name")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.notes")}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <DeadlineField value={deadline} onChange={setDeadline} />
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.urgency")}</label>
              <Select
                value={urgency}
                onValueChange={(v) => setUrgency(v as UrgencyLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTREMELY_URGENT">
                    {translateUrgency("EXTREMELY_URGENT")}
                  </SelectItem>
                  <SelectItem value="URGENT">{translateUrgency("URGENT")}</SelectItem>
                  <SelectItem value="NORMAL">{translateUrgency("NORMAL")}</SelectItem>
                  <SelectItem value="LOW">{translateUrgency("LOW")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.complexity")}</label>
              <Select
                value={complexity}
                onValueChange={(v) => setComplexity(v as ComplexityLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMPLE">{translateComplexity("SIMPLE")}</SelectItem>
                  <SelectItem value="NORMAL">{translateComplexity("NORMAL")}</SelectItem>
                  <SelectItem value="COMPLEX">{translateComplexity("COMPLEX")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              {i18n.t("app.form.technicalDrawingPdf")}
            </label>
            <div className="space-y-1">
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setTechnicalDrawingFile(file)
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                {i18n.t("app.form.technicalDrawingUploadHint")}
              </p>
              <Input
                placeholder={i18n.t("app.form.existingPdfLinkPlaceholder")}
                value={technicalDrawing}
                onChange={(e) => setTechnicalDrawing(e.target.value)}
                required={!technicalDrawingFile}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("app.form.threeDModel")}</label>
            <div className="space-y-1">
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setThreeDModelFile(file)
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                {i18n.t("app.form.threeDModelUploadHint")}
              </p>
              <Input
                placeholder={i18n.t("app.form.existing3dModelLinkPlaceholder")}
                value={threeDModel}
                onChange={(e) => setThreeDModel(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("app.form.miscFiles")}</label>
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                setMiscFiles(files)
              }}
            />
            {miscFiles.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {i18n.t("app.form.filesSelected_other", { count: miscFiles.length })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || isUploading}>
              {mutation.isPending || isUploading ? i18n.t("common.uploading") : i18n.t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateTaskButton({
  employees,
  projects,
  onCreated,
}: {
  employees: EmployeeSummary[]
  projects: ProjectSummary[]
  onCreated: () => void
}) {
  const UNASSIGNED = "__unassigned__"

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: {
      title: string
      notes: string
      task_type: TaskType
      urgency: UrgencyLevel
      deadline: string | null
      status: TaskStatus
      parent_project_id: string
      assignee_id: string | null
      files: string[]
      photos: string[]
    }) => {
      await api.post("/tasks/", {
        title: payload.title,
        notes: payload.notes || null,
        task_type: payload.task_type,
        urgency: payload.urgency,
        deadline: payload.deadline,
        status: payload.status,
        files: payload.files,
        photos: payload.photos.length ? payload.photos : null,
        parent_project_id: payload.parent_project_id,
        assignee_id: payload.assignee_id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["tasks", "mine"] })
      onCreated()
    },
  })

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [taskType, setTaskType] = useState<TaskType>("OTHER")
  const [status, setStatus] = useState<TaskStatus>("POSTED")
  const [projectId, setProjectId] = useState<string>("")
  const [assigneeId, setAssigneeId] = useState<string>("")
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState("")
  const [urgency, setUrgency] = useState<UrgencyLevel>("NORMAL")
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    try {
      setIsUploading(true)

      const fileUrls: string[] = []
      for (const f of attachmentFiles) {
        const uploaded = await uploadFile(f, "task-files")
        fileUrls.push(uploaded.url)
      }

      const photoUrls: string[] = []
      for (const f of photoFiles) {
        const uploaded = await uploadFile(f, "task-photos")
        photoUrls.push(uploaded.url)
      }

      await mutation.mutateAsync({
        title,
        notes,
        task_type: taskType,
        urgency,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        status,
        parent_project_id: projectId,
        assignee_id:
          assigneeId && assigneeId !== UNASSIGNED ? assigneeId : null,
        files: fileUrls,
        photos: photoUrls,
      })
      setOpen(false)
      setTitle("")
      setNotes("")
      setTaskType("OTHER")
      setStatus("POSTED")
      setProjectId("")
      setAssigneeId("")
      setAttachmentFiles([])
      setPhotoFiles([])
      setDeadline("")
      setUrgency("NORMAL")
      toast.success(i18n.t("toasts.taskCreated"))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full sm:w-auto">
          <Plus className="mr-1 size-3.5" /> {i18n.t("app.newTask")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i18n.t("app.dialogs.newTaskTitle")}</DialogTitle>
          <DialogDescription>
            {i18n.t("app.dialogs.newTaskDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.title")}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{i18n.t("common.notes")}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("app.meta.taskType")}</label>
              <Select
                value={taskType}
                onValueChange={(v) => setTaskType(v as TaskType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUTTING">{translateTaskType("CUTTING")}</SelectItem>
                  <SelectItem value="ASSEMBLY">{translateTaskType("ASSEMBLY")}</SelectItem>
                  <SelectItem value="DISASSEMBLY">{translateTaskType("DISASSEMBLY")}</SelectItem>
                  <SelectItem value="FINISHING">{translateTaskType("FINISHING")}</SelectItem>
                  <SelectItem value="OTHER">{translateTaskType("OTHER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.status")}</label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POSTED">{translateTaskStatus("POSTED")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{translateTaskStatus("IN_PROGRESS")}</SelectItem>
                  <SelectItem value="WAITING_FOR_APPROVAL">
                    {translateTaskStatus("WAITING_FOR_APPROVAL")}
                  </SelectItem>
                  <SelectItem value="WAITING_FOR_SUPPLY">
                    {translateTaskStatus("WAITING_FOR_SUPPLY")}
                  </SelectItem>
                  <SelectItem value="COMPLETED">{translateTaskStatus("COMPLETED")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DeadlineField value={deadline} onChange={setDeadline} />
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.urgency")}</label>
              <Select
                value={urgency}
                onValueChange={(v) => setUrgency(v as UrgencyLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTREMELY_URGENT">
                    {translateUrgency("EXTREMELY_URGENT")}
                  </SelectItem>
                  <SelectItem value="URGENT">{translateUrgency("URGENT")}</SelectItem>
                  <SelectItem value="NORMAL">{translateUrgency("NORMAL")}</SelectItem>
                  <SelectItem value="LOW">{translateUrgency("LOW")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("common.project")}</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n.t("app.form.selectProject")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("app.form.assigneeOptional")}</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n.t("common.unassigned")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{i18n.t("common.unassigned")}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name || e.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">{i18n.t("app.form.attachments")}</label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  setAttachmentFiles(files)
                }}
              />
              {attachmentFiles.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {i18n.t("app.form.filesSelected_other", { count: attachmentFiles.length })}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                {i18n.t("app.form.photosCameraFriendly")}
              </label>
              <Input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  setPhotoFiles(files)
                }}
              />
              {photoFiles.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {i18n.t("app.form.photosSelected_other", { count: photoFiles.length })}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={mutation.isPending || isUploading || !projectId}
            >
              {mutation.isPending || isUploading ? i18n.t("common.uploading") : i18n.t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TasksList({
  tasks,
  loading,
  compact = false,
  allowManageFields = false,
}: {
  tasks: TaskSummary[]
  loading: boolean
  compact?: boolean
  allowManageFields?: boolean
}) {
  if (loading)
    return <p className="text-xs text-muted-foreground">{i18n.t("app.loading.tasks")}</p>
  if (!tasks.length)
    return <p className="text-xs text-muted-foreground">{i18n.t("app.empty.tasks")}</p>

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          compact={compact}
          allowManageFields={allowManageFields}
        />
      ))}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xs text-foreground">{value}</div>
    </div>
  )
}

function AssetButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="h-auto max-w-full px-2 py-1 text-center text-xs whitespace-normal sm:h-7"
    >
      <a href={href} target="_blank" rel="noreferrer" download>
        {label}
      </a>
    </Button>
  )
}

function TaskRow({
  task,
  compact,
  allowManageFields = false,
}: {
  task: TaskSummary
  compact?: boolean
  allowManageFields?: boolean
}) {
  const { canManageTasks, user } = useAuth()
  const queryClient = useQueryClient()
  const [localStatus, setLocalStatus] = useState(task.status)
  const [localNotes, setLocalNotes] = useState(task.notes ?? "")
  const [localDeadline, setLocalDeadline] = useState(
    toLocalDateTimeInput(task.deadline),
  )
  const [localUrgency, setLocalUrgency] = useState<UrgencyLevel>(task.urgency)
  const [saving, setSaving] = useState(false)
  const [showDrawing, setShowDrawing] = useState(
    Boolean(task.parent_project?.technical_drawing),
  )

  const isAssignee = user && task.assignee_id === user.id
  const canEdit = canManageTasks || isAssignee
  const project = task.parent_project
  const technicalDrawingUrl = resolveAssetUrl(project?.technical_drawing)
  const threeDModelUrl = resolveAssetUrl(project?.three_d_model)
  const miscFileUrls = (project?.misc_files ?? [])
    .map((file) => resolveAssetUrl(file))
    .filter((file): file is string => Boolean(file))
  const taskFileUrls = task.files
    .map((file) => resolveAssetUrl(file))
    .filter((file): file is string => Boolean(file))
  const taskPhotoUrls = (task.photos ?? [])
    .map((file) => resolveAssetUrl(file))
    .filter((file): file is string => Boolean(file))

  const handleSave = async () => {
    if (!canEdit) return
    try {
      setSaving(true)
      const payload: Record<string, unknown> = {
        status: localStatus,
        notes: localNotes,
      }
      if (allowManageFields) {
        payload.deadline = localDeadline
          ? new Date(localDeadline).toISOString()
          : null
        payload.urgency = localUrgency
      }
      await api.patch(`/tasks/${task.id}`, payload)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", "mine"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ])
      toast.success(i18n.t("toasts.taskUpdated"))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-md border bg-background/60 px-3 py-2 text-sm space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span className="font-medium leading-tight line-clamp-1">
          {task.title}
        </span>
        <Badge variant="outline" className="self-start">
          {translateTaskType(task.task_type)}
        </Badge>
      </div>
      {!compact && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <MetaItem label={i18n.t("app.meta.project")} value={project?.name ?? i18n.t("app.noLinkedProject")} />
          <MetaItem
            label={i18n.t("app.meta.assignedTo")}
            value={task.assignee_name ?? (task.assignee_id ? i18n.t("common.assigned") : i18n.t("common.unassigned"))}
          />
          <MetaItem label={i18n.t("app.meta.deadline")} value={formatDateTime(task.deadline)} />
          <MetaItem label={i18n.t("app.meta.urgency")} value={translateUrgency(task.urgency)} />
          <MetaItem label={i18n.t("app.meta.status")} value={translateTaskStatus(task.status)} />
          <MetaItem label={i18n.t("app.meta.taskType")} value={translateTaskType(task.task_type)} />
          <MetaItem
            label={i18n.t("app.meta.complexity")}
            value={project ? translateComplexity(project.complexity) : "—"}
          />
          <MetaItem
            label={i18n.t("app.meta.projectState")}
            value={project?.completed ? i18n.t("app.projectState.completed") : i18n.t("app.projectState.active")}
          />
        </div>
      )}
      {!compact && project?.notes && (
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {i18n.t("app.projectNotes")}
          </label>
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {project.notes}
          </div>
        </div>
      )}
      {!compact && (
        <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {i18n.t("common.notes")}
            </label>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={2}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {i18n.t("common.status")}
            </label>
            <Select
              value={localStatus}
              onValueChange={(v) => setLocalStatus(v as any)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POSTED">{translateTaskStatus("POSTED")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{translateTaskStatus("IN_PROGRESS")}</SelectItem>
                <SelectItem value="WAITING_FOR_APPROVAL">
                  {translateTaskStatus("WAITING_FOR_APPROVAL")}
                </SelectItem>
                <SelectItem value="WAITING_FOR_SUPPLY">
                  {translateTaskStatus("WAITING_FOR_SUPPLY")}
                </SelectItem>
                <SelectItem value="COMPLETED">{translateTaskStatus("COMPLETED")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {!compact && (
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {i18n.t("app.filesAndReferences")}
          </label>
          <div className="flex flex-wrap gap-2">
            {technicalDrawingUrl && (
              <AssetButton
                href={technicalDrawingUrl}
                label={i18n.t("app.downloadTechnicalDrawing")}
              />
            )}
            {threeDModelUrl && (
              <AssetButton href={threeDModelUrl} label={i18n.t("app.download3dModel")} />
            )}
            {miscFileUrls.map((href, index) => (
              <AssetButton
                key={`${href}-${index}`}
                href={href}
                label={i18n.t("app.downloadMiscFile", { index: index + 1 })}
              />
            ))}
            {taskFileUrls.map((href, index) => (
              <AssetButton
                key={`${href}-${index}`}
                href={href}
                label={i18n.t("app.downloadAttachment", { index: index + 1 })}
              />
            ))}
            {taskPhotoUrls.map((href, index) => (
              <AssetButton
                key={`${href}-${index}`}
                href={href}
                label={i18n.t("app.downloadPhoto", { index: index + 1 })}
              />
            ))}
          </div>
        </div>
      )}
      {!compact && technicalDrawingUrl && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {i18n.t("app.technicalDrawingPreview")}
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setShowDrawing((current) => !current)}
            >
              {showDrawing ? i18n.t("common.hide") : i18n.t("common.show")}
            </Button>
          </div>
          {showDrawing && <PdfViewer fileUrl={technicalDrawingUrl} />}
        </div>
      )}
      {!compact && allowManageFields && (
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <DeadlineField value={localDeadline} onChange={setLocalDeadline} label={i18n.t("common.deadline")} />
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {i18n.t("common.urgency")}
            </label>
            <Select
              value={localUrgency}
              onValueChange={(v) => setLocalUrgency(v as UrgencyLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXTREMELY_URGENT">
                  {translateUrgency("EXTREMELY_URGENT")}
                </SelectItem>
                <SelectItem value="URGENT">{translateUrgency("URGENT")}</SelectItem>
                <SelectItem value="NORMAL">{translateUrgency("NORMAL")}</SelectItem>
                <SelectItem value="LOW">{translateUrgency("LOW")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {canEdit && !compact && (
        <div className="flex justify-stretch sm:justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            className="w-full px-3 text-xs sm:w-auto"
            disabled={saving}
          >
            {saving ? i18n.t("common.saving") : i18n.t("common.save")}
          </Button>
        </div>
      )}
    </div>
  )
}
