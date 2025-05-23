"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, X, RefreshCw, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Post } from "@/lib/types"

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  posts: Post[]
}

export function MapModal({ isOpen, onClose, posts }: MapModalProps) {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  // Filter posts that have location data
  const postsWithLocation = posts.filter(
    (post) => post.latitude && post.longitude && !isNaN(Number(post.latitude)) && !isNaN(Number(post.longitude)),
  )

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInitialized) return

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    const loadLeaflet = async () => {
      try {
        if (!window.L) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script")
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            script.onload = () => resolve()
            script.onerror = () => reject(new Error("Failed to load Leaflet"))
            document.head.appendChild(script)
          })
        }

        // Initialize map after Leaflet is loaded
        initializeMap()
      } catch (error) {
        console.error("Failed to load Leaflet:", error)
        setLocationError("Failed to load map. Please try again.")
        setIsLoading(false)
      }
    }

    loadLeaflet()
  }, [isOpen, mapInitialized])

  // Initialize the map
  const initializeMap = () => {
    if (!window.L || !mapRef.current || mapInstance) return

    try {
      // Default center (will be updated later)
      const defaultCenter = [37.7749, -122.4194]

      // Create map instance
      const map = window.L.map(mapRef.current).setView(defaultCenter, 13)

      // Add tile layer
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      setMapInstance(map)
      setMapInitialized(true)

      // Get user location after map is initialized
      getUserLocation(map)
    } catch (error) {
      console.error("Error initializing map:", error)
      setLocationError("Failed to initialize map. Please try again.")
      setIsLoading(false)
    }
  }

  // Get user's current location
  const getUserLocation = (map: any) => {
    setIsLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserLocation(userLoc)

        // Add user marker
        if (map) {
          // Center map on user location
          map.setView(userLoc, 13)

          // Add user marker
          const userIcon = window.L.divIcon({
            html: `
              <div class="relative">
                <div class="h-4 w-4 rounded-full bg-blue-500 animate-pulse"></div>
                <div class="absolute -inset-1 rounded-full bg-blue-500 opacity-30"></div>
              </div>
            `,
            className: "user-location-marker",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })

          window.L.marker(userLoc, { icon: userIcon }).addTo(map).bindPopup("Your location")
        }

        // Add post markers
        addPostMarkers(map)

        setIsLoading(false)
      },
      (error) => {
        console.error("Error getting location:", error)

        // Provide specific error messages based on error code
        let errorMessage = "Couldn't access your location."

        if (error.code === 1) {
          // PERMISSION_DENIED
          errorMessage = "Location permission denied. Please enable location access in your browser settings."
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE
          errorMessage = "Your location is currently unavailable. The map will still show issue locations."
        } else if (error.code === 3) {
          // TIMEOUT
          errorMessage = "Location request timed out. Please try again."
        }

        setLocationError(errorMessage)

        // Still add post markers even without user location
        addPostMarkers(map)

        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  // Add markers for posts with location data
  const addPostMarkers = (map: any) => {
    if (!map || !window.L) return

    if (postsWithLocation.length === 0) return

    // If no user location, center on first post
    if (!userLocation && postsWithLocation.length > 0) {
      const firstPost = postsWithLocation[0]
      const postLoc: [number, number] = [Number(firstPost.latitude), Number(firstPost.longitude)]
      map.setView(postLoc, 13)
    }

    // Add markers for all posts with location
    postsWithLocation.forEach((post) => {
      const postLoc: [number, number] = [Number(post.latitude), Number(post.longitude)]

      const postIcon = window.L.divIcon({
        html: `
          <div class="flex items-center justify-center h-8 w-8 rounded-full bg-red-500 text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        className: "post-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      window.L.marker(postLoc, { icon: postIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1">
            <h3 class="font-medium text-sm mb-1">${post.title || "Issue"}</h3>
            <p class="text-xs">${post.description?.substring(0, 100) || ""}</p>
            <button class="text-xs text-blue-600 mt-1 hover:underline post-link" data-post-id="${post.id}">
              View details
            </button>
          </div>
        `)
        .on("popupopen", (e: any) => {
          // Add click handler to the "View details" button
          const popup = e.popup._contentNode
          const button = popup.querySelector(".post-link")
          if (button) {
            button.addEventListener("click", () => {
              const postId = button.getAttribute("data-post-id")
              if (postId) {
                onClose()
                router.push(`/post/${postId}`)
              }
            })
          }
        })
    })
  }

  // Retry getting location
  const retryLocation = () => {
    if (mapInstance) {
      getUserLocation(mapInstance)
    }
  }

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen && mapInstance) {
      mapInstance.remove()
      setMapInstance(null)
      setMapInitialized(false)
    }
  }, [isOpen, mapInstance])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0">
        <DialogHeader className="absolute top-4 left-4 z-50 flex flex-row items-center gap-2">
          <DialogTitle className="sr-only">Issue Locations Map</DialogTitle>
          <DialogDescription className="sr-only">
            Map showing locations of community issues and your current location
          </DialogDescription>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-md"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="h-[80vh] w-full relative">
          {isLoading && !mapInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-40">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <span>Loading map...</span>
              </div>
            </div>
          )}

          {locationError && (
            <div className="absolute top-4 right-4 z-50 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-md max-w-xs">
              <p className="text-sm mb-2">{locationError}</p>
              {locationError.includes("unavailable") && (
                <Button variant="outline" size="sm" onClick={retryLocation} className="w-full text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" /> Try Again
                </Button>
              )}
            </div>
          )}

          {mapInitialized && postsWithLocation.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-40">
              <div className="text-center p-4 max-w-xs">
                <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium mb-2">No issues with location data</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  None of the current issues have location information attached.
                </p>
              </div>
            </div>
          )}

          <div ref={mapRef} className="h-full w-full" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
