"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface LocationInputProps {
  onLocationChange: (location: string) => void
}

const LocationInput: React.FC<LocationInputProps> = ({ onLocationChange }) => {
  const [location, setLocation] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined" && !window.google) {
      // Load the Google Maps script from our secure API endpoint
      const script = document.createElement("script")
      script.src = "/api/maps"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }, [])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(event.target.value)
  }

  useEffect(() => {
    if (window.google && location) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        document.getElementById("location-input") as HTMLInputElement,
      )

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          onLocationChange(place.formatted_address)
        } else {
          onLocationChange(location) // Fallback to the typed location
        }
      })
    }
  }, [location, onLocationChange])

  return (
    <div>
      <input
        type="text"
        id="location-input"
        placeholder="Enter location"
        value={location}
        onChange={handleInputChange}
      />
    </div>
  )
}

export default LocationInput
