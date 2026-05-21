export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  categoryId: string
  available: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface RestaurantSettings {
  name: string
  whatsappNumber: string
  currency: string
  logo?: string
}

export type OrderStatus = "preparing" | "ready" | "delivered"

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  notes?: string
}

export interface Order {
  id: string
  orderNumber: number
  customerName: string
  tableNumber?: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  isPaid: boolean
  notes?: string
  createdAt: string
}
