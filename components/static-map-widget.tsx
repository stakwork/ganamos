"use client"

import { MapPin } from "lucide-react"

interface StaticMapWidgetProps {
  latitude: number
  longitude: number
  title?: string
  locationLabel?: string
  className?: string
  height?: number
}

export function StaticMapWidget({
  latitude,
  longitude,
  title = "Location",
  locationLabel = "Issue Location",
  className = "",
  height = 250,
}: StaticMapWidgetProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Generate static map URL with custom styling for a modern look
  const getStaticMapUrl = () => {
    const baseUrl = "https://maps.googleapis.com/maps/api/staticmap"
    const params = new URLSearchParams({
      center: `${latitude},${longitude}`,
      zoom: "15",
      size: "640x400", // High resolution for retina displays
      scale: "2", // Retina display support
      maptype: "roadmap",
      key: apiKey || "",
      // Custom marker with emoji-like pin
      markers: `color:0xF7931A|${latitude},${longitude}`,
      // Modern map styling
      style: [
        "feature:poi|visibility:off", // Hide points of interest for cleaner look
        "feature:transit|visibility:simplified",
        "feature:road|element:geometry|color:0xf5f5f5",
        "feature:road|element:labels.icon|visibility:off",
        "feature:water|color:0xc9d9e8",
      ].join("&style="),
    })

    return `${baseUrl}?${params.toString()}`
  }

  // Generate URL to open in native maps app
  const getDirectionsUrl = () => {
    // Detect if iOS/Apple device
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    
    if (isApple) {
      // Apple Maps
      return `http://maps.apple.com/?q=${latitude},${longitude}&ll=${latitude},${longitude}`
    } else {
      // Google Maps (Android and desktop)
      return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    }
  }

  const handleMapClick = () => {
    window.open(getDirectionsUrl(), "_blank", "noopener,noreferrer")
  }

  if (!apiKey) {
    return (
      <div className={`relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`} style={{ height: `${height}px` }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <MapPin className="w-8 h-8 mb-2" />
          <p className="text-sm">Map unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={handleMapClick}
        className="relative w-full h-full group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden"
        style={{ height: `${height}px` }}
        aria-label="Open in maps app"
      >
        <img
          src={getStaticMapUrl()}
          alt={`Map showing ${title}`}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay gradient for better button visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* "Open in Maps" button overlay */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white text-gray-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Open in Maps
          </div>
        </div>

        {/* Location indicator (always visible) */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-gray-900 dark:text-gray-100">{locationLabel}</span>
          </div>
        </div>
      </button>
    </div>
  )
}

