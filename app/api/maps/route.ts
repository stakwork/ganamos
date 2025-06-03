import { NextResponse } from "next/server"

export async function GET() {
  // Use server-only environment variable (without NEXT_PUBLIC_ prefix)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 })
  }

  // Return the script content with the API key embedded
  const scriptContent = `
    (function() {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    })();
  `

  return new NextResponse(scriptContent, {
    headers: {
      "Content-Type": "application/javascript",
    },
  })
}
