"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { Category } from "@/types"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Pencil,
  Trash2,
  Salad,
  Utensils,
  Sandwich,
  Pizza,
  CupSoda,
  Cake,
  FolderOpen,
} from "lucide-react"
import { toast } from "sonner"

const iconOptions = [
  { value: "salad", label: "Salad", icon: Salad },
  { value: "utensils", label: "Utensils", icon: Utensils },
  { value: "hamburger", label: "Burger", icon: Sandwich },
  { value: "pizza", label: "Pizza", icon: Pizza },
  { value: "cup-soda", label: "Drink", icon: CupSoda },
  { value: "cake", label: "Cake", icon: Cake },
]

const iconMap: Record<string, React.ElementType> = {
  salad: Salad,
  utensils: Utensils,
  hamburger: Sandwich,
  pizza: Pizza,
  "cup-soda": CupSoda,
  cake: Cake,
}

export function CategoriesTab() {
  const { categories, products, addCategory, updateCategory, deleteCategory } =
    useRestaurantData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    icon: "utensils",
  })

  const resetForm = () => {
    setFormData({ name: "", icon: "utensils" })
    setEditingCategory(null)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon,
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

    if (!name) {
      toast.error("Please enter a category name")
      return
    }

    const duplicateCategory = categories.some(
      (category) =>
        category.name.toLowerCase() === name.toLowerCase() &&
        category.id !== editingCategory?.id
    )

    if (duplicateCategory) {
      toast.error("A category with that name already exists")
      return
    }

    const categoryData = {
      ...formData,
      name,
    }

    setIsSaving(true)

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData)
        toast.success("Category updated successfully")
      } else {
        await addCategory(categoryData)
        toast.success("Category added successfully")
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error(error)
      toast.error("Could not save category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (category: Category) => {
    const productsInCategory = products.filter(
      (p) => p.categoryId === category.id
    )

    if (productsInCategory.length > 0) {
      toast.error(
        `Cannot delete "${category.name}" - it has ${productsInCategory.length} product(s)`
      )
      return
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await deleteCategory(category.id)
        toast.success("Category deleted")
      } catch (error) {
        console.error(error)
        toast.error("Could not delete category")
      }
    }
  }

  const getProductCount = (categoryId: string) => {
    return products.filter((p) => p.categoryId === categoryId).length
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Organize your menu items
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add New Category"}
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
                  placeholder="Category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
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
                    : `${editingCategory ? "Update" : "Add"} Category`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No categories yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first category to organize your menu
            </p>
          </div>
        ) : (
          categories.map((category) => {
            const Icon = iconMap[category.icon] || Utensils
            const productCount = getProductCount(category.id)
            return (
              <div
                key={category.id}
                className="flex items-center gap-4 rounded-lg border bg-background p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {productCount} product{productCount !== 1 && "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
