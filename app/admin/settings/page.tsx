"use client"

import { useTheme } from "next-themes"
import Link from "next/link"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import { SettingsTab } from "@/components/admin/settings-tab"
import { LogoutButton } from "@/components/admin/logout-button"
import { Button } from "@/components/ui/button"
import { useRestaurantData } from "@/context/restaurant-context"

export default function AdminSettingsPage() {
  const { settings, isLoading, error, refreshData } = useRestaurantData()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Volver al panel</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{settings.name}</h1>
              <p className="text-sm text-muted-foreground">
                Ajustes privados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => refreshData()}>
              Reintentar
            </Button>
          </div>
        )}

        <div className="rounded-xl border bg-card p-4 md:p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Cargando datos del restaurante...
            </div>
          ) : (
            <SettingsTab />
          )}
        </div>
      </div>
    </div>
  )
}
