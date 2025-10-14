import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// This endpoint is called by Vercel Cron every 30 minutes
// It fetches the current Bitcoin price from CoinMarketCap and stores it in the database

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if CoinMarketCap API key is configured
    const apiKey = process.env.COINMARKETCAP_API_KEY
    if (!apiKey) {
      console.error("COINMARKETCAP_API_KEY not configured")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    // Fetch current Bitcoin price from CoinMarketCap
    console.log("Fetching Bitcoin price from CoinMarketCap...")
    const response = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      throw new Error(`CoinMarketCap API request failed with status ${response.status}`)
    }

    const data = await response.json()
    const btcPrice = data.data.BTC.quote.USD.price

    console.log(`Fetched BTC price: $${btcPrice.toFixed(2)}`)

    // Store the price in the database using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration missing")
      return NextResponse.json(
        { error: "Database configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Insert the new price record
    const { data: insertedPrice, error: insertError } = await supabase
      .from("bitcoin_prices")
      .insert({
        price: btcPrice,
        currency: "USD",
        source: "coinmarketcap",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting Bitcoin price:", insertError)
      return NextResponse.json(
        { error: "Failed to store price", details: insertError.message },
        { status: 500 }
      )
    }

    console.log("Successfully stored Bitcoin price:", insertedPrice)

    // Optional: Clean up old prices (older than 30 days)
    try {
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
        "cleanup_old_bitcoin_prices"
      )
      if (!cleanupError && cleanupResult > 0) {
        console.log(`Cleaned up ${cleanupResult} old price records`)
      }
    } catch (cleanupError) {
      // Don't fail the request if cleanup fails
      console.warn("Cleanup failed:", cleanupError)
    }

    return NextResponse.json({
      success: true,
      price: btcPrice,
      currency: "USD",
      timestamp: insertedPrice.created_at,
      message: "Bitcoin price updated successfully",
    })
  } catch (error) {
    console.error("Error in Bitcoin price cron job:", error)
    return NextResponse.json(
      {
        error: "Failed to update Bitcoin price",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

