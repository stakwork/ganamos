import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error("Google Maps API key not configured")
      // Return null values instead of 500 error
      return NextResponse.json({ walking: null, driving: null })
    }

    const { searchParams } = new URL(req.url)
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")

    if (!origin || !destination) {
      return NextResponse.json({ walking: null, driving: null })
    }

    // Helper to fetch and format duration with timeout and error handling
    const fetchDuration = async (mode: "walking" | "driving") => {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=${mode}&key=${apiKey}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)
        
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
      } catch (error) {
        console.error(`Error fetching ${mode} duration:`, error)
        return null
      }
    }

    const [walking, driving] = await Promise.all([
      fetchDuration("walking"),
      fetchDuration("driving"),
    ])

    return NextResponse.json({ walking, driving })
  } catch (error) {
    console.error("Error in travel-times API route:", error)
    // Always return valid response with null values instead of error status
    return NextResponse.json({ walking: null, driving: null })
  }
} 