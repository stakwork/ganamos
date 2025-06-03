import { NextResponse } from "next/server"

export async function GET() {
  // This runs on the server, so it's safe to access environment variables here
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Redirect to the Google Maps API with the key
  return NextResponse.redirect(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`)
}
