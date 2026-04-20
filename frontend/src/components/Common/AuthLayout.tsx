import { Appearance } from "@/components/Common/Appearance"
import { LanguageSwitcher } from "@/components/Common/LanguageSwitcher"
import { Footer } from "./Footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-svh flex flex-col bg-background">
      <div className="flex justify-end px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Appearance />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-6 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <Footer />
    </div>
  )
}
