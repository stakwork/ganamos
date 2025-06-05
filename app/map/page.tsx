"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { MapView } from "@/components/map-view"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/components/auth-provider"
import { reverseGeocode } from "@/lib/geocoding"

export default function MapPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [cityName, setCityName] = useState<string | null>(null)
  const [cityBounds, setCityBounds] = useState<{
    north: number
    south: number
    east: number
    west: number
  } | null>(null)
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Check for location parameters in URL
  useEffect(() => {
    const lat = searchParams?.get("lat")
    const lng = searchParams?.get("lng")
    const city = searchParams?.get("city")

    // If location is provided in URL, use it
    if (lat && lng) {
      setUserLocation({
        lat: Number.parseFloat(lat),
        lng: Number.parseFloat(lng),
      })
      if (city) {
        setCityName(city)
      }
      setIsLoading(false)
      return
    }

    // Otherwise try to get user's current location
    const getUserLocation = async () => {
      try {
        if (!navigator.geolocation) {
          console.error("Geolocation is not supported by this browser")
          setIsLoading(false)
          return
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation({ lat: latitude, lng: longitude })

            // Try to get city name via reverse geocoding
            try {
              const cityData = await reverseGeocode(latitude, longitude)
              if (cityData) {
                setCityName(cityData.city || cityData.town || cityData.village || "Unknown")

                // Get city bounds using Google Places API
                try {
                  const response = await fetch(
                    `/api/maps?query=${encodeURIComponent(cityData.city || cityData.town || cityData.village)}`,
                  )
                  if (response.ok) {
                    const data = await response.json()
                    if (data.results && data.results.length > 0 && data.results[0].geometry?.viewport) {
                      const viewport = data.results[0].geometry.viewport
                      setCityBounds({
                        north: viewport.northeast.lat,
                        south: viewport.southwest.lat,
                        east: viewport.northeast.lng,
                        west: viewport.southwest.lng,
                      })
                    }
                  }
                } catch (error) {
                  console.error("Error fetching city bounds:", error)
                }
              }
            } catch (error) {
              console.error("Error with reverse geocoding:", error)
            }

            setIsLoading(false)
          },
          (error) => {
            console.error("Geolocation error:", error.message)
            setIsLoading(false)
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000, // Allow cached positions up to 5 minutes old
          },
        )
      } catch (error) {
        console.error("Error getting location:", error)
        setIsLoading(false)
      }
    }

    getUserLocation()
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <MapView userLocation={userLocation} cityName={cityName} cityBounds={cityBounds} />
}
