"use client"

import { ClipboardList, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"

export type CustomerTab = "menu" | "orders"

type CustomerBottomNavProps = {
  activeTab: CustomerTab
  onTabChange: (tab: CustomerTab) => void
}

const tabs = [
  {
    id: "menu" as const,
    label: "Menu",
    description: "Elige productos",
    icon: Utensils,
  },
  {
    id: "orders" as const,
    label: "Ordenes",
    description: "Consulta el estado",
    icon: ClipboardList,
  },
]

export function CustomerBottomNav({
  activeTab,
  onTabChange,
}: CustomerBottomNavProps) {
  return (
    <>
      <div className="mb-6 hidden rounded-lg border bg-card p-1 sm:grid sm:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center justify-center gap-3 rounded-md px-4 py-3 text-left transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span
                  className={cn(
                    "block text-xs",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {tab.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-lg backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
