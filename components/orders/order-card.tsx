"use client"

import { Order } from "@/types"
import { useRestaurantData } from "@/context/restaurant-context"
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  Hash,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderCardProps {
  order: Order
  onClick: () => void
  isNew?: boolean
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Ahora"
  if (diffMins < 60) return `Hace ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`
  return date.toLocaleDateString()
}

const statusConfig = {
  pending: {
    label: "Pendientes",
    icon: AlertCircle,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  preparing: {
    label: "Preparando",
    icon: ChefHat,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ready: {
    label: "Listas",
    icon: Clock,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  delivered: {
    label: "Entregadas",
    icon: CheckCircle2,
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Canceladas",
    icon: Ban,
    className: "bg-destructive/10 text-destructive",
  },
}

export function OrderCard({ order, onClick, isNew }: OrderCardProps) {
  const { settings } = useRestaurantData()
  const status = statusConfig[order.status]
  const StatusIcon = status.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        isNew && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Order Number & Customer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-4 w-4" />
              <span className="font-semibold text-foreground">{order.orderNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{order.customerName}</span>
            </div>
          </div>

          {/* Items Preview */}
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")}
          </p>

          {/* Time & Total */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <DollarSign className="h-3.5 w-3.5" />
              <span>
                {settings.currency} {order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

      {/* Status Badge */}
        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              status.className
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>
          {order.isPaid ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Pagada
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Pago pendiente
            </span>
          )}
        </div>
      </div>

      {/* New Order Indicator */}
      {isNew && (
        <div className="mt-3 flex items-center justify-center rounded-lg bg-primary/10 py-1.5 text-xs font-medium text-primary">
          Nueva orden
        </div>
      )}
    </button>
  )
}
