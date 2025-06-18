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
  sessionLoaded: boolean // Added to track when session loading is complete
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signInWithPhone: (phone: string) => Promise<{ success: boolean; message?: string }>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateBalance: (newBalance: number) => Promise<void>
  refreshProfile: () => Promise<void>
  // New account switching functionality
  activeUserId: string | null
  isConnectedAccount: boolean
  switchToAccount: (userId: string) => Promise<void>
  resetToMainAccount: () => Promise<void>
  connectedAccounts: Profile[]
  fetchConnectedAccounts: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Local storage key for active user
const ACTIVE_USER_KEY = "ganamos_active_user_id"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionLoaded, setSessionLoaded] = useState(false) // Track when session is loaded
  const router = useRouter()
  const supabase = createBrowserSupabaseClient({
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  const { toast } = useToast()

  // New state for account switching
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [isConnectedAccount, setIsConnectedAccount] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<Profile[]>([])

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

    // If we're using a connected account, fetch that profile instead
    const profileId = activeUserId || user.id

    console.log("Refreshing profile for user:", profileId)
    const profileData = await fetchProfile(profileId)
    if (profileData) {
      console.log("Profile refreshed. New balance:", profileData.balance)
      setProfile(profileData)
    } else {
      console.log("Failed to refresh profile")
    }
  }

  // Fetch connected accounts
  const fetchConnectedAccounts = async () => {
    if (!user) return

    try {
      // Get accounts where the current user is the primary user
      const { data, error } = await supabase
        .from("connected_accounts")
        .select("connected_user_id, profiles:connected_user_id(*)")
        .eq("primary_user_id", user.id)

      if (error) {
        console.error("Error fetching connected accounts:", error)
        return
      }

      if (data && data.length > 0) {
        // Extract the profile data from the joined query
        const accounts = data.map((item) => item.profiles as Profile)
        setConnectedAccounts(accounts)
        console.log("Connected accounts:", accounts)
      } else {
        setConnectedAccounts([])
      }
    } catch (error) {
      console.error("Error in fetchConnectedAccounts:", error)
    }
  }

  // Switch to a connected account
  const switchToAccount = async (userId: string) => {
    if (!user) return

    try {
      // Verify this is a valid connected account
      const { data, error } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("primary_user_id", user.id)
        .eq("connected_user_id", userId)
        .single()

      if (error || !data) {
        toast({
          title: "Error",
          description: "This account is not connected to your profile",
          variant: "destructive",
        })
        return
      }

      // Fetch the profile for the connected account
      const profileData = await fetchProfile(userId)
      if (!profileData) {
        toast({
          title: "Error",
          description: "Could not load connected account profile",
          variant: "destructive",
        })
        return
      }

      // Set the active user ID in localStorage
      localStorage.setItem(ACTIVE_USER_KEY, userId)

      // Update state
      setActiveUserId(userId)
      setIsConnectedAccount(true)
      setProfile(profileData)

      toast({
        title: "Account Switched",
        description: `Now using ${profileData.name}'s account`,
      })
    } catch (error) {
      console.error("Error switching accounts:", error)
      toast({
        title: "Error",
        description: "Failed to switch accounts",
        variant: "destructive",
      })
    }
  }

  // Reset to main account
  const resetToMainAccount = async () => {
    if (!user) return

    try {
      // Clear the active user ID from localStorage
      localStorage.removeItem(ACTIVE_USER_KEY)

      // Fetch the main user's profile
      const profileData = await fetchProfile(user.id)

      // Update state
      setActiveUserId(null)
      setIsConnectedAccount(false)
      setProfile(profileData)

      toast({
        title: "Account Reset",
        description: "Returned to your main account",
      })
    } catch (error) {
      console.error("Error resetting to main account:", error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true)

      try {
        // Get the initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        // Enhanced logging
        console.log("Auth initialization - Session found:", !!initialSession)
        if (initialSession) {
          console.log("Auth initialization - User email:", initialSession.user?.email)
          console.log(
            "Auth initialization - Session expiry:",
            new Date(initialSession.expires_at! * 1000).toISOString(),
          )
        }

        setSession(initialSession)
        setUser(initialSession?.user || null)

        if (initialSession?.user) {
          // Check if we have an active user ID in localStorage
          const storedActiveUserId = localStorage.getItem(ACTIVE_USER_KEY)

          if (storedActiveUserId && storedActiveUserId !== initialSession.user.id) {
            // Verify this is a valid connected account
            const { data } = await supabase
              .from("connected_accounts")
              .select("*")
              .eq("primary_user_id", initialSession.user.id)
              .eq("connected_user_id", storedActiveUserId)
              .single()

            if (data) {
              // Valid connected account, use it
              setActiveUserId(storedActiveUserId)
              setIsConnectedAccount(true)
              const profileData = await fetchProfile(storedActiveUserId)
              setProfile(profileData)

              // Also fetch connected accounts
              fetchConnectedAccounts()
            } else {
              // Invalid connected account, use main account
              localStorage.removeItem(ACTIVE_USER_KEY)
              const profileData = await fetchProfile(initialSession.user.id)
              setProfile(profileData)
            }
          } else {
            // No active user ID or it's the same as the main user, use main account
            const profileData = await fetchProfile(initialSession.user.id)
            setProfile(profileData)

            // Fetch connected accounts
            fetchConnectedAccounts()
          }
        }
      } catch (error) {
        console.error("Error during auth initialization:", error)
      } finally {
        setLoading(false)
        setSessionLoaded(true) // Mark session as loaded regardless of outcome
      }

      // Set up auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email)

        // Enhanced logging for auth state changes
        if (event === "SIGNED_IN") {
          console.log("User signed in - Session:", !!newSession)
          console.log("User signed in - User:", newSession?.user?.email)
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out")
          // Clear active user on sign out
          localStorage.removeItem(ACTIVE_USER_KEY)
          setActiveUserId(null)
          setIsConnectedAccount(false)
          setConnectedAccounts([])
        } else if (event === "TOKEN_REFRESHED") {
          console.log(
            "Token refreshed - New expiry:",
            newSession ? new Date(newSession.expires_at! * 1000).toISOString() : "No session",
          )
        }

        setSession(newSession)
        setUser(newSession?.user || null)

        if (newSession?.user) {
          // On sign in, always use the main account first
          const profileData = await fetchProfile(newSession.user.id)
          setProfile(profileData)
          setActiveUserId(null)
          setIsConnectedAccount(false)
          localStorage.removeItem(ACTIVE_USER_KEY)

          // Fetch connected accounts
          fetchConnectedAccounts()
        } else {
          setProfile(null)
          setConnectedAccounts([])
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
          filter: `id=eq.${activeUserId || user.id}`,
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
  }, [user, activeUserId, supabase])

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

      console.log("Attempting email sign in for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Email sign in failed:", error.message)
        return {
          success: false,
          message: error.message || "Authentication failed",
        }
      }

      // Enhanced logging after successful login
      console.log("Email sign in successful - Session:", !!data.session)
      console.log("Email sign in successful - User:", data.user?.email)

      return { success: true }
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error)
      return {
        success: false,
        message: error?.message || "An unexpected error occurred",
      }
    }
  }

  // Sign in with phone
  const signInWithPhone = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      })

      if (error) {
        return {
          success: false,
          message: error.message || "Failed to send verification code",
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Phone sign in failed:", error)
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
      // Clear active user on sign out
      localStorage.removeItem(ACTIVE_USER_KEY)
      setActiveUserId(null)
      setIsConnectedAccount(false)
      setConnectedAccounts([])

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
      // Update the profile of the active user (connected or main)
      const profileId = activeUserId || user.id
      const { error } = await supabase.from("profiles").update(updates).eq("id", profileId)

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
      // Update the balance of the active user (connected or main)
      const profileId = activeUserId || user.id
      const { error } = await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId)

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

  useEffect(() => {
    if (user) {
      fetchConnectedAccounts()
    }
  }, [user]) // Only re-run when user changes, not on every render

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        sessionLoaded,
        signInWithGoogle,
        signInWithEmail,
        signInWithPhone,
        signUpWithEmail,
        signOut,
        updateProfile,
        updateBalance,
        refreshProfile,
        // New account switching functionality
        activeUserId,
        isConnectedAccount,
        switchToAccount,
        resetToMainAccount,
        connectedAccounts,
        fetchConnectedAccounts,
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
