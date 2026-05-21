"use client"

import { useState } from "react"
import { useRestaurantData } from "@/context/restaurant-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Store, Phone, DollarSign, Save } from "lucide-react"
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
    name: settings.name,
    whatsappNumber: settings.whatsappNumber,
    currency: settings.currency,
  })
  const [isSaving, setIsSaving] = useState(false)
  const hasChanges =
    formData.name !== settings.name ||
    formData.whatsappNumber !== settings.whatsappNumber ||
    formData.currency !== settings.currency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextSettings = {
      name: formData.name.trim(),
      whatsappNumber: formData.whatsappNumber.replace(/\D/g, ""),
      currency: formData.currency,
    }

    if (!nextSettings.name) {
      toast.error("Restaurant name is required")
      return
    }

    if (!nextSettings.whatsappNumber) {
      toast.error("WhatsApp number is required")
      return
    }

    if (nextSettings.whatsappNumber.length < 10) {
      toast.error("WhatsApp number must include country code")
      return
    }

    if (!currencies.some((currency) => currency.value === nextSettings.currency)) {
      toast.error("Please select a supported currency")
      return
    }

    setIsSaving(true)

    try {
      await updateSettings(nextSettings)
      setFormData(nextSettings)
      toast.success("Settings saved successfully")
    } catch (error) {
      console.error(error)
      toast.error("Could not save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your restaurant details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        {/* Restaurant Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Restaurant Name
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your restaurant name"
          />
          <p className="text-xs text-muted-foreground">
            This will be displayed in the menu header
          </p>
        </div>

        {/* WhatsApp Number */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            WhatsApp Number
          </Label>
          <Input
            id="whatsapp"
            value={formData.whatsappNumber}
            onChange={(e) =>
              setFormData({ ...formData, whatsappNumber: e.target.value })
            }
            placeholder="5210000000000"
          />
          <p className="text-xs text-muted-foreground">
            Include country code without + sign (e.g., 5210000000000 for Mexico)
          </p>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Currency
          </Label>
          <Select
            value={formData.currency}
            onValueChange={(value) =>
              setFormData({ ...formData, currency: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
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
            This will be used for displaying prices
          </p>
        </div>

        {/* Save Button */}
        <Button
          type="submit"
          disabled={!hasChanges || isSaving}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  )
}
