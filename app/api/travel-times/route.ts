import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Google Maps API key not found" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")

    if (!origin || !destination) {
      return NextResponse.json({ error: "Missing origin or destination" }, { status: 400 })
    }

    // Helper to fetch and format duration
    const fetchDuration = async (mode: "walking" | "driving") => {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=${mode}&key=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status === "OK" && data.rows?.[0]?.elements?.[0]?.duration?.text) {
        const durationText = data.rows[0].elements[0].duration.text
        // Format: "1 hour 23 mins" => "1hr 23min", "45 mins" => "45min"
        const hours = durationText.match(/(\d+)\s*hour/)
        const minutes = durationText.match(/(\d+)\s*min/)
        const hourValue = hours ? parseInt(hours[1]) : 0
        const minuteValue = minutes ? parseInt(minutes[1]) : 0
        if (hourValue > 0 && minuteValue > 0) return `${hourValue}hr ${minuteValue}min`
        if (hourValue > 0) return `${hourValue}hr`
        if (minuteValue > 0) return `${minuteValue}min`
        return "1min"
      }
      return null
    }

    const [walking, driving] = await Promise.all([
      fetchDuration("walking"),
      fetchDuration("driving"),
    ])

    return NextResponse.json({ walking, driving })
  } catch (error) {
    console.error("Error in travel-times API route:", error)
    return NextResponse.json({ error: "Failed to get travel times" }, { status: 500 })
  }
} 