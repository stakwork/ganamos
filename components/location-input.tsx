"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"

interface LocationInputProps {
  value: string
  onChange: (value: string, placeDetails?: google.maps.places.PlaceResult) => void
  placeholder?: string
  className?: string
}

declare global {
  interface Window {
    google?: any
  }
}

export function LocationInput({ value, onChange, placeholder, className }: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["(cities)"],
      fields: ["place_id", "formatted_address", "name", "geometry", "address_components"],
    })

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      console.log("Place selected:", place)
      if (place) {
        // Ensure we have location data even if formatted_address is missing
        const locationName = place.formatted_address || place.name || ""
        console.log("Setting location name:", locationName)

        // Always pass the place object for coordinates
        onChange(locationName, place)
      }
    })

    setIsLoaded(true)
  }

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      initializeAutocomplete()
    } else {
      // Wait for Google Maps to load
      const checkGoogleMaps = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleMaps)
          initializeAutocomplete()
        }
      }, 100)

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogleMaps), 10000)
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => {
        // Update parent state when typing manually
        onChange(e.target.value)
      }}
      placeholder={placeholder}
      className={className}
      onFocus={() => {
        // Ensure Google Maps script is loaded
        if (!window.google?.maps?.places && !document.getElementById("google-maps-script")) {
          // Use the script that's already loaded in the app layout or other components
          // instead of directly embedding the API key
          const script = document.createElement("script")
          script.id = "google-maps-script"
          script.src = "https://maps.googleapis.com/maps/api/js?libraries=places"
          script.async = true
          script.defer = true
          script.onload = () => initializeAutocomplete()
          document.head.appendChild(script)
        }
      }}
    />
  )
}
