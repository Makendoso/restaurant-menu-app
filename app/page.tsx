import { Suspense } from "react"
import { MenuPageContent } from "@/components/menu/menu-page-content"

export default function MenuPage() {
  return (
    <Suspense fallback={null}>
      <MenuPageContent />
    </Suspense>
  )
}
