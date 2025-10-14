import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// This endpoint now reads from cached Bitcoin price in database
// Updated by cron job every 30 minutes to reduce API calls

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Get the latest Bitcoin price from database
    const { data, error } = await supabase.rpc("get_latest_bitcoin_price", {
      p_currency: "USD",
    })

    if (error) {
      console.error("Error fetching Bitcoin price from database:", error)
      throw new Error("Failed to fetch price from database")
    }

    // Check if we have a price
    if (!data || data.length === 0) {
      console.error("No Bitcoin price found in database")
      return NextResponse.json(
        { error: "No price data available. Price update pending." },
        { status: 503 }
      )
    }

    const priceData = data[0]
    const ageMinutes = priceData.age_minutes || 0

    // Warn if price data is stale (> 60 minutes old)
    if (ageMinutes > 60) {
      console.warn(`Bitcoin price is stale: ${ageMinutes} minutes old`)
    }

    const jsonResponse = NextResponse.json({
      price: parseFloat(priceData.price),
      currency: priceData.currency,
      source: priceData.source,
      timestamp: priceData.created_at,
      ageMinutes: ageMinutes,
      isStale: ageMinutes > 60,
    })

    // Add CORS headers for development only
    if (process.env.NODE_ENV === "development") {
      jsonResponse.headers.set("Access-Control-Allow-Origin", "*")
      jsonResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
      jsonResponse.headers.set("Access-Control-Allow-Headers", "Content-Type")
    }

    return jsonResponse
  } catch (error) {
    console.error("Error in Bitcoin price API:", error)
    const errorResponse = NextResponse.json(
      {
        error: "Failed to fetch current price",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )

    // Add CORS headers for development only
    if (process.env.NODE_ENV === "development") {
      errorResponse.headers.set("Access-Control-Allow-Origin", "*")
      errorResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
      errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type")
    }

    return errorResponse
  }
}

// Handle CORS preflight requests (development only)
export async function OPTIONS() {
  if (process.env.NODE_ENV === 'development') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  
  return new NextResponse(null, { status: 204 })
}
