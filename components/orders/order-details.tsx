"use client"

import { useState } from "react"
import { Order } from "@/types"
import { useRestaurantData } from "@/context/restaurant-context"
import { getRestaurantServiceErrorMessage } from "@/services/restaurant-service"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Hash,
  Clock,
  MessageSquare,
  ChefHat,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Banknote,
  AlertCircle,
  Ban,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface OrderDetailsProps {
  order: Order | null
  onClose: () => void
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString("es-MX", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

const statusConfig = {
  pending: {
    label: "Pendientes",
    icon: AlertCircle,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    nextLabel: "Aceptar orden",
  },
  preparing: {
    label: "Preparando",
    icon: ChefHat,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    nextLabel: "Marcar como lista",
  },
  ready: {
    label: "Listas",
    icon: Clock,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    nextLabel: "Marcar como entregada",
  },
  delivered: {
    label: "Entregadas",
    icon: CheckCircle2,
    className: "bg-muted text-muted-foreground",
    nextLabel: null,
  },
  cancelled: {
    label: "Canceladas",
    icon: Ban,
    className: "bg-destructive/10 text-destructive",
    nextLabel: null,
  },
}

export function OrderDetails({ order, onClose }: OrderDetailsProps) {
  const { settings, advanceOrderStatus, updateOrderStatus, toggleOrderPayment, orders } =
    useRestaurantData()
  const [pendingAction, setPendingAction] = useState<
    "status" | "payment" | "cancel" | null
  >(null)

  // Update order if it changes in context
  const currentOrder = order ? orders.find((o) => o.id === order.id) || order : null

  if (!currentOrder) {
    return (
      <Sheet open={false} onOpenChange={() => onClose()}>
        <SheetContent />
      </Sheet>
    )
  }

  const status = statusConfig[currentOrder.status]
  const StatusIcon = status.icon

  const handleAdvanceStatus = async () => {
    setPendingAction("status")

    try {
      await advanceOrderStatus(currentOrder.id)
    } catch (error) {
      console.error(error)
      toast.error(
        getRestaurantServiceErrorMessage(error, "No se pudo actualizar la orden")
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleTogglePayment = async () => {
    setPendingAction("payment")

    try {
      await toggleOrderPayment(currentOrder.id)
    } catch (error) {
      console.error(error)
      toast.error(
        getRestaurantServiceErrorMessage(
          error,
          "No se pudo actualizar el pago"
        )
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleCancelOrder = async () => {
    setPendingAction("cancel")

    try {
      await updateOrderStatus(currentOrder.id, "cancelled")
    } catch (error) {
      console.error(error)
      toast.error(
        getRestaurantServiceErrorMessage(error, "No se pudo cancelar la orden")
      )
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Sheet open={!!order} onOpenChange={() => onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-lg sm:p-6">
        <SheetHeader className="space-y-3 p-0 pr-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Orden #{currentOrder.orderNumber}
            </SheetTitle>
            <div
              className={cn(
                "flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                status.className
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(currentOrder.createdAt)}
          </p>
          {currentOrder.status === "pending" && (
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Pendiente: el cliente todavia puede modificarla hasta que la aceptes
              o termine su ventana de edicion.
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-5">
          {/* Customer Info */}
          <div className="mb-6 space-y-3 rounded-lg bg-secondary/50 p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{currentOrder.customerName}</p>
              </div>
            </div>
            {currentOrder.tableNumber && (
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Mesa</p>
                  <p className="font-medium">Mesa {currentOrder.tableNumber}</p>
                </div>
              </div>
            )}
            {currentOrder.notes && (
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="font-medium">{currentOrder.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold">Productos</h3>
            <div className="space-y-2">
              {currentOrder.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {item.quantity}x
                    </span>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-medium">
                    {settings.currency} {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-xl font-bold">
              {settings.currency} {currentOrder.total.toFixed(2)}
            </span>
          </div>

          {/* Payment Status */}
          <div className="mt-4 flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {currentOrder.isPaid ? (
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Banknote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className="font-medium">Estado de pago</p>
                <p
                  className={cn(
                    "text-sm",
                    currentOrder.isPaid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {currentOrder.isPaid ? "Pagada" : "Sin pagar"}
                </p>
              </div>
            </div>
            <Button
              variant={currentOrder.isPaid ? "outline" : "default"}
              size="sm"
              disabled={pendingAction === "payment"}
              onClick={handleTogglePayment}
            >
              {pendingAction === "payment"
                ? "Guardando..."
                : currentOrder.isPaid
                  ? "Marcar como no pagada"
                  : "Marcar como pagada"}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 border-t pb-1 pt-4">
          {status.nextLabel && (
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={pendingAction === "status"}
              onClick={handleAdvanceStatus}
            >
              {pendingAction === "status" ? "Guardando..." : status.nextLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {currentOrder.status !== "delivered" &&
            currentOrder.status !== "cancelled" && (
              <Button
                variant="outline"
                className="w-full"
                disabled={pendingAction === "cancel"}
                onClick={handleCancelOrder}
              >
                {pendingAction === "cancel" ? "Cancelando..." : "Cancelar orden"}
              </Button>
            )}
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
