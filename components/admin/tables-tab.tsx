"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Clock,
  Copy,
  Hash,
  Play,
  Plus,
  Power,
  ReceiptText,
  Wallet,
  XCircle,
} from "lucide-react"
import { useRestaurantData } from "@/context/restaurant-context"
import type { OrderSession, RestaurantTable } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

type TableState = "libre" | "activa" | "expirada" | "cerrada" | "inactiva"

const stateConfig: Record<
  TableState,
  { label: string; className: string }
> = {
  libre: {
    label: "Libre",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  activa: {
    label: "Activa",
    className:
      "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  expirada: {
    label: "Expirada",
    className:
      "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  cerrada: {
    label: "Cerrada",
    className: "border-transparent bg-muted text-muted-foreground",
  },
  inactiva: {
    label: "Inactiva",
    className: "border-border bg-background text-muted-foreground",
  },
}

function getLatestSession(sessions: OrderSession[], tableId: string) {
  return sessions
    .filter((session) => session.tableId === tableId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
}

function getCurrentSession(
  sessions: OrderSession[],
  tableId: string,
  currentTime: number
) {
  return sessions
    .filter(
      (session) =>
        session.tableId === tableId &&
        session.status === "active" &&
        new Date(session.expiresAt).getTime() > currentTime
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
}

function getTableState(
  table: RestaurantTable,
  session: OrderSession | undefined,
  currentTime: number
): TableState {
  if (!table.isActive) return "inactiva"
  if (!session) return "libre"
  if (session.status === "closed") return "cerrada"
  if (
    session.status === "expired" ||
    new Date(session.expiresAt).getTime() <= currentTime
  ) {
    return "expirada"
  }

  return "activa"
}

function formatRemainingTime(
  session: OrderSession | undefined,
  currentTime: number
) {
  if (!session || session.status !== "active") return "-"

  const remainingMs = new Date(session.expiresAt).getTime() - currentTime
  if (remainingMs <= 0) return "Expirada"

  const minutes = Math.ceil(remainingMs / 60000)
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${rest}m`
}

export function TablesTab() {
  const {
    tables,
    sessions,
    orders,
    addTable,
    setTableActive,
    closeSession,
    createSessionForTable,
    refreshData,
  } = useRestaurantData()
  const [tableNumber, setTableNumber] = useState("")
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [sessionToClose, setSessionToClose] = useState<{
    table: RestaurantTable
    session: OrderSession
  } | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  const rows = useMemo(
    () =>
      tables.map((table) => {
        const latestSession = getLatestSession(sessions, table.id)
        const currentSession = getCurrentSession(sessions, table.id, currentTime)
        const sessionOrders = currentSession
          ? orders.filter(
              (order) =>
                order.tableId === table.id &&
                order.sessionId === currentSession.id
            )
          : []

        return {
          table,
          session: latestSession,
          currentSession,
          state: getTableState(table, latestSession, currentTime),
          orderCount: sessionOrders.length,
          paymentLabel:
            sessionOrders.length === 0
              ? "Sin ordenes"
              : sessionOrders.every((order) => order.isPaid)
                ? "Pagada"
                : "Pago pendiente",
        }
      }),
    [currentTime, orders, sessions, tables]
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
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            inputMode="numeric"
            placeholder="Numero"
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
            className="min-w-0 flex-1 sm:w-28 sm:flex-none"
          />
          <Button
            onClick={handleCreateTable}
            disabled={pendingAction === "create"}
            className="shrink-0 gap-2"
          >
            {pendingAction === "create" ? (
              <Spinner />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {pendingAction === "create" ? "Creando" : "Crear"}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Aun no hay mesas. Crea la primera para generar su QR.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(
            ({
              table,
              session,
              currentSession,
              state,
              orderCount,
              paymentLabel,
            }) => {
            const isPending = pendingAction?.includes(table.id)
            const isSessionActive = !!currentSession
            const canCreateSession = table.isActive && !isSessionActive
            const qrUrl = `/menu?t=${table.qrToken}`

            return (
              <Card
                key={table.id}
                className={cn(
                  "gap-4 overflow-hidden rounded-xl py-0",
                  !table.isActive && "bg-muted/30"
                )}
              >
                <CardHeader className="gap-3 border-b px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        Mesa
                      </div>
                      <CardTitle className="mt-1 text-3xl">
                        {table.number}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", stateConfig[state].className)}
                    >
                      {stateConfig[state].label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 px-4 pb-4 sm:px-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Sesion</p>
                      <p className="mt-1 truncate font-medium">
                        {isSessionActive ? "Activa" : "Sin sesion activa"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Mesa</p>
                      <p className="mt-1 font-medium">
                        {table.isActive ? "Activa" : "Desactivada"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Tiempo
                      </p>
                      <p className="mt-1 font-medium">
                        {formatRemainingTime(session, currentTime)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ReceiptText className="h-3.5 w-3.5" />
                        Ordenes
                      </p>
                      <p className="mt-1 font-medium">{orderCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" />
                        Pago
                      </p>
                      <p className="mt-1 font-medium">{paymentLabel}</p>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">URL QR</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {qrUrl}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      onClick={() => handleCopyQrUrl(table.qrToken)}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar enlace QR
                    </Button>

                    {isSessionActive && currentSession && (
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        disabled={isPending}
                        onClick={() =>
                          setSessionToClose({ table, session: currentSession })
                        }
                      >
                        {pendingAction === `${table.id}-close` ? (
                          <Spinner />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {pendingAction === `${table.id}-close`
                          ? "Cerrando"
                          : "Cerrar sesion"}
                      </Button>
                    )}

                    {canCreateSession && (
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        disabled={isPending}
                        onClick={() =>
                          runAction(`${table.id}-create-session`, () =>
                            createSessionForTable(table.id)
                          )
                        }
                      >
                        {pendingAction === `${table.id}-create-session` ? (
                          <Spinner />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {pendingAction === `${table.id}-create-session`
                          ? "Creando"
                          : "Nueva sesion"}
                      </Button>
                    )}

                    <Button
                      variant={table.isActive ? "outline" : "default"}
                      className="w-full justify-center"
                      disabled={isPending}
                      onClick={() =>
                        runAction(`${table.id}-active`, () =>
                          setTableActive(table.id, !table.isActive)
                        )
                      }
                    >
                      {pendingAction === `${table.id}-active` ? (
                        <Spinner />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                      {pendingAction === `${table.id}-active`
                        ? "Guardando"
                        : table.isActive
                          ? "Desactivar mesa"
                          : "Activar mesa"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <AlertDialog
        open={!!sessionToClose}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setSessionToClose(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cerrar sesion de mesa {sessionToClose?.table.number}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Los clientes ya no podran enviar ordenes con este QR hasta iniciar una nueva sesion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!pendingAction}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!pendingAction || !sessionToClose}
              onClick={(event) => {
                event.preventDefault()
                if (!sessionToClose) return

                runAction(`${sessionToClose.table.id}-close`, () =>
                  closeSession(sessionToClose.session.id)
                ).then(() => setSessionToClose(null))
              }}
            >
              {pendingAction ? "Cerrando..." : "Cerrar sesion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
