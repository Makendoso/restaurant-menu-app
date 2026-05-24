"use client"

import { Product } from "@/types"
import { useCart, useRestaurantData } from "@/context/restaurant-context"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { settings } = useRestaurantData()
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart()
  
  const cartItem = cart.find((item) => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0
  const badges = [
    product.featured ? { label: "⭐ Destacado", className: "bg-primary/10 text-primary" } : null,
  ].filter(Boolean) as Array<{ label: string; className: string }>

  const handleAddToCart = () => {
    addToCart(product)
    toast.success(`${product.name} agregado al carrito`)
  }

  const handleIncrement = () => {
    addToCart(product)
  }

  const handleDecrement = () => {
    if (quantity === 1) {
      removeFromCart(product.id)
      toast.info(`${product.name} eliminado del carrito`)
    } else {
      updateQuantity(product.id, quantity - 1)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: settings.currency,
    }).format(price)
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg",
        !product.available && "opacity-60"
      )}
    >
      {/* Imagen */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="rounded-full bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground">
              No disponible
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex min-h-6 flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                badge.className
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-semibold leading-tight text-card-foreground">
          {product.name}
        </h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {product.description}
        </p>

        {/* Precio y carrito */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </span>

          {product.available && (
            <>
              {quantity === 0 ? (
                <Button
                  onClick={handleAddToCart}
                  size="sm"
                  className="rounded-full"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDecrement}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold">
                    {quantity}
                  </span>
                  <Button
                    onClick={handleIncrement}
                    size="icon"
                    className="h-8 w-8 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
