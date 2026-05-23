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
import { DollarSign, Save } from "lucide-react"
import { toast } from "sonner"

const currencies = [
  { value: "MXN", label: "Mexican Peso (MXN)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "ARS", label: "Argentine Peso (ARS)" },
  { value: "COP", label: "Colombian Peso (COP)" },
  { value: "PEN", label: "Peruvian Sol (PEN)" },
  { value: "CLP", label: "Chilean Peso (CLP)" },
]

export function SettingsTab() {
  const { settings, updateSettings } = useRestaurantData()
  const [formData, setFormData] = useState({
    currency: settings.currency,
  })
  const [isSaving, setIsSaving] = useState(false)
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
      toast.success("Settings privados guardados")
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron guardar los settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settings privados</h2>
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
    </div>
  )
}
