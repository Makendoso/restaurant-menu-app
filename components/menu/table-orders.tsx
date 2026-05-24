"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { fetchPublicOrders } from "@/services/restaurant-service"
import type { Order, RestaurantSettings } from "@/types"
import { Banknote, CheckCircle2 } from "lucide-react"
import { OrderStatusBadge } from "@/components/orders/order-status"
import { Spinner } from "@/components/ui/spinner"

type TableOrdersProps = {
  tableId: string | null | undefined
  sessionId: string | null | undefined
  settings: RestaurantSettings
  refreshKey: number
}

const statusMessages: Record<Order["status"], string> = {
  pending: "Tu orden fue enviada y esta pendiente de aceptacion.",
  preparing: "El restaurante esta preparando tu orden.",
  ready: "Tu orden esta lista.",
  delivered: "Tu orden fue entregada.",
  cancelled: "La orden fue cancelada.",
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString))
}

export function TableOrders({
  tableId,
  sessionId,
  settings,
  refreshKey,
}: TableOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    if (!tableId || !sessionId) return

    if (orders.length === 0) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      setOrders(await fetchPublicOrders(tableId, sessionId))
    } catch (loadError) {
      console.error(loadError)
      setError(
        "No pudimos consultar las ordenes de esta mesa. La sesion puede haber expirado."
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [orders.length, sessionId, tableId])

  useEffect(() => {
    Promise.resolve().then(() => {
      loadOrders().catch(() => undefined)
    })
  }, [loadOrders, refreshKey])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadOrders().catch(() => undefined)
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [loadOrders])

  if (!tableId || !sessionId) return null

  return (
    <section className="mb-6 rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Tus ordenes</h2>
          <p className="text-sm text-muted-foreground">
            Necesitas cambiar algo? Solicita ayuda al personal.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadOrders()}
          disabled={isLoading || isRefreshing}
          className="gap-2"
        >
          {isRefreshing && <Spinner />}
          Actualizar
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Cargando ordenes
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          Todavia no hay ordenes para esta mesa. Cuando envies una, aparecera aqui.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">Orden #{order.orderNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    Enviada a las {formatTime(order.createdAt)}
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {statusMessages[order.status]}
              </p>

              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex justify-between gap-3">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>
                      {formatPrice(item.price * item.quantity, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="font-semibold">
                  Total {formatPrice(order.total, settings.currency)}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {order.isPaid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Banknote className="h-4 w-4 text-amber-600" />
                  )}
                  {order.isPaid ? "Pagada" : "Pendiente de pago"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
