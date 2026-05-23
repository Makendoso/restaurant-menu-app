"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Clock, Copy, Plus, Power, RotateCcw, XCircle } from "lucide-react"
import { useRestaurantData } from "@/context/restaurant-context"
import type { OrderSession, OrderSessionStatus, RestaurantTable } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type TableState = "libre" | "activa" | "expirada"

function getLatestSession(sessions: OrderSession[], tableId: string) {
  return sessions
    .filter((session) => session.tableId === tableId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
}

function getTableState(table: RestaurantTable, session?: OrderSession): TableState {
  if (!table.isActive) return "expirada"
  if (!session || session.status === "closed") return "libre"
  if (
    session.status === "expired" ||
    new Date(session.expiresAt).getTime() <= Date.now()
  ) {
    return "expirada"
  }

  return "activa"
}

function formatRemainingTime(session?: OrderSession) {
  if (!session || session.status !== "active") return "-"

  const remainingMs = new Date(session.expiresAt).getTime() - Date.now()
  if (remainingMs <= 0) return "Expirada"

  const minutes = Math.ceil(remainingMs / 60000)
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${rest}m`
}

function getStatusBadgeVariant(status: TableState) {
  if (status === "activa") return "default"
  if (status === "libre") return "secondary"
  return "outline"
}

export function TablesTab() {
  const {
    tables,
    sessions,
    orders,
    addTable,
    setTableActive,
    closeSession,
    reactivateSession,
    refreshData,
  } = useRestaurantData()
  const [tableNumber, setTableNumber] = useState("")
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      tables.map((table) => {
        const latestSession = getLatestSession(sessions, table.id)
        return {
          table,
          session: latestSession,
          state: getTableState(table, latestSession),
          orderCount: orders.filter((order) => order.tableId === table.id)
            .length,
        }
      }),
    [orders, sessions, tables]
  )

  const handleCreateTable = async () => {
    const number = Number(tableNumber)
    if (!Number.isInteger(number) || number <= 0) {
      toast.error("Ingresa un numero de mesa valido.")
      return
    }

    setPendingAction("create")
    try {
      await addTable(number)
      setTableNumber("")
      toast.success(`Mesa ${number} creada`)
    } catch (error) {
      console.error(error)
      toast.error("No se pudo crear la mesa.")
    } finally {
      setPendingAction(null)
    }
  }

  const handleCopyQrUrl = async (token: string) => {
    const origin = window.location.origin
    const url = `${origin}/menu?t=${token}`
    await window.navigator.clipboard.writeText(url)
    toast.success("URL del QR copiada")
  }

  const runAction = async (key: string, action: () => Promise<void>) => {
    setPendingAction(key)
    try {
      await action()
      await refreshData()
      toast.success("Cambio guardado")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo guardar el cambio.")
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mesas</h2>
          <p className="text-sm text-muted-foreground">
            Control de QR, sesiones y pedidos ligados a mesa.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="Numero"
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
            className="w-28"
          />
          <Button
            onClick={handleCreateTable}
            disabled={pendingAction === "create"}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Crear
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mesa</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Tiempo</TableHead>
            <TableHead>Ordenes</TableHead>
            <TableHead>QR</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Aun no hay mesas. Crea la primera para generar su QR.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ table, session, state, orderCount }) => {
              const isPending = pendingAction?.includes(table.id)
              const canReactivate =
                session &&
                (session.status === "expired" || session.status === "closed")

              return (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">Mesa {table.number}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(state)}>
                      {table.isActive ? state : "desactivada"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatRemainingTime(session)}
                    </span>
                  </TableCell>
                  <TableCell>{orderCount}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleCopyQrUrl(table.qrToken)}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar URL
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {session?.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            runAction(`${table.id}-close`, () =>
                              closeSession(session.id)
                            )
                          }
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canReactivate && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            runAction(`${table.id}-reactivate`, () =>
                              reactivateSession(session.id)
                            )
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant={table.isActive ? "outline" : "default"}
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          runAction(`${table.id}-active`, () =>
                            setTableActive(table.id, !table.isActive)
                          )
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
