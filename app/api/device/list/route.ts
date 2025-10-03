import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export async function GET() {
  try {
    // Get the current user
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: "Authentication required" 
      }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch devices from database
    const { data: devices, error } = await supabase
      .from("devices")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "paired")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching devices:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch devices" 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      devices: devices || []
    })

  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
