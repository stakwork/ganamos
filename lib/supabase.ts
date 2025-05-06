import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

interface SupabaseOptions {
  supabaseUrl?: string
  supabaseKey?: string
}

// Create a single supabase client for interacting with your database
const createSupabaseClient = (options?: SupabaseOptions) => {
  const supabaseUrl = options?.supabaseUrl || (process.env.NEXT_PUBLIC_SUPABASE_URL as string)
  const supabaseKey = options?.supabaseKey || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)

  return createClient<Database>(supabaseUrl, supabaseKey, {
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
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}

// Server-side client (creates a new instance each time)
export const createServerSupabaseClient = (options?: SupabaseOptions) => {
  return createSupabaseClient(options)
}
