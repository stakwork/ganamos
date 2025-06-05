"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider" // Keep useAuth to potentially use user info if available
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { mockPosts } from "@/lib/mock-data"
import type { Post } from "@/lib/types"
import { MapView } from "@/components/map-view"
import { Loader2 } from "lucide-react" // For a generic loading indicator
import { getCurrentLocationWithName } from "@/lib/geocoding"

export default function MapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, sessionLoaded } = useAuth() // Use sessionLoaded to wait for auth state
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const supabase = createBrowserSupabaseClient()
  const [userLocationBounds, setUserLocationBounds] = useState<google.maps.LatLngBounds | null>(null)

  const centerPostId = searchParams.get("centerPost")
  const centerPost = posts.find((post) => post.id === centerPostId) || undefined

  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const zoomType = searchParams.get("zoom")
  const locationName = searchParams.get("name")

  const getCurrentUserLocationWithBounds = async () => {
    try {
      const locationData = await getCurrentLocationWithName()
      if (locationData) {
        // Use Google Places API to get bounds for the city
        if (typeof window !== "undefined" && window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder()
          const placesService = new window.google.maps.places.PlacesService(document.createElement("div"))

          // First, try to find the place using Places API for better bounds
          const request = {
            query: locationData.name,
            fields: ["geometry", "name"],
          }

          placesService.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
              const place = results[0]
              if (place.geometry?.viewport) {
                setUserLocationBounds(place.geometry.viewport)
              } else if (place.geometry?.bounds) {
                setUserLocationBounds(place.geometry.bounds)
              }
            } else {
              // Fallback to geocoding
              geocoder.geocode({ address: locationData.name }, (results, status) => {
                if (status === "OK" && results && results[0]) {
                  if (results[0].geometry.viewport) {
                    setUserLocationBounds(results[0].geometry.viewport)
                  } else if (results[0].geometry.bounds) {
                    setUserLocationBounds(results[0].geometry.bounds)
                  }
                }
              })
            }
          })
        }
      }
    } catch (error) {
      console.error("Error getting user location with bounds:", error)
    }
  }

  useEffect(() => {
    // Fetch posts and handle user location if no specific location params are provided
    if (sessionLoaded) {
      fetchPosts()

      // If no specific location parameters are provided, get user's current location
      if (!lat && !lng) {
        getCurrentUserLocationWithBounds()
      }
    }
  }, [sessionLoaded, lat, lng]) // Also depend on lat/lng to avoid getting location when specific coords are provided

  const fetchPosts = async () => {
    setIsLoadingPosts(true)
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .eq("fixed", false)
          .neq("under_review", true)

        if (data && !error) {
          setPosts(data)
        } else if (error) {
          console.error("Error fetching posts from Supabase:", error)
          // Fallback to mock data on Supabase error
          const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
          setPosts(filteredPosts)
        } else {
          // No data and no error, fallback to mock
          const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
          setPosts(filteredPosts)
        }
      } else {
        // Fall back to mock data if Supabase client isn't available (shouldn't happen)
        const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
        setPosts(filteredPosts)
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
      setPosts(filteredPosts)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const handleClose = () => {
    router.back()
  }

  const userLocation =
    lat && lng
      ? {
          latitude: Number.parseFloat(lat),
          longitude: Number.parseFloat(lng),
          zoomType: zoomType || "default",
          name: locationName || "",
        }
      : userLocationBounds
        ? {
            latitude: userLocationBounds.getCenter().lat(),
            longitude: userLocationBounds.getCenter().lng(),
            zoomType: "city",
            name: "",
            bounds: userLocationBounds,
          }
        : undefined

  // Show a loading indicator while auth state is being determined or posts are loading
  if (authLoading || isLoadingPosts) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          Loading Map...
        </div>
      </div>
    )
  }

  // At this point, auth state is known (user might be null for anonymous)
  // and posts have been attempted to be fetched.
  return (
    <div className="h-screen w-screen">
      <MapView
        posts={posts}
        centerPost={centerPost}
        onClose={handleClose}
        isLoading={isLoadingPosts} // Pass post loading state to MapView
        userLocation={userLocation}
        bounds={userLocation?.bounds}
        // Potentially pass 'user' to MapView if it needs to behave differently for logged-in users
        // user={user}
      />
    </div>
  )
}
