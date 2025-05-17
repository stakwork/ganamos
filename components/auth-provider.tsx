"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import type { Profile } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateBalance: (newBalance: number) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId)
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error || !data) {
        console.log("Profile not found, creating new profile")
        // Create a new profile if one doesn't exist
        const { data: userData } = await supabase.auth.getUser()
        const newProfile = {
          id: userId,
          email: userData.user?.email || "",
          name: userData.user?.user_metadata?.full_name || userData.user?.user_metadata?.name || "User",
          avatar_url: userData.user?.user_metadata?.avatar_url || null,
          balance: 0, // Starting balance
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
          return null
        }

        console.log("New profile created:", createdProfile || newProfile)
        return createdProfile || newProfile
      }

      // Ensure balance is never undefined
      if (data) {
        data.balance = data.balance || 0
        console.log("Profile fetched successfully. Balance:", data.balance)
      }

      return data
    } catch (error) {
      console.error("Error fetching profile:", error)
      return null
    }
  }

  // Refresh the user's profile
  const refreshProfile = async () => {
    if (!user) {
      console.log("Cannot refresh profile: No user")
      return
    }

    console.log("Refreshing profile for user:", user.id)
    const profileData = await fetchProfile(user.id)
    if (profileData) {
      console.log("Profile refreshed. New balance:", profileData.balance)
      setProfile(profileData)
    } else {
      console.log("Failed to refresh profile")
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true)

      // Get the initial session
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession()
      setSession(initialSession)
      setUser(initialSession?.user || null)

      if (initialSession?.user) {
        const profileData = await fetchProfile(initialSession.user.id)
        setProfile(profileData)
      }

      setLoading(false)

      // Set up auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email)
        setSession(newSession)
        setUser(newSession?.user || null)

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }

    initializeAuth()
  }, [supabase])

  // Set up a real-time subscription to the profile table
  useEffect(() => {
    if (!user) return

    console.log("Setting up real-time subscription to profile updates")

    const profileSubscription = supabase
      .channel("profile-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("Profile updated:", payload.new)
          // Refresh the profile when it's updated
          await refreshProfile()
        },
      )
      .subscribe()

    return () => {
      profileSubscription.unsubscribe()
    }
  }, [user, supabase])

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      // Log the redirect URL for debugging
      const redirectUrl = `${window.location.origin}/auth/callback`
      console.log("Google OAuth - Redirect URL:", redirectUrl)
      console.log("Google OAuth - Starting authentication flow")

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      })

      console.log("Google OAuth - Response:", data ? "Data received" : "No data", error ? "Error occurred" : "No error")

      if (error) {
        console.error("Google OAuth - Error details:", error)
        throw error
      }
    } catch (error) {
      console.error("Google sign in failed:", error)
      throw error
    }
  }

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        return { success: false, message: "Email and password are required" }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          message: error.message || "Authentication failed",
        }
      }

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "An unexpected error occurred",
      }
    }
  }

  // Sign up with email
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

      router.push("/auth/login")
    } catch (error: any) {
      console.error("Error signing up:", error)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Sign out failed:", error)
    }
  }

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    try {
      console.log("Updating profile:", updates)
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (error) throw error

      await refreshProfile()
    } catch (error) {
      console.error("Profile update failed:", error)
      throw error
    }
  }

  // Update balance
  const updateBalance = async (newBalance: number) => {
    if (!user || !profile) {
      console.error("Cannot update balance: No user or profile")
      return
    }

    try {
      console.log("Updating balance from", profile.balance, "to", newBalance)
      const { error } = await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        console.error("Balance update error:", error)
        throw error
      }

      // Update local state
      setProfile({
        ...profile,
        balance: newBalance,
      })

      console.log("Balance updated successfully to", newBalance)

      // Refresh profile to ensure consistency
      await refreshProfile()
    } catch (error) {
      console.error("Balance update failed:", error)
      throw error
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
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        updateBalance,
        refreshProfile,
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
