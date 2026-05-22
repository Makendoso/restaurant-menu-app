"use client"

import { useState } from "react"
import { useCart, useRestaurantData } from "@/context/restaurant-context"
import { MessageCircle } from "lucide-react"
import { toast } from "sonner"

export function WhatsAppFab() {
  const { settings, addOrder } = useRestaurantData()
  const { cart, getCartTotal, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: settings.currency,
    }).format(price)
  }

  const generateWhatsAppMessage = (orderNumber?: number) => {
    if (cart.length === 0) {
      return encodeURIComponent("Hello! I would like to see the menu.")
    }

    let message = `Hello! I would like to place an order`

    if (orderNumber) {
      message += ` #${orderNumber}`
    }

    message += `:\n\n`
    
    cart.forEach((item) => {
      message += `${item.quantity}x ${item.product.name} - ${formatPrice(item.product.price * item.quantity)}\n`
    })
    
    message += `\n*Total: ${formatPrice(getCartTotal())}*`
    message += `\n\nThank you!`
    
    return encodeURIComponent(message)
  }

  const handleClick = async () => {
    if (isSubmitting) return

    if (cart.length === 0) {
      const message = generateWhatsAppMessage()
      const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${message}`

      window.open(whatsappUrl, "_blank")
      toast.success("Opening WhatsApp...")
      return
    }

    setIsSubmitting(true)

    try {
      const savedOrder = await addOrder({
        customerName: "WhatsApp Customer",
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: getCartTotal(),
        status: "preparing",
        isPaid: false,
      })

      const message = generateWhatsAppMessage(savedOrder.orderNumber)
      const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${message}`

      window.open(whatsappUrl, "_blank")
      clearCart()
      toast.success(`Order #${savedOrder.orderNumber} saved`)
    } catch (error) {
      console.error(error)
      toast.error("Could not save the order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSubmitting}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/90 text-white shadow-md shadow-black/15 transition hover:bg-[#25D366] hover:shadow-lg active:scale-95 disabled:opacity-70 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      aria-label="Contact via WhatsApp"
    >
      <MessageCircle className="h-5 w-5 sm:h-7 sm:w-7" />
    </button>
  )
}
