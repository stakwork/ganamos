"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const { signInWithGoogle, signUpWithEmail } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      // The redirect is handled by Supabase OAuth
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "There was an error signing up with Google.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signUpWithEmail(email, password, name)
      toast({
        title: "Registration successful",
        description: "Please check your email to confirm your account before signing in.",
      })
      // Don't redirect immediately - user needs to confirm email first
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "There was an error creating your account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
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

      <div className="w-full max-w-md px-4 z-10">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-lg shadow-lg space-y-6">
          <div className="space-y-4 text-center">
            <h1 className="app-title" data-testid="register-heading">Ganamos!</h1>
            <p className="text-muted-foreground" data-testid="register-description">Join Ganamos to start posting issues and earning rewards</p>
          </div>

          {isLoading && !showEmailForm ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-muted-foreground">Creating your account...</p>
            </div>
          ) : showEmailForm ? (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white/80 dark:bg-gray-800/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/80 dark:bg-gray-800/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-white/80 dark:bg-gray-800/80"
                />
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Back to all sign up options
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="space-y-4">
                <Button className="w-full flex items-center justify-center gap-2" onClick={handleGoogleSignIn}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign up with Google
                </Button>

                <Button className="w-full" variant="secondary" onClick={() => setShowEmailForm(true)}>
                  Sign up with Email
                </Button>
              </div>
            </>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-emerald-600 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
