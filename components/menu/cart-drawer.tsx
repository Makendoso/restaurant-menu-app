"use client"

import { useState } from "react"
import { useCart, useRestaurantData } from "@/context/restaurant-context"
import { validateTableSession } from "@/services/restaurant-service"
import { TABLE_SESSION_UNAVAILABLE_MESSAGE } from "@/hooks/use-table-session"
import type { Order, TableSessionState } from "@/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Minus, Plus, Trash2, ShoppingBag, Send } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableSession: TableSessionState & {
    canCreateOrder: boolean
    expiredMessage: string
  }
  onOrderSaved?: (order: Order) => void
  onSessionInvalid?: () => void
}

export function CartDrawer({
  open,
  onOpenChange,
  tableSession,
  onOrderSaved,
  onSessionInvalid,
}: CartDrawerProps) {
  const { settings, addOrder } = useRestaurantData()
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal } =
    useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: settings.currency,
    }).format(price)
  }

  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      toast.error("Tu carrito esta vacio")
      return
    }

    if (!tableSession.canCreateOrder || !tableSession.table || !tableSession.session) {
      toast.error(tableSession.message || TABLE_SESSION_UNAVAILABLE_MESSAGE)
      return
    }

    setIsSubmitting(true)

    try {
      const validation = await validateTableSession(
        tableSession.table.id,
        tableSession.session.id
      )

      if (!validation.valid) {
        clearCart()
        onSessionInvalid?.()
        toast.error(validation.message || TABLE_SESSION_UNAVAILABLE_MESSAGE)
        return
      }

      const orderItems = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      }))

      const savedOrder = await addOrder({
        customerName: "Cliente",
        items: orderItems,
        total: getCartTotal(),
        status: "pending",
        isPaid: false,
        tableId: validation.table?.id || tableSession.table.id,
        sessionId: validation.session?.id || tableSession.session.id,
      })

      clearCart()
      onOrderSaved?.(savedOrder)
      onOpenChange(false)
      toast.success(
        `Orden #${savedOrder.orderNumber} enviada. Necesitas cambiar algo? Solicita ayuda al personal.`
      )
    } catch (error) {
      console.error(error)
      toast.error("No se pudo guardar la orden. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md px-4">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="h-5 w-5" />
            Tu orden
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Tu carrito esta vacio</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega productos para empezar
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="mt-2"
            >
              Ver menu
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="flex flex-col gap-4">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h4 className="font-medium leading-tight">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-primary">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            removeFromCart(item.product.id)
                            toast.info(`${item.product.name} eliminado`)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(getCartTotal())}
                </span>
              </div>
              {!tableSession.canCreateOrder && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  {tableSession.message || tableSession.expiredMessage}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSaveOrder}
                  size="lg"
                  disabled={isSubmitting || !tableSession.canCreateOrder}
                  className="w-full gap-2 rounded-xl text-base"
                >
                  <Send className="h-5 w-5" />
                  {isSubmitting
                    ? "Enviando orden..."
                    : "Enviar orden"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearCart()
                    toast.info("Carrito vaciado")
                  }}
                  className="w-full"
                >
                  Vaciar carrito
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
