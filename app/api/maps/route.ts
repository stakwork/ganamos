import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return new NextResponse("Google Maps API key not configured", { status: 500 })
  }

  // Return JavaScript that loads the Google Maps API
  const script = `
    (function() {
      if (window.google && window.google.maps) {
        return; // Already loaded
      }
      
      var script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    })();
  `

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  })
}
