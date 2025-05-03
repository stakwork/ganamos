import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Create a single supabase client for interacting with your database
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if required environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, show a helpful error message
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Supabase URL and anon key are required. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.",
      )
    }

    // Return a mock client or null in development to prevent crashes
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn("Using mock Supabase client for development")
      // Return a minimal mock client that won't crash the app
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOAuth: () => Promise.resolve({ error: new Error("Mock Supabase client") }),
        },
        from: () => ({
          select: () => ({ data: null, error: new Error("Mock Supabase client") }),
        }),
      } as any
    }

    throw new Error("Supabase URL and anon key are required")
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "ganamos-auth",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })
}

// Client-side singleton to avoid multiple instances
export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side - always create a new instance
    return createSupabaseClient()
  }

  // Client-side - use singleton pattern
  if (!supabaseInstance) {
    try {
      supabaseInstance = createSupabaseClient()
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error)
      return null
    }
  }
  return supabaseInstance
}

// Server-side client (creates a new instance each time)
export const createServerSupabaseClient = () => {
  try {
    return createSupabaseClient()
  } catch (error) {
    console.error("Failed to initialize server Supabase client:", error)
    throw error
  }
}
