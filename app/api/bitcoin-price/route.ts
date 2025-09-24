import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.COINMARKETCAP_API_KEY
    if (!apiKey) {
      throw new Error("CoinMarketCap API key not configured")
    }

    const response = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    )

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()

    // Extract the Bitcoin price in USD
    const btcPrice = data.data.BTC.quote.USD.price

    const jsonResponse = NextResponse.json({ price: btcPrice })
    
    // Add CORS headers for development only
    if (process.env.NODE_ENV === 'development') {
      jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
      jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    }
    
    return jsonResponse
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error)
    // Return an error response instead of a fallback price
    const errorResponse = NextResponse.json({ error: "Failed to fetch current price" }, { status: 500 })
    
    // Add CORS headers for development only
    if (process.env.NODE_ENV === 'development') {
      errorResponse.headers.set('Access-Control-Allow-Origin', '*')
      errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
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
