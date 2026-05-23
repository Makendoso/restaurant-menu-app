"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchPublicOrders } from "@/services/restaurant-service"
import type { CartItem, Order, Product, RestaurantSettings } from "@/types"
import { Clock, Pencil } from "lucide-react"

type TableOrdersProps = {
  tableId: string | null | undefined
  sessionId: string | null | undefined
  products: Product[]
  settings: RestaurantSettings
  refreshKey: number
  onEditOrder: (order: Order, items: CartItem[]) => void
}

const statusLabels: Record<Order["status"], string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Lista",
  delivered: "Entregada",
  cancelled: "Cancelada",
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
}

function getRemainingText(editableUntil: string | null | undefined, currentTime: number) {
  if (!editableUntil) return null

  const remainingMs = new Date(editableUntil).getTime() - currentTime
  if (remainingMs <= 0) return null

  const seconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60

  return `${minutes}:${restSeconds.toString().padStart(2, "0")}`
}

export function TableOrders({
  tableId,
  sessionId,
  products,
  settings,
  refreshKey,
  onEditOrder,
}: TableOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  const loadOrders = useCallback(async () => {
    if (!tableId || !sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      setOrders(await fetchPublicOrders(tableId, sessionId))
    } catch (loadError) {
      console.error(loadError)
      setError("No pudimos cargar las ordenes de esta mesa.")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, tableId])

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

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )

  if (!tableId || !sessionId) return null

  return (
    <section className="mb-6 rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Tu orden</h2>
          <p className="text-sm text-muted-foreground">Ordenes ligadas a esta mesa</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadOrders()}>
          Actualizar
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando ordenes...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aun no hay ordenes para esta sesion.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const remainingText = getRemainingText(order.editableUntil, currentTime)
            const isEditable = order.status === "pending" && Boolean(remainingText)
            const editableItems = order.items
              .map((item) => {
                const product = productById.get(item.productId)
                return product ? { product, quantity: item.quantity } : null
              })
              .filter(Boolean) as CartItem[]

            return (
              <div key={order.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">Orden #{order.orderNumber}</div>
                  <Badge variant={order.status === "pending" ? "secondary" : "outline"}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>

                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
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

                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    Total {formatPrice(order.total, settings.currency)}
                  </span>
                  {isEditable ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {remainingText}
                    </span>
                  ) : null}
                </div>

                {isEditable ? (
                  <Button
                    className="mt-3 w-full gap-2"
                    size="sm"
                    onClick={() => onEditOrder(order, editableItems)}
                    disabled={editableItems.length === 0}
                  >
                    <Pencil className="h-4 w-4" />
                    Modificar orden
                  </Button>
                ) : order.status === "pending" ? (
                  <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    El tiempo para modificar esta orden termino. Si necesitas algo
                    mas, solicita ayuda al personal.
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
