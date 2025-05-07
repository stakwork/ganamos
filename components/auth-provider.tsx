"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  signInWithTwitter: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean }>
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
    // Check for existing session
    const checkAuth = async () => {
      try {
        setLoading(true)

        // Get session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        console.log("Initial session check:", currentSession?.user?.email || "No session")
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email)
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
  }, [supabase])

  // Update the signInWithGoogle function to use the correct redirect URL
  const signInWithGoogle = async (redirectPath?: string) => {
    try {
      const finalRedirectTo = `${window.location.origin}/auth/callback${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: finalRedirectTo,
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
    try {
      await supabase.auth.signOut()
      // Use window.location for a hard redirect
      window.location.href = "/"
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

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
    if (!user || !profile) {
      console.error("🔍 AUTH PROVIDER - Cannot update balance: No user or profile")
      return
    }

    try {
      console.log("🔍 AUTH PROVIDER - Starting balance update in auth provider")
      console.log("🔍 AUTH PROVIDER - User ID:", user.id)
      console.log("🔍 AUTH PROVIDER - Current balance:", profile.balance)
      console.log("🔍 AUTH PROVIDER - New balance to set:", newBalance)

      // Use service role key for admin access to bypass RLS if available
      const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string)
        : supabase

      console.log("🔍 AUTH PROVIDER - Using admin Supabase client:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

      const { data, error } = await adminSupabase
        .from("profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()

      if (error) {
        console.error("🔍 AUTH PROVIDER - Supabase update error:", error)
        throw error
      }

      console.log("🔍 AUTH PROVIDER - Supabase update response:", data)

      // Update local profile state
      setProfile({
        ...profile,
        balance: newBalance,
      })

      console.log("🔍 AUTH PROVIDER - Local profile state updated with new balance:", newBalance)

      // Force a refresh of the profile data
      const { data: refreshedProfile, error: refreshError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (refreshError) {
        console.error("🔍 AUTH PROVIDER - Error refreshing profile:", refreshError)
      } else {
        console.log("🔍 AUTH PROVIDER - Refreshed profile from database:", refreshedProfile)
        setProfile(refreshedProfile)
      }
    } catch (error) {
      console.error("🔍 AUTH PROVIDER - Balance update failed:", error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
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
    try {
      console.log("Signing in with email:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
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

      console.log("Sign in successful, session:", data.session?.user?.email)

      // Update local state immediately
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }

      // Return success status
      return { success: true }
    } catch (error: any) {
      console.error("Error signing in:", error)
      return { success: false }
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
