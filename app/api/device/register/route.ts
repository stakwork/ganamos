import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createServerSupabaseClient } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const { deviceCode, petName, petType } = await request.json()

    // Validate input
    if (!deviceCode || !petName || !petType) {
      return NextResponse.json({ 
        success: false, 
        error: "Device code, pet name, and pet type are required" 
      }, { status: 400 })
    }

    // Validate device code format (6 characters)
    if (deviceCode.length !== 6) {
      return NextResponse.json({ 
        success: false, 
        error: "Device code must be 6 characters" 
      }, { status: 400 })
    }

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

    // Use admin client for database operations
    const adminSupabase = createServerSupabaseClient()

    // Check if a device with this pairing code already exists and is paired
    const { data: existingDevice, error: checkError } = await adminSupabase
      .from("devices")
      .select("*")
      .eq("pairing_code", deviceCode.toUpperCase())
      .eq("status", "paired")
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error checking existing device:", checkError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to validate device code" 
      }, { status: 500 })
    }

    if (existingDevice) {
      return NextResponse.json({ 
        success: false, 
        error: "This device code is already in use" 
      }, { status: 400 })
    }

    // Create device record in database
    const { data: device, error: insertError } = await adminSupabase
      .from("devices")
      .insert({
        user_id: userId,
        pairing_code: deviceCode.toUpperCase(),
        pet_name: petName,
        pet_type: petType,
        status: 'paired',
      })
      .select()
      .single()

    if (insertError || !device) {
      console.error("Error creating device:", insertError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to register device" 
      }, { status: 500 })
    }

    console.log("Device registered successfully:", device)

    return NextResponse.json({
      success: true,
      message: `${petName} the ${petType} has been connected successfully!`,
      deviceId: device.id,
      config: {
        deviceId: device.id,
        userId,
        petName,
        petType,
        serverUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        pollInterval: 30, // seconds
      }
    })

  } catch (error) {
    console.error("Error in device registration:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
