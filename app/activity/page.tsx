"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ActivityPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to profile since Activity is now merged with Profile
    router.push("/profile")
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">Redirecting to Profile...</div>
    </div>
  )
}
