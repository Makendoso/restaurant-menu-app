"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRestaurantData } from "@/context/restaurant-context"
import { useTableSession } from "@/hooks/use-table-session"

import { Navbar } from "@/components/menu/navbar"
import { CartDrawer } from "@/components/menu/cart-drawer"
import {
  CustomerBottomNav,
  type CustomerTab,
} from "@/components/menu/customer-bottom-nav"
import { CustomerMenuSection } from "@/components/menu/customer-menu-section"
import { TableOrders } from "@/components/menu/table-orders"

import { Badge } from "@/components/ui/badge"

function MenuPageContent() {
  const { settings, products, categories, isLoading, error } =
    useRestaurantData()
  const searchParams = useSearchParams()
  const qrToken = searchParams.get("t")
  const tableSession = useTableSession(qrToken)

  const [searchQuery, setSearchQuery] = useState("")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<CustomerTab>("menu")
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0)

  const handleOrderSaved = () => {
    setOrdersRefreshKey((value) => value + 1)
    setActiveTab("orders")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onCartClick={() => setIsCartOpen(true)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
      />

      <main className="container mx-auto px-4 py-6 pb-28 sm:pb-10">
        <section className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Bienvenidos a {settings.name}
          </h1>

          <p className="mt-2 text-muted-foreground">
            Explora nuestro menu y haz tu pedido directamente desde aqui.
          </p>

          <div className="mt-4 flex justify-center">
            {tableSession.table && tableSession.status === "ready" ? (
              <Badge variant="secondary">Mesa {tableSession.table.number}</Badge>
            ) : tableSession.message ? (
              <div className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                {tableSession.message}
              </div>
            ) : null}
          </div>
        </section>

        <CustomerBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "menu" ? (
          <CustomerMenuSection
            products={products}
            categories={categories}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
            onSearchClear={() => setSearchQuery("")}
          />
        ) : (
          <section>
            <div className="mb-5">
              <p className="text-sm font-medium text-primary">Ordenes</p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Consulta el estado
              </h2>
            </div>

            {tableSession.table && tableSession.session ? (
              <TableOrders
                tableId={tableSession.table.id}
                sessionId={tableSession.session.id}
                settings={settings}
                refreshKey={ordersRefreshKey}
              />
            ) : (
              <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                {tableSession.message ||
                  "Escanea el QR de tu mesa para consultar tus ordenes."}
              </div>
            )}
          </section>
        )}
      </main>

      <CartDrawer
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        tableSession={tableSession}
        onOrderSaved={handleOrderSaved}
        onSessionInvalid={tableSession.invalidateSession}
      />
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={null}>
      <MenuPageContent />
    </Suspense>
  )
}
