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
        const error = searchParams.get("error")

        console.log("Auth callback - Code present:", !!code)
        console.log("Auth callback - Error present:", !!error, error ? `Error: ${error}` : "")
        console.log("Auth callback - Full URL:", window.location.href)

        // Get the redirect path if any
        const redirect = searchParams.get("redirect") || "/dashboard"

        if (code) {
          // Exchange the code for a session
          console.log("Auth callback - Exchanging code for session")
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error("Error exchanging code for session:", error)
            router.push(`/auth/login?error=${encodeURIComponent(error.message)}`)
            return
          }

          console.log("Auth callback - Session exchange successful")
          console.log("Auth callback - User authenticated:", data.session?.user?.email)
          console.log(
            "Auth callback - Session expiry:",
            data.session ? new Date(data.session.expires_at! * 1000).toISOString() : "No session",
          )

          // Redirect to the specified path or dashboard
          router.push(redirect)
        } else {
          // No code found, redirect to login
          console.log("Auth callback - No code found, redirecting to login")
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
