"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Store } from "lucide-react"
import { toast } from "sonner"

export function RestaurantProfileTab() {
  const { settings, updateSettings } = useRestaurantData()
  const [formData, setFormData] = useState({
    name: settings.name,
  })
  const [isSaving, setIsSaving] = useState(false)
  const hasChanges = formData.name !== settings.name

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextSettings = {
      name: formData.name.trim(),
    }

    if (!nextSettings.name) {
      toast.error("El nombre del restaurante es obligatorio")
      return
    }

    setIsSaving(true)

    try {
      await updateSettings(nextSettings)
      setFormData(nextSettings)
      toast.success("Perfil del restaurante guardado")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo guardar el perfil")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Perfil del restaurante</h2>
        <p className="text-sm text-muted-foreground">
          Edita los datos publicos que ve el cliente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div className="space-y-2">
          <Label htmlFor="restaurant-name" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Nombre del restaurante
          </Label>
          <Input
            id="restaurant-name"
            value={formData.name}
            onChange={(event) =>
              setFormData({ ...formData, name: event.target.value })
            }
            placeholder="Nombre del restaurante"
          />
          <p className="text-xs text-muted-foreground">
            Este nombre se muestra en el menu y en el panel de ordenes.
          </p>
        </div>

        <Button
          type="submit"
          disabled={!hasChanges || isSaving}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  )
}
