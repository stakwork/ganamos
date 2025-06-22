"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { LandingHero } from "@/components/landing-hero"
import { getCurrentUser } from "@/lib/auth"
import { BackgroundImage } from "@/components/background-image"
import { DonationModal } from "@/components/donation-modal"

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDonationModal, setShowDonationModal] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        redirect("/dashboard")
      }
      setUser(currentUser)
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <BackgroundImage />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-black/90 via-white/30 dark:via-black/30 to-transparent" />
      </div>

      <div className="container relative z-10 px-4 py-8 mx-auto">
        <LandingHero />
        <div className="flex flex-col items-center justify-center gap-4 mt-8">
          <a
            href="/map"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-14 rounded-md px-10 w-full max-w-xs bg-green-600 hover:bg-green-700 text-white"
          >
            <div className="scale-75">
              <img
                src="/images/bitcoin-logo.png"
                alt="Bitcoin"
                className="inline-block h-6 w-6 mr-1"
                style={{ verticalAlign: "middle" }}
              />
            </div>
            Earn Bitcoin
          </a>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 rounded-md px-10 w-full max-w-xs"
          >
            Log In
          </a>
        </div>
      </div>

      <DonationModal open={showDonationModal} onOpenChange={setShowDonationModal} />
    </div>
  )
}
