"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { CategoryFilter } from "@/components/menu/category-filter"
import { ProductCard } from "@/components/menu/product-card"
import { ProductGridSkeleton } from "@/components/menu/product-skeleton"
import type { Category, Product } from "@/types"

type CustomerMenuSectionProps = {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  onSearchClear: () => void
}

export function CustomerMenuSection({
  products,
  categories,
  isLoading,
  error,
  searchQuery,
  onSearchClear,
}: CustomerMenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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
    if (categoryId === null) return "Todos"

    const category = categories.find((item) => item.id === categoryId)
    return category?.name || "Todos"
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    onSearchClear()
  }

  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-medium text-primary">Menu</p>
        <h2 className="text-2xl font-semibold tracking-tight">Elige productos</h2>
      </div>

      <div className="mb-6">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {getCategoryName(selectedCategory)}
        </h3>

        <span className="text-sm text-muted-foreground">
          {filteredProducts.length} producto
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

          <h3 className="mt-4 text-lg font-semibold">No encontramos productos</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? `No hay resultados para "${searchQuery}"`
              : "No hay productos en esta categoria"}
          </p>

          {(searchQuery || selectedCategory) && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Limpiar filtros
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
  )
}
