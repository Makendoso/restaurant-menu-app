"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { Product } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

export function ProductsTab() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductAvailability,
    settings,
  } = useRestaurantData()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    categoryId: "",
    available: true,
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: settings.currency,
    }).format(price)
  }

  const isValidImageUrl = (value: string) => {
    if (!value.trim()) return true

    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image: "",
      categoryId: categories[0]?.id || "",
      available: true,
    })
    setEditingProduct(null)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      image: product.image,
      categoryId: product.categoryId,
      available: product.available,
    })
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const name = formData.name.trim()
    const description = formData.description.trim()
    const image = formData.image.trim()
    const price = Number(formData.price)

    if (!name || !formData.price || !formData.categoryId) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Price must be greater than zero")
      return
    }

    if (!categories.some((category) => category.id === formData.categoryId)) {
      toast.error("Please select a valid category")
      return
    }

    if (!isValidImageUrl(image)) {
      toast.error("Image URL must start with http:// or https://")
      return
    }

    const productData = {
      name,
      description,
      price,
      image:
        image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
      categoryId: formData.categoryId,
      available: formData.available,
    }

    setIsSaving(true)

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData)
        toast.success("Product updated successfully")
      } else {
        await addProduct(productData)
        toast.success("Product added successfully")
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error(error)
      toast.error("Could not save product")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await deleteProduct(product.id)
        toast.success("Product deleted")
      } catch (error) {
        console.error(error)
        toast.error("Could not delete product")
      }
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown"
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage your menu items
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ({settings.currency}) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="available">Available</Label>
                <Switch
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, available: checked })
                  }
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
                  {isSaving
                    ? "Saving..."
                    : `${editingProduct ? "Update" : "Add"} Product`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No products yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first product to get started
            </p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-4 rounded-lg border bg-background p-3"
            >
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{product.name}</h3>
                  {!product.available && (
                    <span className="flex-shrink-0 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {getCategoryName(product.categoryId)} • {formatPrice(product.price)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={product.available}
                  disabled={pendingProductId === product.id}
                  onCheckedChange={async () => {
                    setPendingProductId(product.id)
                    try {
                      await toggleProductAvailability(product.id)
                    } catch (error) {
                      console.error(error)
                      toast.error("Could not update availability")
                    } finally {
                      setPendingProductId(null)
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(product)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
