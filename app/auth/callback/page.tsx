"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        console.log("Auth callback page loaded")
        setDebugInfo((prev) => ({ ...prev, callbackTriggered: true, url: window.location.href }))

        // Check if we have a code in the URL (for PKCE flow)
        const code = searchParams.get("code")
        if (code) {
          console.log("Found code in URL, exchanging for session")
          setDebugInfo((prev) => ({ ...prev, codeFound: code.substring(0, 10) + "..." }))

          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error("Error exchanging code for session:", error)
            setDebugInfo((prev) => ({ ...prev, codeExchangeError: error.message }))
            throw error
          }

          if (data.session) {
            console.log("Session established via code exchange")
            setDebugInfo((prev) => ({
              ...prev,
              sessionEstablished: true,
              user: data.session.user.email,
            }))

            // Force a delay to ensure the session is properly set
            await new Promise((resolve) => setTimeout(resolve, 1000))

            console.log("Adding meta refresh tag to redirect to dashboard")
            setRedirecting(true)
            document.head.innerHTML += `
              <meta http-equiv="refresh" content="2;url=/dashboard">
            `
            return
          }
        }

        // Check for hash fragment in URL (for implicit flow)
        if (typeof window !== "undefined" && window.location.hash) {
          console.log("Found hash in URL, parsing tokens")
          setDebugInfo((prev) => ({ ...prev, hashFound: true, hash: window.location.hash }))

          // Extract access_token from the URL hash
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")

          if (accessToken) {
            console.log("Found access token in hash, setting session")
            setDebugInfo((prev) => ({
              ...prev,
              accessTokenFound: true,
              tokenLength: accessToken.length,
            }))

            // Set the session using the hash params
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            })

            if (error) {
              console.error("Error setting session from hash:", error)
              setDebugInfo((prev) => ({ ...prev, setSessionError: error.message }))
              throw error
            }

            if (data.session) {
              console.log("Session established via hash params")
              setDebugInfo((prev) => ({
                ...prev,
                sessionEstablished: true,
                user: data.session.user.email,
              }))

              // Force a delay to ensure the session is properly set
              await new Promise((resolve) => setTimeout(resolve, 1000))

              console.log("Adding meta refresh tag to redirect to dashboard")
              setRedirecting(true)
              document.head.innerHTML += `
                <meta http-equiv="refresh" content="2;url=/dashboard">
              `
              return
            }
          }
        }

        // If we get here, check if we already have a session
        console.log("Checking for existing session")
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          setDebugInfo((prev) => ({ ...prev, getSessionError: error.message }))
          throw error
        }

        if (data.session) {
          console.log("Existing session found")
          setDebugInfo((prev) => ({
            ...prev,
            existingSession: true,
            user: data.session.user.email,
          }))

          // Force a delay to ensure the session is properly set
          await new Promise((resolve) => setTimeout(resolve, 1000))

          console.log("Adding meta refresh tag to redirect to dashboard")
          setRedirecting(true)
          document.head.innerHTML += `
            <meta http-equiv="refresh" content="2;url=/dashboard">
          `
          return
        }

        // If we get here, no session was established
        console.error("No session established after authentication")
        setDebugInfo((prev) => ({ ...prev, noSessionEstablished: true }))
        setError("Authentication failed. Please try again.")
        setTimeout(() => {
          document.head.innerHTML += `
            <meta http-equiv="refresh" content="3;url=/auth/login?error=No%20session%20established">
          `
        }, 3000)
      } catch (error: any) {
        console.error("Authentication error:", error)
        setDebugInfo((prev) => ({ ...prev, catchError: error.message }))
        setError(`Authentication failed: ${error.message}`)
        setTimeout(() => {
          document.head.innerHTML += `
            <meta http-equiv="refresh" content="3;url=/auth/login?error=${encodeURIComponent(error.message)}">
          `
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router, supabase, searchParams])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm">Redirecting you back to login...</p>

          <details className="mt-8 text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer">Debug Information</summary>
            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center max-w-md px-4">
        <h2 className="text-xl font-semibold mb-2">Completing login...</h2>
        <p className="text-muted-foreground mb-4">
          {redirecting ? "Session established! Redirecting to dashboard..." : "Please wait while we authenticate you."}
        </p>
        <LoadingSpinner />

        <details className="mt-8 text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer">Debug Information</summary>
          <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
