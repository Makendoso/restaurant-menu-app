export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  categoryId: string
  available: boolean
}

export type Category = {
  id: string
  name: string
  icon: string
}

export type CreateCategoryInput = {
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
export type OrderSessionStatus = "active" | "closed" | "expired"

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
  tableId?: string | null
  sessionId?: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  isPaid: boolean
  notes?: string
  createdAt: string
}

export interface RestaurantTable {
  id: string
  number: number
  qrToken: string
  isActive: boolean
  createdAt: string
}

export interface OrderSession {
  id: string
  tableId: string
  status: OrderSessionStatus
  startedAt: string
  expiresAt: string
  createdAt: string
}

export interface TableSessionState {
  table: RestaurantTable | null
  session: OrderSession | null
  status: "idle" | "loading" | "ready" | "invalid" | "expired" | "closed" | "error"
  message: string | null
}
