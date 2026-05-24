"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { toast } from "sonner"

export function LogoutButton() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      router.replace("/admin/login?signedOut=1")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo cerrar sesion")
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isSigningOut}
      onClick={handleSignOut}
    >
      <LogOut className="h-5 w-5" />
      <span className="sr-only">Cerrar sesion</span>
    </Button>
  )
}
