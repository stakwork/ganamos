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

    return NextResponse.json({ price: btcPrice })
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error)
    // Return a fallback price if the API call fails
    return NextResponse.json({ price: 64000, error: "Failed to fetch current price" }, { status: 200 })
  }
}
