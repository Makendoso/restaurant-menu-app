import { supabase } from "@/lib/supabase"
import type {
  Category,
  CreateCategoryInput,
  Order,
  OrderSession,
  OrderSessionStatus,
  OrderStatus,
  Product,
  RestaurantTable,
  RestaurantSettings,
  TableSessionState,
} from "@/types"

export type SettingsRow = RestaurantSettings & { id?: string }
export type OrderInsert = Omit<Order, "id" | "orderNumber" | "createdAt">
export type CleanupOldRestaurantDataResult = {
  deletedOrders: number
  deletedSessions: number
}
export type TableSessionValidation = {
  valid: boolean
  message: string | null
  table: RestaurantTable | null
  session: OrderSession | null
}

type RestaurantTableRow = {
  id: string
  number: number
  qr_token: string
  is_active: boolean
  created_at: string
}

type OrderSessionRow = {
  id: string
  table_id: string
  status: OrderSessionStatus
  started_at: string
  last_activity_at?: string
  expires_at: string
  created_at: string
}

type SessionRpcRow = {
  session_id: string
  table_id: string
  table_number: number
  session_status: OrderSessionStatus
  started_at: string
  last_activity_at?: string
  expires_at: string
}

type SessionValidationRpcRow = {
  valid: boolean
  message: string | null
  table_id: string | null
  table_number: number | null
  session_id: string | null
  session_status: OrderSessionStatus | null
  started_at: string | null
  last_activity_at?: string | null
  expires_at: string | null
}

type OrderRow = Order & {
  table_id?: string | null
  session_id?: string | null
}

function mapRestaurantTable(row: RestaurantTableRow): RestaurantTable {
  return {
    id: row.id,
    number: row.number,
    qrToken: row.qr_token,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

function mapOrderSession(row: OrderSessionRow): OrderSession {
  return {
    id: row.id,
    tableId: row.table_id,
    status: row.status,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

function mapSessionRpcRow(row: SessionRpcRow): TableSessionState {
  return {
    table: {
      id: row.table_id,
      number: row.table_number,
      qrToken: "",
      isActive: true,
      createdAt: "",
    },
    session: {
      id: row.session_id,
      tableId: row.table_id,
      status: row.session_status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      expiresAt: row.expires_at,
      createdAt: row.started_at,
    },
    status: row.session_status === "active" ? "ready" : row.session_status,
    message: null,
  }
}

function mapSessionValidationRow(
  row: SessionValidationRpcRow
): TableSessionValidation {
  return {
    valid: row.valid,
    message: row.message,
    table:
      row.valid && row.table_id && row.table_number !== null
        ? {
            id: row.table_id,
            number: row.table_number,
            qrToken: "",
            isActive: true,
            createdAt: "",
          }
        : null,
    session:
      row.valid &&
      row.session_id &&
      row.table_id &&
      row.session_status &&
      row.started_at &&
      row.expires_at
        ? {
            id: row.session_id,
            tableId: row.table_id,
            status: row.session_status,
            startedAt: row.started_at,
            lastActivityAt: row.last_activity_at || undefined,
            expiresAt: row.expires_at,
            createdAt: row.started_at,
          }
        : null,
  }
}

function mapOrder(row: OrderRow): Order {
  return {
    ...row,
    tableId: row.tableId ?? row.table_id ?? null,
    sessionId: row.sessionId ?? row.session_id ?? null,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string") return message
  }

  return ""
}

export function parseTableNumberFromId(tableId: string) {
  const normalized = tableId.trim().toLowerCase()
  const match = normalized.match(/^(?:mesa-|table-)?0*(\d+)$/)
  if (!match) return null

  const number = Number(match[1])
  return Number.isInteger(number) && number > 0 ? number : null
}

export function formatTablePathId(tableNumber: number) {
  return `mesa-${String(tableNumber).padStart(2, "0")}`
}

export function getRestaurantServiceErrorMessage(
  error: unknown,
  fallback: string
) {
  const message = getErrorMessage(error)

  if (
    message.toLowerCase().includes("row-level security") ||
    message.toLowerCase().includes("permission denied") ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "42501")
  ) {
    return "No tienes permiso para guardar este cambio. Vuelve a iniciar sesion o revisa las politicas RLS de Supabase."
  }

  if (message.toLowerCase().includes("jwt")) {
    return "Tu sesion de administrador expiro. Vuelve a iniciar sesion e intenta otra vez."
  }

  return message ? `${fallback}: ${message}` : fallback
}

async function requireAdminSession(action: string) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw error

  if (!session) {
    throw new Error(
      `Debes iniciar sesion como administrador para ${action}.`
    )
  }
}

export async function fetchRestaurantData() {
  await supabase.rpc("expire_order_sessions")

  const [
    productsResult,
    categoriesResult,
    settingsResult,
    ordersResult,
    tablesResult,
    sessionsResult,
  ] =
    await Promise.all([
      supabase.from("products").select("*").order("created_at"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("settings").select("*").limit(1).maybeSingle(),
      supabase.from("orders").select("*").order("createdAt", {
        ascending: false,
      }),
      supabase.from("restaurant_tables").select("*").order("number"),
      supabase
        .from("order_sessions")
        .select("*")
        .order("created_at", { ascending: false }),
    ])

  if (productsResult.error) throw productsResult.error
  if (categoriesResult.error) throw categoriesResult.error
  if (settingsResult.error) throw settingsResult.error
  if (ordersResult.error) throw ordersResult.error
  if (tablesResult.error) throw tablesResult.error
  if (sessionsResult.error) throw sessionsResult.error

  return {
    products: (productsResult.data || []) as Product[],
    categories: (categoriesResult.data || []) as Category[],
    settings: settingsResult.data as SettingsRow | null,
    orders: ((ordersResult.data || []) as OrderRow[]).map(mapOrder),
    tables: ((tablesResult.data || []) as RestaurantTableRow[]).map(
      mapRestaurantTable
    ),
    sessions: ((sessionsResult.data || []) as OrderSessionRow[]).map(
      mapOrderSession
    ),
  }
}

export async function createProduct(product: Omit<Product, "id">) {
  await requireAdminSession("crear productos")

  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select("*")
    .single()

  if (error) throw error
  return data as Product
}

export async function saveProduct(id: string, product: Partial<Product>) {
  await requireAdminSession("editar productos")

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
  await requireAdminSession("eliminar productos")

  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
}

export async function createCategory(input: CreateCategoryInput) {
  await requireAdminSession("crear categorias")

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      icon: input.icon,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as Category
}

export async function saveCategory(id: string, category: Partial<Category>) {
  await requireAdminSession("editar categorias")

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
  await requireAdminSession("eliminar categorias")

  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) throw error
}

export async function saveSettings(
  settings: RestaurantSettings,
  settingsId: string | null
) {
  await requireAdminSession("editar la configuracion")

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
  await requireAdminSession("actualizar ordenes")

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) throw error
  return mapOrder(data as OrderRow)
}

export async function saveOrderPayment(orderId: string, isPaid: boolean) {
  await requireAdminSession("actualizar pagos")

  const { data, error } = await supabase
    .from("orders")
    .update({ isPaid })
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) throw error
  return mapOrder(data as OrderRow)
}

export async function createOrder(order: OrderInsert) {
  const { data, error } = await supabase.rpc("create_public_order", {
    customer_name: order.customerName,
    order_table_id: order.tableId || null,
    order_session_id: order.sessionId || null,
    order_items: order.items,
    order_total: order.total,
    order_notes: order.notes || null,
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return mapOrder(row as OrderRow)
}

export async function fetchPublicOrders(tableId: string, sessionId: string) {
  const { data, error } = await supabase.rpc("get_public_session_orders", {
    order_table_id: tableId,
    order_session_id: sessionId,
  })

  if (error) throw error
  return ((data || []) as OrderRow[]).map(mapOrder)
}

export async function validateTableSession(
  tableId: string,
  sessionId: string
): Promise<TableSessionValidation> {
  const { data, error } = await supabase.rpc("validate_table_session", {
    order_table_id: tableId,
    order_session_id: sessionId,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return {
      valid: false,
      message:
        "La sesion de esta mesa ya no esta disponible. Escanea nuevamente el QR o solicita ayuda al personal.",
      table: null,
      session: null,
    }
  }

  return mapSessionValidationRow(row as SessionValidationRpcRow)
}

export async function startOrResumeTableSession(
  qrToken: string,
  sessionId?: string | null
) {
  const { data, error } = await supabase.rpc("start_or_resume_order_session", {
    qr_token_input: qrToken,
    existing_session_id: sessionId || null,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return {
      table: null,
      session: null,
      status: "invalid",
      message: "La mesa no existe o esta desactivada.",
    } satisfies TableSessionState
  }

  return mapSessionRpcRow(row as SessionRpcRow)
}

export async function startOrResumeTableSessionById(
  tableId: string,
  sessionId?: string | null
) {
  const tableNumber = parseTableNumberFromId(tableId)

  if (!tableNumber) {
    return {
      table: null,
      session: null,
      status: "invalid",
      message: "La mesa no existe o esta desactivada.",
    } satisfies TableSessionState
  }

  const { data, error } = await supabase.rpc(
    "start_or_resume_order_session_by_number",
    {
      table_number_input: tableNumber,
      existing_session_id: sessionId || null,
    }
  )

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return {
      table: null,
      session: null,
      status: "invalid",
      message: "La mesa no existe o esta desactivada.",
    } satisfies TableSessionState
  }

  return mapSessionRpcRow(row as SessionRpcRow)
}

export async function createRestaurantTable(number: number) {
  await requireAdminSession("crear mesas")

  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({ number })
    .select("*")
    .single()

  if (error) throw error
  return mapRestaurantTable(data as RestaurantTableRow)
}

export async function saveRestaurantTableActive(
  tableId: string,
  isActive: boolean
) {
  await requireAdminSession("actualizar mesas")

  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({ is_active: isActive })
    .eq("id", tableId)
    .select("*")
    .single()

  if (error) throw error
  return mapRestaurantTable(data as RestaurantTableRow)
}

export async function closeOrderSession(sessionId: string) {
  await requireAdminSession("cerrar sesiones")

  const { data, error } = await supabase
    .from("order_sessions")
    .update({ status: "closed" })
    .eq("id", sessionId)
    .select("*")
    .single()

  if (error) throw error
  return mapOrderSession(data as OrderSessionRow)
}

export async function createOrderSessionForTable(tableId: string) {
  await requireAdminSession("crear sesiones")

  const { error: closeError } = await supabase
    .from("order_sessions")
    .update({ status: "closed" })
    .eq("table_id", tableId)
    .eq("status", "active")

  if (closeError) throw closeError

  const expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("order_sessions")
    .insert({
      table_id: tableId,
      status: "active",
      last_activity_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select("*")
    .single()

  if (error) throw error
  return mapOrderSession(data as OrderSessionRow)
}

export async function cleanupOldRestaurantData(retentionDays = 7) {
  await requireAdminSession("limpiar datos antiguos")

  const normalizedRetentionDays = Math.floor(retentionDays)
  const safeRetentionDays = Number.isFinite(normalizedRetentionDays)
    ? Math.max(1, normalizedRetentionDays)
    : 7
  const { data, error } = await supabase.rpc("cleanup_old_restaurant_data", {
    retention_days: safeRetentionDays,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return {
    deletedOrders: Number(row?.deleted_orders || 0),
    deletedSessions: Number(row?.deleted_sessions || 0),
  } satisfies CleanupOldRestaurantDataResult
}
