"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRestaurantData } from "@/context/restaurant-context"
import { useTableSession } from "@/hooks/use-table-session"

import { Navbar } from "@/components/menu/navbar"
import { CategoryFilter } from "@/components/menu/category-filter"
import { ProductCard } from "@/components/menu/product-card"
import { ProductGridSkeleton } from "@/components/menu/product-skeleton"
import { CartDrawer } from "@/components/menu/cart-drawer"
import { TableOrders } from "@/components/menu/table-orders"

import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function MenuPageContent() {
  const { settings, products, categories, isLoading, error } =
    useRestaurantData()
  const searchParams = useSearchParams()
  const qrToken = searchParams.get("t")
  const tableSession = useTableSession(qrToken)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0)

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === null || product.categoryId === selectedCategory

      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchQuery])

  const getCategoryName = (categoryId: string | null) => {
    if (categoryId === null) {
      return "All Items"
    }

    const category = categories.find((item) => item.id === categoryId)

    return category?.name || "All Items"
  }

  const handleOrderSaved = () => {
    setOrdersRefreshKey((value) => value + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onCartClick={() => setIsCartOpen(true)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
      />

      <main className="container mx-auto px-4 py-6 pb-24 sm:pb-10">
        <section className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-balance">
            Bienvenidos a {settings.name}
          </h1>

          <p className="mt-2 text-muted-foreground">
            Explora nuestro menu y haz tu pedido directamente desde aqui.
          </p>

          <div className="mt-4 flex justify-center">
            {tableSession.table && tableSession.status === "ready" ? (
              <Badge variant="secondary">
                Mesa {tableSession.table.number}
              </Badge>
            ) : tableSession.message ? (
              <div className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                {tableSession.message}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mb-6">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </section>

        {tableSession.status === "ready" && (
          <TableOrders
            tableId={tableSession.table?.id}
            sessionId={tableSession.session?.id}
            settings={settings}
            refreshKey={ordersRefreshKey}
          />
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {getCategoryName(selectedCategory)}
            </h2>

            <span className="text-sm text-muted-foreground">
              {filteredProducts.length} item
              {filteredProducts.length !== 1 && "s"}
            </span>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 py-16 text-center">
              <h3 className="text-lg font-semibold">No pudimos cargar el menu</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : isLoading ? (
            <ProductGridSkeleton />
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>

              <h3 className="mt-4 text-lg font-semibold">No items found</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No items in this category"}
              </p>

              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory(null)
                  }}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
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
