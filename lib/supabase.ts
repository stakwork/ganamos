import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Create a single supabase client for interacting with your database
const createSupabaseClient = () => {
  // Skip if running on server during static rendering
  if (typeof window === "undefined") {
    // Check if we're in a static rendering context
    const isStaticRendering = process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL

    if (isStaticRendering) {
      return null
    }
  }

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

    return null
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
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseInstance && typeof window !== "undefined") {
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
    return null
  }
}
