import { createClient } from "@supabase/supabase-js"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
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

// For backward compatibility - returns the browser client
export const getSupabaseClient = () => {
  return createBrowserSupabaseClient()
}

// For client components - uses the auth helpers
export const createBrowserSupabaseClient = () => {
  return createClientComponentClient<Database>()
}

// For server components and API routes
export const createServerSupabaseClient = (options?: SupabaseOptions) => {
  const url = options?.supabaseUrl || (process.env.NEXT_PUBLIC_SUPABASE_URL as string)
  const key = options?.supabaseKey || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  })
}
