import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

interface SupabaseOptions {
  supabaseUrl?: string
  supabaseKey?: string
}

// Check for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  console.error("Missing Supabase environment variables:", {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  })
}

// Client-side singleton to avoid multiple instances
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

// Get or create the Supabase client (singleton pattern)
export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side - always create a new instance
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: false,
        },
      },
    )
  }

  // Client-side - use singleton pattern
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: true,
          storageKey: "ganamos-auth",
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
    )
  }

  return supabaseInstance
}

// Server-side client (creates a new instance each time)
export const createServerSupabaseClient = (options?: SupabaseOptions) => {
  const url = options?.supabaseUrl || (process.env.NEXT_PUBLIC_SUPABASE_URL as string)
  const key = options?.supabaseKey || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  })
}
