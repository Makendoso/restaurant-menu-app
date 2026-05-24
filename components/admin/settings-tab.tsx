"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DollarSign, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getRestaurantServiceErrorMessage } from "@/services/restaurant-service"

const currencies = [
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "USD", label: "Dolar estadounidense (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "Libra esterlina (GBP)" },
  { value: "CAD", label: "Dolar canadiense (CAD)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
]

export function SettingsTab() {
  const { settings, updateSettings, cleanupOldData } = useRestaurantData()
  const [formData, setFormData] = useState({
    currency: settings.currency,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const hasChanges = formData.currency !== settings.currency

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextSettings = {
      currency: formData.currency,
    }

    if (!currencies.some((currency) => currency.value === nextSettings.currency)) {
      toast.error("Selecciona una moneda soportada")
      return
    }

    setIsSaving(true)

    try {
      await updateSettings(nextSettings)
      setFormData(nextSettings)
      toast.success("Ajustes privados guardados")
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron guardar los settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCleanup = async () => {
    const confirmed = window.confirm(
      "Esto eliminara ordenes y sesiones antiguas. No afecta productos, categorias, mesas ni configuracion. Deseas continuar?"
    )

    if (!confirmed) return

    setIsCleaning(true)

    try {
      const result = await cleanupOldData(7)
      toast.success(
        `Limpieza completada: ${result.deletedOrders} ordenes y ${result.deletedSessions} sesiones eliminadas.`
      )
    } catch (error) {
      console.error(error)
      toast.error(
        getRestaurantServiceErrorMessage(
          error,
          "No se pudieron limpiar los datos antiguos"
        )
      )
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Ajustes privados</h2>
        <p className="text-sm text-muted-foreground">
          Ajustes internos disponibles solo para superadmin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div className="space-y-2">
          <Label htmlFor="currency" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Moneda
          </Label>
          <Select
            value={formData.currency}
            onValueChange={(value) =>
              setFormData({ ...formData, currency: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona moneda" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Se usa para mostrar precios en el menu, carrito y ordenes.
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

      <div className="max-w-lg space-y-3 border-t pt-6">
        <div>
          <h3 className="font-semibold">Limpieza de datos antiguos</h3>
          <p className="text-sm text-muted-foreground">
            Elimina ordenes y sesiones antiguas. No afecta productos,
            categorias, mesas ni configuracion.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isCleaning}
          onClick={handleCleanup}
          className="w-full"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isCleaning ? "Limpiando..." : "Limpiar datos antiguos"}
        </Button>
      </div>
    </div>
  )
}
