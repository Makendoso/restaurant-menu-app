"use client"

import { useState, useMemo } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Moon,
  Sun,
  Search,
  Clock,
  ChefHat,
  CheckCircle2,
  Package,
  AlertCircle,
  Ban,
} from "lucide-react"
import { OrderCard } from "@/components/orders/order-card"
import { OrderDetails } from "@/components/orders/order-details"
import { LogoutButton } from "@/components/admin/logout-button"
import { Order, OrderStatus } from "@/types"
import { cn } from "@/lib/utils"

type FilterStatus = "all" | OrderStatus

const statusPriority: Record<OrderStatus, number> = {
  pending: 0,
  preparing: 1,
  ready: 2,
  delivered: 3,
  cancelled: 4,
}

function sortOrdersForOwner(a: Order, b: Order) {
  const statusDiff = statusPriority[a.status] - statusPriority[b.status]
  if (statusDiff !== 0) return statusDiff

  const aTime = new Date(a.createdAt).getTime()
  const bTime = new Date(b.createdAt).getTime()

  if (a.status === "delivered" || a.status === "cancelled") {
    return bTime - aTime
  }

  return aTime - bTime
}

export default function OrdersPage() {
  const { settings, orders, isLoading, error, refreshData } = useRestaurantData()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    }
  }, [orders])

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesStatus = filterStatus === "all" || order.status === filterStatus
        const matchesSearch =
          searchQuery === "" ||
          order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.orderNumber.toString().includes(searchQuery) ||
          order.tableNumber?.includes(searchQuery)
        return matchesStatus && matchesSearch
      })
      .sort(sortOrdersForOwner)
  }, [orders, filterStatus, searchQuery])

  const filters = [
    { id: "pending" as FilterStatus, label: "Pendientes", icon: AlertCircle, count: statusCounts.pending },
    { id: "preparing" as FilterStatus, label: "Preparando", icon: ChefHat, count: statusCounts.preparing },
    { id: "ready" as FilterStatus, label: "Listas", icon: Clock, count: statusCounts.ready },
    { id: "delivered" as FilterStatus, label: "Entregadas", icon: CheckCircle2, count: statusCounts.delivered },
    { id: "cancelled" as FilterStatus, label: "Canceladas", icon: Ban, count: statusCounts.cancelled },
    { id: "all" as FilterStatus, label: "Todas", icon: Package, count: statusCounts.all },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <p className="text-sm text-muted-foreground">Gestion de ordenes</p>
            </div>
          </div>
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

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por orden, cliente o mesa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => {
            const Icon = filter.icon
            return (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  filterStatus === filter.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    filterStatus === filter.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Cargando ordenes...</h3>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No se encontraron ordenes</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery || filterStatus !== "all"
                  ? "Ajusta la busqueda o los filtros"
                  : "Las ordenes apareceran aqui cuando los clientes las envien"}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))
          )}
        </div>
      </div>

      {/* Order Details Drawer */}
      <OrderDetails
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}
