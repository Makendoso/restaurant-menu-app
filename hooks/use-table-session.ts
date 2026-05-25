"use client"

import { useEffect, useMemo, useState } from "react"
import type { TableSessionState } from "@/types"
import {
  formatTablePathId,
  startOrResumeTableSession,
  startOrResumeTableSessionById,
} from "@/services/restaurant-service"

const STORAGE_KEY = "restaurant_table_session"
const CURRENT_TABLE_ID_KEY = "restaurant_current_table_id"
export const TABLE_SESSION_UNAVAILABLE_MESSAGE =
  "La sesion de esta mesa ya no esta disponible. Escanea nuevamente el QR o solicita ayuda al personal."
const EXPIRED_MESSAGE =
  "La sesion de esta mesa expiro. Escanea nuevamente el QR o solicita ayuda al personal."

type StoredSession = {
  qrToken: string
  tableId?: string | null
  sessionId: string
}

function readStoredSession(sessionKey: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const stored = JSON.parse(raw) as StoredSession
    const storedKey = stored.tableId || stored.qrToken
    return storedKey === sessionKey ? stored.sessionId : null
  } catch {
    return null
  }
}

function writeStoredSession(
  sessionKey: string,
  sessionId: string,
  tableId?: string | null
) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ qrToken: sessionKey, tableId, sessionId })
  )
}

function writeCurrentTableId(tableId: string | null) {
  if (tableId) {
    window.localStorage.setItem(CURRENT_TABLE_ID_KEY, tableId)
    return
  }

  window.localStorage.removeItem(CURRENT_TABLE_ID_KEY)
}

export function clearStoredTableSession(sessionKey?: string | null) {
  try {
    if (!sessionKey) {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(CURRENT_TABLE_ID_KEY)
      return
    }

    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const stored = JSON.parse(raw) as StoredSession
    const storedKey = stored.tableId || stored.qrToken
    if (storedKey === sessionKey) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

type UseTableSessionInput =
  | string
  | {
      qrToken?: string | null
      tableId?: string | null
    }
  | null

export function useTableSession(input: UseTableSessionInput) {
  const qrToken = typeof input === "string" ? input : input?.qrToken || null
  const tableId = typeof input === "object" ? input?.tableId || null : null
  const sessionKey = tableId || qrToken
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [state, setState] = useState<TableSessionState>({
    table: null,
    session: null,
    status: "idle",
    message: "Escanea el QR de tu mesa para iniciar una sesion.",
  })

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      if (!sessionKey) {
        writeCurrentTableId(null)
        setState({
          table: null,
          session: null,
          status: "idle",
          message: "Escanea el QR de tu mesa para iniciar una sesion.",
        })
        return
      }

      setState((prev) => ({ ...prev, status: "loading", message: null }))
      writeCurrentTableId(tableId)

      try {
        const storedSessionId = readStoredSession(sessionKey)
        const sessionState = tableId
          ? await startOrResumeTableSessionById(tableId, storedSessionId)
          : await startOrResumeTableSession(qrToken || "", storedSessionId)

        if (!isMounted) return

        if (sessionState.session) {
          writeStoredSession(sessionKey, sessionState.session.id, tableId)
        }

        if (!tableId && sessionState.table) {
          writeCurrentTableId(formatTablePathId(sessionState.table.number))
        }

        const isExpired =
          sessionState.session &&
          (sessionState.session.status === "expired" ||
            new Date(sessionState.session.expiresAt).getTime() <= Date.now())

        setState({
          ...sessionState,
          status: isExpired ? "expired" : sessionState.status,
          message: isExpired ? EXPIRED_MESSAGE : sessionState.message,
        })
      } catch (error) {
        console.error(error)
        if (!isMounted) return

        setState({
          table: null,
          session: null,
          status: "error",
          message: "No pudimos iniciar la sesion de esta mesa.",
        })
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [qrToken, sessionKey, tableId])

  return useMemo(() => {
    const isActive =
      state.status === "ready" &&
      state.session?.status === "active" &&
      new Date(state.session.expiresAt).getTime() > currentTime
    const isExpired =
      state.session &&
      (state.session.status === "expired" ||
        new Date(state.session.expiresAt).getTime() <= currentTime)
    const status = isExpired ? "expired" : state.status

    return {
      ...state,
      status,
      message: isExpired ? EXPIRED_MESSAGE : state.message,
      canCreateOrder: Boolean(isActive),
      expiredMessage: EXPIRED_MESSAGE,
      invalidateSession: () => {
        clearStoredTableSession(sessionKey)
        setState({
          table: null,
          session: null,
          status: "invalid",
          message: TABLE_SESSION_UNAVAILABLE_MESSAGE,
        })
      },
    }
  }, [currentTime, sessionKey, state])
}
