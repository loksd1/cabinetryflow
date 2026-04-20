import { createFileRoute } from "@tanstack/react-router"
import { type FormEvent, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { AuthLayout } from "@/components/Common/AuthLayout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import i18n, { translateDesignation } from "@/i18n"

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      {
        title: i18n.t("auth.metaTitle"),
      },
    ],
  }),
})

function LoginPage() {
  const { t } = useTranslation()
  const { login, isAuthenticated, loginError, clearLoginError } = useAuth()
  const roles = [
    translateDesignation("Admin"),
    translateDesignation("Senior Carpenter"),
    translateDesignation("CNC Machinist"),
    t("common.employee", { defaultValue: "Employee" }),
  ].join(", ")

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/app"
    }
  }, [isAuthenticated])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearLoginError()
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") || "").trim()
    const password = String(formData.get("password") || "")
    await login({ username, password })
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth.signInTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.description")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2 text-left">
            <label
              htmlFor="username"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              {t("common.username")}
            </label>
            <Input
              id="username"
              name="username"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2 text-left">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              {t("common.password")}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            {t("auth.continue")}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          {t("auth.roleHint", { roles })}
        </p>
      </div>
    </AuthLayout>
  )
}
