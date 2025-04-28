import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LandingHero } from "@/components/landing-hero"
import { getCurrentUser } from "@/lib/auth"

export default async function Home() {
  const user = await getCurrentUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0">
          <img
            src="/images/community-fixing.jpg"
            alt="Person fixing a fence in a community"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-black/90 via-white/30 dark:via-black/30 to-transparent" />
      </div>

      <div className="container relative z-10 px-4 py-8 mx-auto">
        <LandingHero />
        <div className="flex flex-col items-center justify-center gap-4 mt-8">
          <Button size="lg" className="w-full max-w-xs" asChild>
            <a href="/auth/login">Log In</a>
          </Button>
          <Button size="lg" variant="outline" className="w-full max-w-xs" asChild>
            <a href="/auth/register">Create Account</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
