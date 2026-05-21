import { Suspense } from "react"
import { LoginForm } from "@/components/admin/login-form"

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading login...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
