"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { MapView } from "@/components/map-view"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/components/auth-provider"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { getCurrentLocationWithName } from "@/lib/geocoding"

interface CityBounds {
  north: number
  south: number
  east: number
  west: number
}

export default function MapPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [cityName, setCityName] = useState<string | null>(null)
  const [cityBounds, setCityBounds] = useState<CityBounds | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createBrowserSupabaseClient()

  // Get user location and city bounds
  useEffect(() => {
    const getUserLocationAndCity = async () => {
      try {
        console.log("Getting user location...")
        const location = await getCurrentLocationWithName()

        if (location) {
          setUserLocation(location)
          console.log("User location obtained:", location)

          // Get city bounds using Google Places API
          await getCityBounds(location.name, location.latitude, location.longitude)
        }
      } catch (error) {
        console.error("Error getting user location:", error)
        setLocationError("Could not get your location")
      }
    }

    getUserLocationAndCity()
  }, [])

  // Get city bounds from Google Places API
  const getCityBounds = async (locationName: string, lat: number, lng: number) => {
    try {
      // Wait for Google Maps to be available
      if (!window.google) {
        await loadGoogleMaps()
      }

      const service = new window.google.maps.places.PlacesService(document.createElement("div"))
      const geocoder = new window.google.maps.Geocoder()

      // First try to geocode the location to get more precise city info
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          // Find the locality (city) component
          const cityComponent = results[0].address_components.find((component) => component.types.includes("locality"))

          if (cityComponent) {
            const cityName = cityComponent.long_name
            setCityName(cityName)

            // Now search for this city to get its bounds
            const request = {
              query: cityName,
              fields: ["geometry", "name"],
            }

            service.textSearch(request, (results, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                const place = results[0]
                if (place.geometry && place.geometry.viewport) {
                  const viewport = place.geometry.viewport
                  const bounds = {
                    north: viewport.getNorthEast().lat(),
                    south: viewport.getSouthWest().lat(),
                    east: viewport.getNorthEast().lng(),
                    west: viewport.getSouthWest().lng(),
                  }
                  setCityBounds(bounds)
                  console.log("City bounds set:", bounds)
                }
              }
            })
          } else {
            // Fallback to the location name we already have
            setCityName(locationName)
          }
        }
      })
    } catch (error) {
      console.error("Error getting city bounds:", error)
      // Fallback to just the location name
      setCityName(locationName)
    }
  }

  // Load Google Maps API
  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true

      script.onload = () => {
        setTimeout(() => {
          if (window.google && window.google.maps) {
            resolve()
          } else {
            reject(new Error("Google Maps failed to initialize"))
          }
        }, 100)
      }

      script.onerror = () => reject(new Error("Failed to load Google Maps"))
      document.head.appendChild(script)
    })
  }

  // Fetch posts with correct filtering
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from("posts")
            .select("*")
            .eq("fixed", false)
            .neq("under_review", true)
            .order("created_at", { ascending: false })
          if (error) {
            console.error("Error fetching posts:", error)
            setPosts([])
          } else {
            setPosts(data || [])
          }
        } else {
          setPosts([])
        }
      } catch (error) {
        console.error("Error in fetchPosts:", error)
        setPosts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
        <div className="ml-3">{userLocation ? "Loading map..." : "Getting your location..."}</div>
      </div>
    )
  }

  return (
    <MapView
      posts={posts}
      onClose={() => window.history.back()}
      userLocation={userLocation}
      cityName={cityName}
      cityBounds={cityBounds}
    />
  )
}
