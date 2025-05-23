"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Post } from "@/lib/types"

// Dynamic import for the map components to avoid SSR issues
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const useMap = dynamic(() => import("react-leaflet").then((mod) => mod.useMap), { ssr: false })

// Custom hook to set view to user location
function SetViewToUserLocation({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 13)
    }
  }, [map, userLocation])

  return null
}

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  posts: Post[]
}

export function MapModal({ isOpen, onClose, posts }: MapModalProps) {
  const router = useRouter()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Filter posts that have location data
  const postsWithLocation = posts.filter(
    (post) => post.latitude && post.longitude && !isNaN(Number(post.latitude)) && !isNaN(Number(post.longitude)),
  )

  // Load Leaflet when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      // Check if Leaflet is already loaded
      if (window.L) {
        setLeafletLoaded(true)
        return
      }

      // Load Leaflet CSS and JS
      const loadLeaflet = async () => {
        try {
          // Load CSS
          if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            document.head.appendChild(link)
          }

          // Load JS
          if (!window.L) {
            await new Promise((resolve, reject) => {
              const script = document.createElement("script")
              script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
              script.onload = resolve
              script.onerror = reject
              document.head.appendChild(script)
            })
          }

          setLeafletLoaded(true)
        } catch (error) {
          console.error("Failed to load Leaflet:", error)
          setLocationError("Failed to load map. Please try again.")
          setIsLoading(false)
        }
      }

      loadLeaflet()
    }
  }, [isOpen])

  // Get user's current location
  useEffect(() => {
    if (isOpen && leafletLoaded) {
      setIsLoading(true)
      setLocationError(null)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
          setIsLoading(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocationError("Couldn't access your location. Please check your permissions.")
          setIsLoading(false)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      )
    }
  }, [isOpen, leafletLoaded])

  // Navigate to post detail page when marker is clicked
  const handleMarkerClick = (postId: string) => {
    onClose()
    router.push(`/post/${postId}`)
  }

  // Calculate map center based on posts and user location
  const getMapCenter = () => {
    if (userLocation) return userLocation

    if (postsWithLocation.length > 0) {
      // Use the first post with location as center
      return [Number(postsWithLocation[0].latitude), Number(postsWithLocation[0].longitude)] as [number, number]
    }

    // Default to a central location if no posts or user location
    return [37.7749, -122.4194] as [number, number]
  }

  // Create custom icons only when Leaflet is loaded
  const createUserLocationIcon = () => {
    if (!window.L) return null
    return new window.L.DivIcon({
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
  }

  const createPostIcon = () => {
    if (!window.L) return null
    return new window.L.DivIcon({
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0">
        <DialogHeader className="absolute top-4 left-4 z-50">
          <DialogTitle className="sr-only">Issue Locations Map</DialogTitle>
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
          {isLoading || !leafletLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-40">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <span>{!leafletLoaded ? "Loading map..." : "Getting your location..."}</span>
              </div>
            </div>
          ) : locationError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-40 p-4 text-center">
              <div>
                <p className="text-red-500 mb-2">{locationError}</p>
                <p>Map will still show issue locations.</p>
              </div>
            </div>
          ) : null}

          {leafletLoaded && !isLoading && (
            <MapContainer center={getMapCenter()} zoom={13} style={{ height: "100%", width: "100%" }} className="z-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {userLocation && (
                <>
                  <Marker position={userLocation} icon={createUserLocationIcon()}>
                    <Popup>
                      <div className="text-sm font-medium">Your location</div>
                    </Popup>
                  </Marker>
                  <SetViewToUserLocation userLocation={userLocation} />
                </>
              )}

              {postsWithLocation.map((post) => (
                <Marker
                  key={post.id}
                  position={[Number(post.latitude), Number(post.longitude)]}
                  icon={createPostIcon()}
                  eventHandlers={{
                    click: () => handleMarkerClick(post.id),
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h3 className="font-medium text-sm mb-1 line-clamp-1">{post.title || "Issue"}</h3>
                      <p className="text-xs line-clamp-2">{post.description}</p>
                      <button
                        className="text-xs text-blue-600 mt-1 hover:underline"
                        onClick={() => handleMarkerClick(post.id)}
                      >
                        View details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
