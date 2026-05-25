import { Suspense } from "react"
import { MenuPageContent } from "@/components/menu/menu-page-content"

interface TablePageProps {
  params: Promise<{
    tableId: string
  }>
}

export default async function TablePage({ params }: TablePageProps) {
  const { tableId } = await params

  return (
    <Suspense fallback={null}>
      <MenuPageContent tableId={tableId} />
    </Suspense>
  )
}
