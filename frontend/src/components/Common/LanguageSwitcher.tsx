import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCurrentLocale, LOCALE_OPTIONS, setAppLocale } from "@/i18n"

export function LanguageSwitcher({
  variant = "ghost",
}: {
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const { t } = useTranslation()
  const current = getCurrentLocale()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="icon-sm"
          className="border border-border/60"
          aria-label={t("common.language")}
          title={t("common.language")}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.locale}
            onClick={() => setAppLocale(opt.locale)}
            className={opt.locale === current ? "font-medium" : undefined}
          >
            {t(opt.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
