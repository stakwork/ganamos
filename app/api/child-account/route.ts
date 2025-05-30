import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const { username, avatarUrl } = await request.json()

    // Validate input
    if (!username || !avatarUrl) {
      return NextResponse.json({ error: "Username and avatar are required" }, { status: 400 })
    }

    // Create a regular Supabase client to get the current user session
    const supabaseAuth = createRouteHandlerClient({ cookies })

    // Get the current user to determine who is creating the child account
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const primaryUserId = session.user.id

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Generate a unique email for the child account
    const childId = uuidv4()
    const childEmail = `child-${childId}@ganamos.app`

    // Create a random password (it won't be used for login)
    const password = uuidv4()

    // Create the child user with admin API
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: childEmail,
      password: password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        name: username,
        avatar_url: avatarUrl,
        is_child_account: true,
        primary_user_id: primaryUserId,
      },
    })

    if (adminError) {
      console.error("Error creating child user:", adminError)
      return NextResponse.json({ error: `Error creating child account: ${adminError.message}` }, { status: 500 })
    }

    const childUserId = adminData.user.id

    // Update the profile for the child user (it may have been auto-created)
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: childUserId,
      name: username,
      email: childEmail,
      avatar_url: avatarUrl,
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Error creating child profile:", profileError)
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(childUserId)
      return NextResponse.json({ error: `Error creating child profile: ${profileError.message}` }, { status: 500 })
    }

    // Create the connection between primary user and child account
    const { error: connectionError } = await supabaseAdmin.from("connected_accounts").insert({
      primary_user_id: primaryUserId,
      connected_user_id: childUserId,
      created_at: new Date().toISOString(),
    })

    if (connectionError) {
      console.error("Error creating connection:", connectionError)
      // Note: We don't clean up here because the profile and user are valid
      return NextResponse.json({ error: `Error connecting accounts: ${connectionError.message}` }, { status: 500 })
    }

    // Get the full profile to return
    const { data: childProfile } = await supabaseAdmin.from("profiles").select("*").eq("id", childUserId).single()

    return NextResponse.json({
      success: true,
      message: "Child account created successfully",
      profile: childProfile,
    })
  } catch (error: any) {
    console.error("Unexpected error in child account creation:", error)
    return NextResponse.json({ error: `Unexpected error: ${error.message}` }, { status: 500 })
  }
}
