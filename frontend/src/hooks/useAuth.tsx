import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { syncLocaleWithEmployeeLanguage } from "@/i18n"
import {
  type AuthMe,
  api,
  type Designation,
  type EmployeeLanguage,
} from "@/lib/api"
import { getErrorMessage } from "@/utils"

interface AuthContextValue {
  token: string | null
  user: AuthMe | null
  designation: Designation | null
  isLoadingUser: boolean
  isAuthenticated: boolean
  login: (params: { username: string; password: string }) => Promise<void>
  logout: () => void
  isAdmin: boolean
  canManageTasks: boolean
  loginError: string | null
  clearLoginError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("access_token"),
  )
  const [designation, setDesignation] = useState<Designation | null>(() => {
    const raw = localStorage.getItem("designation")
    return raw ? (raw as Designation) : null
  })
  const [loginError, setLoginError] = useState<string | null>(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      if (!token) return null
      const res = await api.get<AuthMe>("/auth/me")
      return res.data
    },
    enabled: !!token,
  })

  const loginMutation = useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string
      password: string
    }) => {
      const res = await api.post<{
        access_token: string
        designation: Designation
        language: EmployeeLanguage
      }>(
        "/auth/login",
        new URLSearchParams({
          username,
          password,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      )
      return res.data
    },
    onSuccess: async (data) => {
      setLoginError(null)
      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("designation", data.designation)
      localStorage.setItem("employee_language", data.language)
      setToken(data.access_token)
      setDesignation(data.designation)
      await syncLocaleWithEmployeeLanguage(data.language)
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
      navigate({ to: "/app" })
    },
    onError: (error) => {
      setLoginError(getErrorMessage(error))
    },
  })

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("designation")
    localStorage.removeItem("employee_language")
    setToken(null)
    setDesignation(null)
    queryClient.clear()
    navigate({ to: "/" })
  }, [navigate, queryClient])

  useEffect(() => {
    if (!user) return

    if (user.designation !== designation) {
      localStorage.setItem("designation", user.designation)
      setDesignation(user.designation)
    }

    localStorage.setItem("employee_language", user.language)
    void syncLocaleWithEmployeeLanguage(user.language)
  }, [designation, user])

  const value: AuthContextValue = {
    token,
    user: user ?? null,
    designation,
    isLoadingUser,
    isAuthenticated: !!token && !!user,
    login: async (params) => {
      await loginMutation.mutateAsync(params)
    },
    logout,
    loginError,
    clearLoginError: () => setLoginError(null),
    isAdmin: designation === "Admin",
    canManageTasks:
      designation === "Admin" ||
      designation === "Senior Carpenter" ||
      designation === "CNC Machinist",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
