"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithTwitter: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateBalance: (newBalance: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    // Skip auth check if window is not defined (SSR)
    if (typeof window === "undefined") {
      setLoading(false)
      return
    }

    // Check for existing session
    const checkAuth = async () => {
      try {
        setLoading(true)

        // If supabase client is not available, skip auth check
        if (!supabase) {
          console.warn("Supabase client not available, skipping auth check")
          setLoading(false)
          return
        }

        // Get session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()
        setSession(currentSession)

        if (currentSession?.user) {
          setUser(currentSession.user)

          // Fetch user profile
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentSession.user.id)
            .single()

          if (error || !profileData) {
            // Create a new profile if one doesn't exist
            const { data: userData } = await supabase.auth.getUser()
            const newProfile = {
              id: currentSession.user.id,
              email: currentSession.user.email || "",
              name: userData.user?.user_metadata?.full_name || userData.user?.user_metadata?.name || "User",
              avatar_url: userData.user?.user_metadata?.avatar_url || null,
              balance: 5000, // Starting balance
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            const { data: createdProfile, error: createError } = await supabase
              .from("profiles")
              .insert(newProfile)
              .select()
              .single()

            if (createError) {
              console.error("Error creating profile:", createError)
            } else {
              setProfile(createdProfile || newProfile)
            }
          } else {
            // Ensure balance is never undefined
            if (profileData) {
              profileData.balance = profileData.balance || 0
            }
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Set up auth state change listener
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // Fetch user profile on auth change
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .single()

          if (error || !profileData) {
            // Handle case where profile doesn't exist yet
            console.log("Profile not found, will be created on next page load")
          } else {
            // Ensure balance is never undefined
            if (profileData) {
              profileData.balance = profileData.balance || 0
            }
            setProfile(profileData)
          }
        } else {
          setProfile(null)
        }

        setLoading(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabase])

  // Update the signInWithGoogle function to use the correct redirect URL
  const signInWithGoogle = async () => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication service is not available",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) throw error
    } catch (error) {
      console.error("Google sign in failed:", error)
      throw error
    }
  }

  const signInWithTwitter = async () => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication service is not available",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "twitter",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error) {
      console.error("Twitter sign in failed:", error)
      throw error
    }
  }

  const signOut = async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !supabase) return

    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (error) throw error

      // Refresh profile data
      const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      // Ensure balance is never undefined
      if (updatedProfile) {
        updatedProfile.balance = updatedProfile.balance || 0
      }

      setProfile(updatedProfile)

      return updatedProfile
    } catch (error) {
      console.error("Profile update failed:", error)
      throw error
    }
  }

  const updateBalance = async (newBalance: number) => {
    if (!user || !profile || !supabase) return

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ balance: newBalance || 0 })
        .eq("id", user.id)

      if (error) throw error

      // Update local profile state
      setProfile({
        ...profile,
        balance: newBalance || 0,
      })
    } catch (error) {
      console.error("Balance update failed:", error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication service is not available",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (error) {
        toast({
          title: "Error signing up",
          description: error.message,
          variant: "destructive",
        })
        throw error
      }

      toast({
        title: "Success!",
        description: "Check your email to verify your account.",
      })

      router.push("/sign-in")
    } catch (error: any) {
      console.error("Error signing up:", error)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      toast({
        title: "Error",
        description: "Authentication service is not available",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })
      if (error) {
        toast({
          title: "Error signing in",
          description: error.message,
          variant: "destructive",
        })
        throw error
      }
      // Remove any success toast here if it exists
      router.push("/")
    } catch (error: any) {
      console.error("Error signing in:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signInWithGoogle,
        signInWithTwitter,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        updateBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
