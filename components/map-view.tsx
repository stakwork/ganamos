"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import type { Post } from "@/types"

interface MapViewProps {
  posts: Post[]
  centerPost?: Post
  onClose: () => void
  isLoading: boolean
  userLocation?: {
    latitude: number
    longitude: number
    zoomType: string
  }
}

const MapView: React.FC<MapViewProps> = ({ posts, centerPost, onClose, isLoading, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [lng, setLng] = useState(-73.9857)
  const [lat, setLat] = useState(40.7589)
  const [zoom, setZoom] = useState(12)

  useEffect(() => {
    if (map.current) return // initialize map only once
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [lng, lat],
      zoom: zoom,
    })

    // After the map is created, check if we have user location to zoom to
    if (userLocation && userLocation.zoomType === "city") {
      // Set appropriate zoom level for city bounds (typically 11-13)
      const cityZoom = 12
      map.current.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude })
      map.current.setZoom(cityZoom)
    } else if (centerPost) {
      // Existing centerPost logic
      map.current.setCenter({ lat: centerPost.latitude, lng: centerPost.longitude })
      map.current.setZoom(15)
    }

    map.current.on("move", () => {
      setLng(map.current!.getCenter().lng.toFixed(4))
      setLat(map.current!.getCenter().lat.toFixed(4))
      setZoom(map.current!.getZoom().toFixed(2))
    })

    posts.forEach((post) => {
      new maplibregl.Marker().setLngLat([post.longitude, post.latitude]).addTo(map.current!)
    })

    return () => {
      map.current?.remove()
    }
  }, [posts, centerPost, userLocation])

  return (
    <div className="h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  )
}

export default MapView
