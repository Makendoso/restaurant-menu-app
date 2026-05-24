"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react"
import type {
  Product,
  Category,
  CreateCategoryInput,
  CartItem,
  RestaurantSettings,
  RestaurantTable,
  Order,
  OrderSession,
  OrderStatus,
} from "@/types"
import { defaultSettings } from "@/lib/data"
import {
  createCategory,
  createOrder,
  cleanupOldRestaurantData,
  createProduct,
  createRestaurantTable,
  createOrderSessionForTable,
  fetchRestaurantData,
  closeOrderSession,
  removeCategory,
  removeProduct,
  saveCategory,
  saveRestaurantTableActive,
  saveOrderPayment,
  saveOrderStatus,
  saveProduct,
  saveSettings,
  type OrderInsert,
  type CleanupOldRestaurantDataResult,
  type SettingsRow,
} from "@/services/restaurant-service"

interface RestaurantDataContextType {
  products: Product[]
  categories: Category[]
  settings: RestaurantSettings
  orders: Order[]
  tables: RestaurantTable[]
  sessions: OrderSession[]
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  addTable: (number: number) => Promise<void>
  setTableActive: (tableId: string, isActive: boolean) => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
  createSessionForTable: (tableId: string) => Promise<void>
  addProduct: (product: Omit<Product, "id">) => Promise<void>
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  addCategory: (category: CreateCategoryInput) => Promise<void>
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  updateSettings: (settings: Partial<RestaurantSettings>) => Promise<void>
  toggleProductAvailability: (id: string) => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  advanceOrderStatus: (orderId: string) => Promise<void>
  toggleOrderPayment: (orderId: string) => Promise<void>
  cleanupOldData: (retentionDays?: number) => Promise<CleanupOldRestaurantDataResult>
  addOrder: (order: OrderInsert) => Promise<Order>
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartCount: () => number
}

type RestaurantContextType = RestaurantDataContextType & CartContextType

const RestaurantDataContext = createContext<
  RestaurantDataContextType | undefined
>(undefined)
const CartContext = createContext<CartContextType | undefined>(undefined)

function normalizeSettings(row: SettingsRow | null): RestaurantSettings {
  return {
    ...defaultSettings,
    ...(row || {}),
  }
}

function getNextOrderStatus(status: OrderStatus): OrderStatus {
  const statusOrder: OrderStatus[] = [
    "pending",
    "preparing",
    "ready",
    "delivered",
  ]
  const currentIndex = statusOrder.indexOf(status)
  return statusOrder[Math.min(currentIndex + 1, statusOrder.length - 1)]
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  return (
    <RestaurantDataProvider>
      <CartProvider>{children}</CartProvider>
    </RestaurantDataProvider>
  )
}

function RestaurantDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [sessions, setSessions] = useState<OrderSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchRestaurantData()

      setProducts(data.products)
      setCategories(data.categories)
      setSettings(normalizeSettings(data.settings))
      setSettingsId(data.settings?.id || null)
      setOrders(data.orders)
      setTables(data.tables)
      setSessions(data.sessions)
    } catch (loadError) {
      console.error(loadError)
      setError("No se pudieron cargar los datos del restaurante.")
      throw loadError
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData().catch(() => undefined)
  }, [refreshData])

  const addProduct = useCallback(async (product: Omit<Product, "id">) => {
    const createdProduct = await createProduct(product)
    setProducts((prev) => [...prev, createdProduct])
  }, [])

  const addTable = useCallback(async (number: number) => {
    const createdTable = await createRestaurantTable(number)
    setTables((prev) => [...prev, createdTable].sort((a, b) => a.number - b.number))
  }, [])

  const setTableActive = useCallback(
    async (tableId: string, isActive: boolean) => {
      const updatedTable = await saveRestaurantTableActive(tableId, isActive)
      setTables((prev) =>
        prev.map((table) => (table.id === tableId ? updatedTable : table))
      )
    },
    []
  )

  const closeSession = useCallback(async (sessionId: string) => {
    const updatedSession = await closeOrderSession(sessionId)
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? updatedSession : session
      )
    )
  }, [])

  const createSessionForTable = useCallback(async (tableId: string) => {
    const createdSession = await createOrderSessionForTable(tableId)
    setSessions((prev) => [
      createdSession,
      ...prev.map((session) =>
        session.tableId === tableId && session.status === "active"
          ? { ...session, status: "closed" as const }
          : session
      ),
    ])
  }, [])

  const updateProduct = useCallback(
    async (id: string, product: Partial<Product>) => {
      const updatedProduct = await saveProduct(id, product)
      setProducts((prev) =>
        prev.map((existing) =>
          existing.id === id ? updatedProduct : existing
        )
      )
    },
    []
  )

  const deleteProduct = useCallback(async (id: string) => {
    await removeProduct(id)
    setProducts((prev) => prev.filter((product) => product.id !== id))
  }, [])

  const toggleProductAvailability = useCallback(
    async (id: string) => {
      const product = products.find((item) => item.id === id)
      if (!product) return

      await updateProduct(id, { available: !product.available })
    },
    [products, updateProduct]
  )

  const addCategory = useCallback(async (category: CreateCategoryInput) => {
    const createdCategory = await createCategory(category)
    setCategories((prev) => [...prev, createdCategory])
  }, [])

  const updateCategory = useCallback(
    async (id: string, category: Partial<Category>) => {
      const updatedCategory = await saveCategory(id, category)
      setCategories((prev) =>
        prev.map((existing) =>
          existing.id === id ? updatedCategory : existing
        )
      )
    },
    []
  )

  const deleteCategory = useCallback(async (id: string) => {
    await removeCategory(id)
    setCategories((prev) => prev.filter((category) => category.id !== id))
  }, [])

  const updateSettings = useCallback(
    async (newSettings: Partial<RestaurantSettings>) => {
      const savedSettings = await saveSettings(
        { ...settings, ...newSettings },
        settingsId
      )

      setSettings(normalizeSettings(savedSettings))
      setSettingsId(savedSettings.id || null)
    },
    [settings, settingsId]
  )

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const updatedOrder = await saveOrderStatus(orderId, status)
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updatedOrder : order))
      )
    },
    []
  )

  const advanceOrderStatus = useCallback(
    async (orderId: string) => {
      const order = orders.find((item) => item.id === orderId)
      if (!order) return

      await updateOrderStatus(orderId, getNextOrderStatus(order.status))
    },
    [orders, updateOrderStatus]
  )

  const toggleOrderPayment = useCallback(
    async (orderId: string) => {
      const order = orders.find((item) => item.id === orderId)
      if (!order) return

      const updatedOrder = await saveOrderPayment(orderId, !order.isPaid)
      setOrders((prev) =>
        prev.map((existing) =>
          existing.id === orderId ? updatedOrder : existing
        )
      )
    },
    [orders]
  )

  const cleanupOldData = useCallback(async (retentionDays = 7) => {
    const result = await cleanupOldRestaurantData(retentionDays)
    await refreshData()
    return result
  }, [refreshData])

  const addOrder = useCallback(async (order: OrderInsert) => {
    const createdOrder = await createOrder(order)
    setOrders((prev) => [createdOrder, ...prev])
    return createdOrder
  }, [])

  const value = useMemo(
    () => ({
      products,
      categories,
      settings,
      orders,
      tables,
      sessions,
      isLoading,
      error,
      refreshData,
      addTable,
      setTableActive,
      closeSession,
      createSessionForTable,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      toggleProductAvailability,
      updateOrderStatus,
      advanceOrderStatus,
      toggleOrderPayment,
      cleanupOldData,
      addOrder,
    }),
    [
      products,
      categories,
      settings,
      orders,
      tables,
      sessions,
      isLoading,
      error,
      refreshData,
      addTable,
      setTableActive,
      closeSession,
      createSessionForTable,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      toggleProductAvailability,
      updateOrderStatus,
      advanceOrderStatus,
      toggleOrderPayment,
      cleanupOldData,
      addOrder,
    ]
  )

  return (
    <RestaurantDataContext.Provider value={value}>
      {children}
    </RestaurantDataContext.Provider>
  )
}

function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartLoaded, setIsCartLoaded] = useState(false)

  useEffect(() => {
    function loadCart() {
      try {
        const savedCart = window.localStorage.getItem("restaurant_cart")
        setCart(savedCart ? JSON.parse(savedCart) : [])
      } catch (cartError) {
        console.error(cartError)
        setCart([])
      } finally {
        setIsCartLoaded(true)
      }
    }

    function syncCart(event: StorageEvent) {
      if (event.key !== "restaurant_cart") return

      try {
        setCart(event.newValue ? JSON.parse(event.newValue) : [])
      } catch (cartError) {
        console.error(cartError)
        setCart([])
      }
    }

    loadCart()
    window.addEventListener("storage", syncCart)

    return () => window.removeEventListener("storage", syncCart)
  }, [])

  useEffect(() => {
    if (!isCartLoaded) return

    window.localStorage.setItem("restaurant_cart", JSON.stringify(cart))
  }, [cart, isCartLoaded])

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.product.id === product.id)

      if (existingItem) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => setCart([]), [])

  const getCartTotal = useCallback(
    () =>
      cart.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0
      ),
    [cart]
  )

  const getCartCount = useCallback(
    () => cart.reduce((count, item) => count + item.quantity, 0),
    [cart]
  )

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useRestaurantData() {
  const context = useContext(RestaurantDataContext)

  if (context === undefined) {
    throw new Error("useRestaurantData must be used within RestaurantProvider")
  }

  return context
}

export function useCart() {
  const context = useContext(CartContext)

  if (context === undefined) {
    throw new Error("useCart must be used within RestaurantProvider")
  }

  return context
}

export function useRestaurant(): RestaurantContextType {
  return {
    ...useRestaurantData(),
    ...useCart(),
  }
}
