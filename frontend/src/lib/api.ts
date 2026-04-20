import axios from "axios"

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api/v1"

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin
  } catch {
    if (typeof window !== "undefined") {
      return window.location.origin
    }
    return ""
  }
}

function clearStoredAuthAndRedirect() {
  if (typeof window === "undefined") return

  localStorage.removeItem("access_token")
  localStorage.removeItem("designation")
  localStorage.removeItem("employee_language")

  if (window.location.pathname !== "/") {
    window.location.href = "/"
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const detail = error.response?.data?.detail
      const shouldResetAuth =
        status === 401 || (status === 404 && detail === "Employee not found")

      if (shouldResetAuth) {
        clearStoredAuthAndRedirect()
      }
    }

    return Promise.reject(error)
  },
)

export type Designation =
  | "Admin"
  | "Senior Carpenter"
  | "Middle Carpenter"
  | "Junior Carpenter"
  | "Painter"
  | "CNC Machinist"

export type EmployeeLanguage = "EN" | "RU" | "TK" | "UZ"

export type ComplexityLevel = "SIMPLE" | "NORMAL" | "COMPLEX"

export type TaskStatus =
  | "POSTED"
  | "IN_PROGRESS"
  | "WAITING_FOR_APPROVAL"
  | "WAITING_FOR_SUPPLY"
  | "COMPLETED"

export type TaskType =
  | "CUTTING"
  | "ASSEMBLY"
  | "DISASSEMBLY"
  | "FINISHING"
  | "OTHER"

export type UrgencyLevel = "EXTREMELY_URGENT" | "URGENT" | "NORMAL" | "LOW"

export interface FileUploadResponse {
  url: string
  filename: string
  content_type?: string | null
}

export interface AuthMe {
  id: string
  name: string
  username: string
  designation: Designation
  language: EmployeeLanguage
  notes: string | null
}

export interface EmployeeSummary {
  id: string
  name: string
  username: string
  designation: Designation
  language: EmployeeLanguage
  notes: string | null
  active: boolean
}

export interface ProjectSummary {
  id: string
  name: string
  notes: string | null
  urgency: UrgencyLevel
  complexity: ComplexityLevel
  technical_drawing: string | null
  three_d_model: string | null
  misc_files: string[]
  completed: boolean
  deadline: string
}

export interface TaskSummary {
  id: string
  title: string
  notes: string | null
  task_type: TaskType
  urgency: UrgencyLevel
  deadline: string | null
  files: string[]
  photos: string[] | null
  status: TaskStatus
  parent_project_id: string | null
  assignee_id: string | null
  assignee_name: string | null
  parent_project: ProjectSummary | null
}

export interface LogEntrySummary {
  id: string
  created_at: string
  entity_type: "PROJECT" | "TASK"
  entity_id: string
  action: "STATUS_UPDATED" | "TASK_ASSIGNED"
  field_name: string
  old_value: string | null
  new_value: string | null
  message: string
  project_id: string | null
  task_id: string | null
  actor_employee_id: string | null
  actor_employee_name: string | null
}

export function resolveAssetUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`

  try {
    return new URL(normalizedPath, `${getApiOrigin()}/`).toString()
  } catch {
    return pathOrUrl
  }
}

export async function uploadFile(
  file: File,
  folder?: string,
): Promise<FileUploadResponse> {
  const formData = new FormData()
  formData.append("file", file)
  if (folder) {
    formData.append("folder", folder)
  }

  const res = await api.post<FileUploadResponse>("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return res.data
}
