import { AxiosError } from "axios"
import type { ApiError } from "./client"
import { translateKnownMessage } from "./i18n"

type ErrorDetailItem = {
  msg?: string
}

type ErrorBodyWithDetail = {
  detail?: string | ErrorDetailItem[]
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = (err.response?.data as ErrorBodyWithDetail | undefined)?.detail

    if (Array.isArray(detail) && detail.length > 0) {
      return translateKnownMessage(detail[0]?.msg ?? err.message)
    }

    if (typeof detail === "string" && detail.trim()) {
      return translateKnownMessage(detail)
    }

    return translateKnownMessage(err.message)
  }

  const apiError = err as ApiError | undefined
  const errorBody =
    apiError?.body && typeof apiError.body === "object"
      ? (apiError.body as ErrorBodyWithDetail)
      : undefined
  const errDetail = errorBody?.detail
  if (Array.isArray(errDetail) && errDetail.length > 0) {
    return translateKnownMessage(errDetail[0]?.msg ?? "Something went wrong.")
  }
  return translateKnownMessage(
    typeof errDetail === "string" ? errDetail : "Something went wrong.",
  )
}

export const handleError = function (
  this: (msg: string) => void,
  err: ApiError,
) {
  const errorMessage = getErrorMessage(err)
  this(errorMessage)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
