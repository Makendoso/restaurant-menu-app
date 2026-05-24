"use client"

import type { OrderStatus } from "@/types"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChefHat,
  Clock,
} from "lucide-react"

export const orderStatusConfig = {
  pending: {
    label: "Pendiente",
    pluralLabel: "Pendientes",
    icon: AlertCircle,
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  preparing: {
    label: "Preparando",
    pluralLabel: "Preparando",
    icon: ChefHat,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  ready: {
    label: "Lista",
    pluralLabel: "Listas",
    icon: Clock,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  delivered: {
    label: "Entregada",
    pluralLabel: "Entregadas",
    icon: CheckCircle2,
    className:
      "border-muted bg-muted text-muted-foreground dark:border-muted",
  },
  cancelled: {
    label: "Cancelada",
    pluralLabel: "Canceladas",
    icon: Ban,
    className:
      "border-destructive/25 bg-destructive/10 text-destructive",
  },
} satisfies Record<
  OrderStatus,
  {
    label: string
    pluralLabel: string
    icon: React.ElementType
    className: string
  }
>

type OrderStatusBadgeProps = {
  status: OrderStatus
  plural?: boolean
  className?: string
}

export function OrderStatusBadge({
  status,
  plural = false,
  className,
}: OrderStatusBadgeProps) {
  const config = orderStatusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {plural ? config.pluralLabel : config.label}
    </span>
  )
}
