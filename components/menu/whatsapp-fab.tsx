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
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      aria-label="Contact via WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  )
}
