import { NextResponse } from "next/server"

// Cache the Bitcoin price to reduce API calls
let cachedPrice: number | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export async function GET() {
  try {
    // Check if we have a valid cached price
    const now = Date.now()
    if (cachedPrice && now - cacheTimestamp < CACHE_DURATION) {
      console.log("Using cached Bitcoin price:", cachedPrice)
      return NextResponse.json({ price: cachedPrice })
    }

    console.log("Fetching fresh Bitcoin price from CoinMarketCap")
    const response = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": "ee315a66-b24a-4092-93d1-573f7c5824f9",
          Accept: "application/json",
        },
        cache: "no-store",
      },
    )

    // Check if the response is OK before trying to parse JSON
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API request failed with status ${response.status}: ${errorText}`)

      // If we have a cached price, use it even if it's expired
      if (cachedPrice) {
        console.log("Using expired cached price as fallback:", cachedPrice)
        return NextResponse.json({
          price: cachedPrice,
          cached: true,
          error: `Failed to fetch current price: ${response.status}`,
        })
      }

      // Otherwise use a hardcoded fallback price
      console.log("Using hardcoded fallback price")
      return NextResponse.json({
        price: 64000,
        fallback: true,
        error: `Failed to fetch price: ${response.status}`,
      })
    }

    // Parse the JSON response
    const data = await response.json()

    // Extract the Bitcoin price in USD
    const btcPrice = data.data.BTC.quote.USD.price

    // Update the cache
    cachedPrice = btcPrice
    cacheTimestamp = now

    return NextResponse.json({ price: btcPrice, fresh: true })
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error)

    // If we have a cached price, use it as fallback
    if (cachedPrice) {
      console.log("Using cached price as fallback after error:", cachedPrice)
      return NextResponse.json({
        price: cachedPrice,
        cached: true,
        error: "Error fetching current price",
      })
    }

    // Return a fallback price if the API call fails
    return NextResponse.json(
      {
        price: 64000,
        fallback: true,
        error: "Failed to fetch current price",
      },
      { status: 200 },
    )
  }
}
