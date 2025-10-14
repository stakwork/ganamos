import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")
    const pairingCode = searchParams.get("pairingCode")

    // Require either deviceId or pairingCode for authentication
    if (!deviceId && !pairingCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Device ID or pairing code required",
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Find the device first
    let deviceQuery = supabase
      .from("devices")
      .select("*")
      .eq("status", "paired")

    if (deviceId) {
      deviceQuery = deviceQuery.eq("id", deviceId)
    } else {
      deviceQuery = deviceQuery.eq("pairing_code", pairingCode)
    }

    const { data: device, error: deviceError } = await deviceQuery.single()

    if (deviceError || !device) {
      console.error("Device not found:", deviceError)
      return NextResponse.json(
        {
          success: false,
          error: "Device not found or not paired",
          debug: { deviceError, deviceId, pairingCode },
        },
        { status: 404 }
      )
    }

    // Get user profile separately
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, balance, name")
      .eq("id", device.user_id)
      .single()

    if (profileError) {
      console.error("Profile not found:", profileError)
      return NextResponse.json(
        {
          success: false,
          error: "User profile not found",
        },
        { status: 404 }
      )
    }

    // Update last_seen_at
    await supabase
      .from("devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id)

    // Get current Bitcoin price from database (much faster than external API)
    let btcPrice = null
    try {
      // Try function first
      let priceData, priceError
      try {
        const result = await supabase.rpc("get_latest_bitcoin_price", {
          p_currency: "USD",
        })
        priceData = result.data
        priceError = result.error
      } catch {
        // Fallback: Query table directly
        const result = await supabase
          .from("bitcoin_prices")
          .select("price")
          .eq("currency", "USD")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (result.data) {
          priceData = [{ price: result.data.price }]
        }
        priceError = result.error
      }

      if (!priceError && priceData && priceData.length > 0) {
        btcPrice = parseFloat(priceData[0].price)
      } else {
        console.warn("Failed to fetch BTC price from database:", priceError)
      }
    } catch (error) {
      console.warn("Error fetching BTC price:", error)
    }

    // Return device configuration and user data
    return NextResponse.json({
      success: true,
      config: {
        deviceId: device.id,
        petName: device.pet_name,
        petType: device.pet_type,
        userId: device.user_id,
        userName: profile?.name || "User",
        balance: profile?.balance || 0,
        btcPrice: btcPrice,
        pollInterval: 30, // seconds
        serverUrl:
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3457",
      },
    })
  } catch (error) {
    console.error("Error in device config API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

