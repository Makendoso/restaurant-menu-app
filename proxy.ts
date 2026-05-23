import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "@/lib/supabase-server"

function getMetadataRole(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || !("role" in metadata)) {
    return null
  }

  return (metadata as { role?: unknown }).role
}

function getUserRole(user: { app_metadata?: unknown; user_metadata?: unknown }) {
  const role =
    getMetadataRole(user.app_metadata) || getMetadataRole(user.user_metadata)

  return role === "superadmin" ? "superadmin" : "owner"
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoginRoute = pathname === "/admin/login"
  const isPrivateSettingsRoute = pathname.startsWith("/admin/settings")

  const { supabase, response } = createMiddlewareClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isLoginRoute) {
    if (!user) {
      return response
    }

    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    url.search = ""

    return NextResponse.redirect(url)
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    url.searchParams.set("redirectTo", pathname)

    return NextResponse.redirect(url)
  }

  if (isPrivateSettingsRoute && getUserRole(user) !== "superadmin") {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    url.search = ""

    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
