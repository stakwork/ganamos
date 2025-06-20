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
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error || !data) {
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
          return null
        }

        return createdProfile || newProfile
      }

      // Ensure balance is never undefined
      if (data) {
        data.balance = data.balance || 0
      }

      return data
    } catch (error) {
      return null
    }
  }

  // Refresh the user's profile
  const refreshProfile = async () => {
    if (!user) {
      return
    }

    // If we're using a connected account, fetch that profile instead
    const profileId = activeUserId || user.id

    const profileData = await fetchProfile(profileId)
    if (profileData) {
      setProfile(profileData)
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
        return
      }

      if (data && data.length > 0) {
        // Extract the profile data from the joined query
        const accounts = data.map((item) => item.profiles as Profile)
        setConnectedAccounts(accounts)
      } else {
        setConnectedAccounts([])
      }
    } catch (error) {
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
      } finally {
        setLoading(false)
        setSessionLoaded(true) // Mark session as loaded regardless of outcome
      }

      // Set up auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
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
    }
  }

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    try {
      const profileId = activeUserId || user.id
      const { error } = await supabase.from("profiles").update(updates).eq("id", profileId)

      if (error) throw error

      await refreshProfile()
    } catch (error) {
      throw error
    }
  }

  // Update balance
  const updateBalance = async (newBalance: number) => {
    if (!user || !profile) {
      return
    }

    try {
      const profileId = activeUserId || user.id
      const { error } = await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId)

      if (error) {
        throw error
      }

      // Update local state
      setProfile({
        ...profile,
        balance: newBalance,
      })

      await refreshProfile()
    } catch (error) {
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
