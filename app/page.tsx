"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LandingHero } from "@/components/landing-hero"
import { getCurrentUser } from "@/lib/auth"
import { BackgroundImage } from "@/components/background-image"
import { DonationModal } from "@/components/donation-modal"
import { BitcoinLogo } from "@/components/bitcoin-logo"

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
        <div className="flex flex-col items-center justify-center gap-6 mt-12 max-w-sm mx-auto">
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
            asChild
          >
            <a href="/map" className="flex items-center justify-center gap-3">
              <BitcoinLogo className="w-5 h-5" />
              Earn Bitcoin
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
            asChild
          >
            <a href="/auth/login" className="flex items-center justify-center">
              Log In
            </a>
          </Button>
        </div>
      </div>

      <DonationModal open={showDonationModal} onOpenChange={setShowDonationModal} />
    </div>
  )
}
