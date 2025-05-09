"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from the URL
        const code = searchParams.get("code")

        // Get the redirect path if any
        const redirect = searchParams.get("redirect") || "/dashboard"

        if (code) {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error("Error exchanging code for session:", error)
            router.push(`/auth/login?error=${encodeURIComponent(error.message)}`)
            return
          }

          // Redirect to the specified path or dashboard
          router.push(redirect)
        } else {
          // No code found, redirect to login
          router.push("/auth/login")
        }
      } catch (error: any) {
        console.error("Authentication error:", error)
        router.push(`/auth/login?error=${encodeURIComponent(error.message || "Authentication failed")}`)
      }
    }

    handleCallback()
  }, [router, searchParams, supabase])

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center max-w-md px-4">
        <h2 className="text-xl font-semibold mb-2">Completing login...</h2>
        <p className="text-muted-foreground mb-4">Please wait while we authenticate you.</p>
        <LoadingSpinner />
      </div>
    </div>
  )
}
