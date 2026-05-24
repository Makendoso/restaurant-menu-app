"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { getRestaurantServiceErrorMessage } from "@/services/restaurant-service"
import type { Category, CreateCategoryInput } from "@/types"
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
  { value: "salad", label: "Ensalada", icon: Salad },
  { value: "utensils", label: "Cubiertos", icon: Utensils },
  { value: "hamburger", label: "Hamburguesa", icon: Sandwich },
  { value: "pizza", label: "Pizza", icon: Pizza },
  { value: "cup-soda", label: "Bebida", icon: CupSoda },
  { value: "cake", label: "Postre", icon: Cake },
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
  const [formData, setFormData] = useState<CreateCategoryInput>({
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
      toast.error("Ingresa el nombre de la categoria")
      return
    }

    const duplicateCategory = categories.some(
      (category) =>
        category.name.toLowerCase() === name.toLowerCase() &&
        category.id !== editingCategory?.id
    )

    if (duplicateCategory) {
      toast.error("Ya existe una categoria con ese nombre")
      return
    }

    const categoryData: CreateCategoryInput = {
      name,
      icon: formData.icon,
    }

    setIsSaving(true)

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData)
        toast.success("Categoria actualizada")
      } else {
        await addCategory(categoryData)
        toast.success("Categoria agregada")
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error(error)
      toast.error(
        getRestaurantServiceErrorMessage(error, "No se pudo guardar la categoria")
      )
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
        `No puedes eliminar "${category.name}" porque tiene ${productsInCategory.length} producto(s)`
      )
      return
    }

    if (confirm(`Seguro que deseas eliminar "${category.name}"?`)) {
      try {
        await deleteCategory(category.id)
        toast.success("Categoria eliminada")
      } catch (error) {
        console.error(error)
        toast.error(
          getRestaurantServiceErrorMessage(error, "No se pudo eliminar la categoria")
        )
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
          <h2 className="text-xl font-semibold">Categorias</h2>
          <p className="text-sm text-muted-foreground">
            Organiza los productos del menu
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar categoria" : "Agregar categoria"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nombre de la categoria"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icono</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un icono" />
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
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
                  {isSaving
                    ? "Guardando..."
                    : editingCategory
                      ? "Actualizar categoria"
                      : "Agregar categoria"}
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
            <h3 className="mt-4 font-semibold">Aun no hay categorias</h3>
            <p className="text-sm text-muted-foreground">
              Agrega la primera categoria para organizar el menu
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
                    {productCount} producto{productCount !== 1 && "s"}
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
