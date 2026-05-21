import { supabase } from "@/lib/supabase"
import type {
  Category,
  Order,
  OrderStatus,
  Product,
  RestaurantSettings,
} from "@/types"

export type SettingsRow = RestaurantSettings & { id?: string }
export type OrderInsert = Omit<Order, "id" | "orderNumber" | "createdAt">

export async function fetchRestaurantData() {
  const [productsResult, categoriesResult, settingsResult, ordersResult] =
    await Promise.all([
      supabase.from("products").select("*").order("created_at"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("settings").select("*").limit(1).maybeSingle(),
      supabase.from("orders").select("*").order("createdAt", {
        ascending: false,
      }),
    ])

  if (productsResult.error) throw productsResult.error
  if (categoriesResult.error) throw categoriesResult.error
  if (settingsResult.error) throw settingsResult.error
  if (ordersResult.error) throw ordersResult.error

  return {
    products: (productsResult.data || []) as Product[],
    categories: (categoriesResult.data || []) as Category[],
    settings: settingsResult.data as SettingsRow | null,
    orders: (ordersResult.data || []) as Order[],
  }
}

export async function createProduct(product: Omit<Product, "id">) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select("*")
    .single()

  if (error) throw error
  return data as Product
}

export async function saveProduct(id: string, product: Partial<Product>) {
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error
  return data as Product
}

export async function removeProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
}

export async function createCategory(category: Omit<Category, "id">) {
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select("*")
    .single()

  if (error) throw error
  return data as Category
}

export async function saveCategory(id: string, category: Partial<Category>) {
  const { data, error } = await supabase
    .from("categories")
    .update(category)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error
  return data as Category
}

export async function removeCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) throw error
}

export async function saveSettings(
  settings: RestaurantSettings,
  settingsId: string | null
) {
  if (settingsId) {
    const { data, error } = await supabase
      .from("settings")
      .update(settings)
      .eq("id", settingsId)
      .select("*")
      .single()

    if (error) throw error
    return data as SettingsRow
  }

  const { data, error } = await supabase
    .from("settings")
    .insert(settings)
    .select("*")
    .single()

  if (error) throw error
  return data as SettingsRow
}

export async function saveOrderStatus(orderId: string, status: OrderStatus) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) throw error
  return data as Order
}

export async function saveOrderPayment(orderId: string, isPaid: boolean) {
  const { data, error } = await supabase
    .from("orders")
    .update({ isPaid })
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) throw error
  return data as Order
}

export async function createOrder(order: OrderInsert) {
  const { data, error } = await supabase.rpc("create_public_order", {
    customer_name: order.customerName,
    table_number: order.tableNumber || null,
    order_items: order.items,
    order_total: order.total,
    order_notes: order.notes || null,
  })

  if (error) throw error
  return Array.isArray(data) ? (data[0] as Order) : (data as Order)
}
