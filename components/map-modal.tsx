"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, X, RefreshCw, MapPin, AlertCircle } from "lucide-react"
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
  const [loadingStep, setLoadingStep] = useState<string>("Initializing...")

  // Filter posts that have location data
  const postsWithLocation = posts.filter(
    (post) => post.latitude && post.longitude && !isNaN(Number(post.latitude)) && !isNaN(Number(post.longitude)),
  )

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || mapInitialized) return

    console.log("Map modal opened, starting initialization...")
    setIsLoading(true)
    setLocationError(null)
    setLoadingStep("Loading map library...")

    loadLeaflet()
  }, [isOpen, mapInitialized])

  // Load Leaflet with better error handling
  const loadLeaflet = async () => {
    try {
      console.log("Starting Leaflet loading process...")

      // Check if already loaded
      if (window.L) {
        console.log("Leaflet already loaded")
        setLoadingStep("Initializing map...")
        initializeMap()
        return
      }

      // Load CSS first
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        console.log("Loading Leaflet CSS...")
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        link.crossOrigin = ""
        document.head.appendChild(link)
      }

      // Load JavaScript
      console.log("Loading Leaflet JavaScript...")
      setLoadingStep("Loading map components...")

      await new Promise<void>((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="leaflet.js"]')
        if (existingScript) {
          existingScript.remove()
        }

        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        script.crossOrigin = ""

        script.onload = () => {
          console.log("Leaflet script loaded successfully")
          // Give it a moment to initialize
          setTimeout(() => {
            if (window.L) {
              console.log("Leaflet is available on window.L")
              resolve()
            } else {
              console.error("Leaflet loaded but window.L is not available")
              reject(new Error("Leaflet failed to initialize"))
            }
          }, 100)
        }

        script.onerror = (error) => {
          console.error("Failed to load Leaflet script:", error)
          reject(new Error("Failed to load map library"))
        }

        // Add timeout
        setTimeout(() => {
          reject(new Error("Script loading timeout"))
        }, 10000)

        document.head.appendChild(script)
        console.log("Leaflet script element added to DOM")
      })

      console.log("Leaflet loaded, initializing map...")
      setLoadingStep("Setting up map...")
      initializeMap()
    } catch (error) {
      console.error("Error loading Leaflet:", error)
      setLocationError(`Failed to load map: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }

  // Initialize the map
  const initializeMap = () => {
    console.log("Initializing map...")

    if (!window.L) {
      console.error("window.L is not available")
      setLocationError("Map library not loaded properly")
      setIsLoading(false)
      return
    }

    if (!mapRef.current) {
      console.error("Map container ref is not available")
      setLocationError("Map container not ready")
      setIsLoading(false)
      return
    }

    if (mapInstance) {
      console.log("Map instance already exists")
      return
    }

    try {
      console.log("Creating map instance...")
      setLoadingStep("Creating map...")

      // Default center (will be updated later)
      const defaultCenter: [number, number] = [37.7749, -122.4194]

      // Create map instance
      const map = window.L.map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
      })

      console.log("Map instance created, adding tile layer...")

      // Add tile layer
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      console.log("Tile layer added, setting state...")

      setMapInstance(map)
      setMapInitialized(true)

      console.log("Map initialized successfully, getting user location...")
      setLoadingStep("Getting your location...")

      // Get user location after map is initialized
      getUserLocation(map)
    } catch (error) {
      console.error("Error initializing map:", error)
      setLocationError(`Failed to create map: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }

  // Get user's current location
  const getUserLocation = (map: any) => {
    console.log("Getting user location...")

    if (!navigator.geolocation) {
      console.error("Geolocation not supported")
      setLocationError("Geolocation is not supported by this browser")
      addPostMarkers(map)
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location obtained:", position.coords)
        const userLoc: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserLocation(userLoc)

        // Add user marker and center map
        if (map && window.L) {
          console.log("Adding user marker and centering map...")
          map.setView(userLoc, 13)

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

        addPostMarkers(map)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error getting location:", error)

        let errorMessage = "Couldn't access your location."
        if (error.code === 1) {
          errorMessage = "Location permission denied. Please enable location access in your browser settings."
        } else if (error.code === 2) {
          errorMessage = "Your location is currently unavailable. The map will still show issue locations."
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again."
        }

        setLocationError(errorMessage)
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
    if (!map || !window.L) {
      console.error("Map or Leaflet not available for adding post markers")
      return
    }

    console.log(`Adding ${postsWithLocation.length} post markers...`)

    if (postsWithLocation.length === 0) {
      console.log("No posts with location data")
      return
    }

    // If no user location, center on first post
    if (!userLocation && postsWithLocation.length > 0) {
      const firstPost = postsWithLocation[0]
      const postLoc: [number, number] = [Number(firstPost.latitude), Number(firstPost.longitude)]
      map.setView(postLoc, 13)
    }

    // Add markers for all posts with location
    postsWithLocation.forEach((post, index) => {
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

      console.log(`Added marker ${index + 1} for post: ${post.title}`)
    })
  }

  // Retry loading the map
  const retryMapLoad = () => {
    console.log("Retrying map load...")
    setIsLoading(true)
    setLocationError(null)
    setMapInitialized(false)
    setMapInstance(null)
    setLoadingStep("Retrying...")
    loadLeaflet()
  }

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen && mapInstance) {
      console.log("Cleaning up map instance...")
      mapInstance.remove()
      setMapInstance(null)
      setMapInitialized(false)
      setUserLocation(null)
      setLocationError(null)
      setIsLoading(true)
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
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-40">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <span>{loadingStep}</span>
              </div>
            </div>
          )}

          {locationError && (
            <div className="absolute top-4 right-4 z-50 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-md max-w-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm mb-2">{locationError}</p>
                  <Button variant="outline" size="sm" onClick={retryMapLoad} className="w-full text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" /> Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mapInitialized && postsWithLocation.length === 0 && !isLoading && (
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
