"use client"

import { useEffect, useMemo, useState } from "react"
import type { TableSessionState } from "@/types"
import { startOrResumeTableSession } from "@/services/restaurant-service"

const STORAGE_KEY = "restaurant_table_session"
const EXPIRED_MESSAGE =
  "La sesión de esta mesa expiró. Escanea nuevamente el QR o solicita ayuda al personal."

type StoredSession = {
  qrToken: string
  sessionId: string
}

function readStoredSession(qrToken: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const stored = JSON.parse(raw) as StoredSession
    return stored.qrToken === qrToken ? stored.sessionId : null
  } catch {
    return null
  }
}

function writeStoredSession(qrToken: string, sessionId: string) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ qrToken, sessionId })
  )
}

export function useTableSession(qrToken: string | null) {
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
      if (!qrToken) {
        setState({
          table: null,
          session: null,
          status: "idle",
          message: "Escanea el QR de tu mesa para iniciar una sesion.",
        })
        return
      }

      setState((prev) => ({ ...prev, status: "loading", message: null }))

      try {
        const storedSessionId = readStoredSession(qrToken)
        const sessionState = await startOrResumeTableSession(
          qrToken,
          storedSessionId
        )

        if (!isMounted) return

        if (sessionState.session) {
          writeStoredSession(qrToken, sessionState.session.id)
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
  }, [qrToken])

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
    }
  }, [currentTime, state])
}
