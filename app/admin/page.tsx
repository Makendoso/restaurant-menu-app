"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Package,
  FolderOpen,
  Store,
  Table2,
  Moon,
  Sun,
  ClipboardList,
} from "lucide-react"
import { ProductsTab } from "@/components/admin/products-tab"
import { CategoriesTab } from "@/components/admin/categories-tab"
import { RestaurantProfileTab } from "@/components/admin/restaurant-profile-tab"
import { TablesTab } from "@/components/admin/tables-tab"
import { LogoutButton } from "@/components/admin/logout-button"
import { cn } from "@/lib/utils"

type Tab = "products" | "categories" | "profile" | "tables"

export default function AdminPage() {
  const { settings, orders, isLoading, error, refreshData } = useRestaurantData()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<Tab>("products")

  const activeOrdersCount = orders.filter(
    (o) => o.status === "preparing" || o.status === "ready"
  ).length

  const tabs = [
    { id: "products" as Tab, label: "Products", icon: Package },
    { id: "categories" as Tab, label: "Categories", icon: FolderOpen },
    { id: "tables" as Tab, label: "Mesas", icon: Table2 },
    { id: "profile" as Tab, label: "Perfil del restaurante", icon: Store },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to menu</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{settings.name}</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders">
              <Button variant="outline" size="sm" className="relative gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
                {activeOrdersCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {activeOrdersCount}
                  </span>
                )}
              </Button>
            </Link>
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
              Retry
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border bg-card p-4 md:p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading restaurant data...
            </div>
          ) : (
            <>
              {activeTab === "products" && <ProductsTab />}
              {activeTab === "categories" && <CategoriesTab />}
              {activeTab === "tables" && <TablesTab />}
              {activeTab === "profile" && <RestaurantProfileTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
