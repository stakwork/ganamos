export interface LocationData {
  name: string
  latitude: number
  longitude: number
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Ganamos-App/1.0",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }

    const data = await response.json()

    if (data && data.address) {
      // Extract only city and state/province
      const address = data.address
      const city = address.city || address.town || address.village || ""
      const state = address.state || address.province || ""

      if (city && state) {
        return `${city}, ${state}`
      } else if (city) {
        return city
      } else if (state) {
        return state
      }
    }

    // Fallback to display_name if available
    if (data.display_name) {
      // Truncate long display names
      const displayName = data.display_name
      if (displayName.length > 50) {
        const parts = displayName.split(",")
        return parts.slice(0, 2).join(",").trim()
      }
      return displayName
    }

    // Fallback to coordinates
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  } catch (error) {
    console.error("Reverse geocoding failed:", error)
    // Fallback to coordinates on error
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  }
}

export async function getCurrentLocationWithName(): Promise<LocationData | null> {
  return new Promise((resolve, reject) => {
    // Changed to reject for better error propagation
    if (!navigator.geolocation) {
      // Create a GeolocationPositionError-like object for consistency
      const error: GeolocationPositionError = {
        code: 0, // Custom code for "not supported"
        message: "Geolocation is not supported by your browser.",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }
      reject(error) // Reject with the error object
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const name = await reverseGeocode(latitude, longitude)
          resolve({
            name,
            latitude,
            longitude,
          })
        } catch (error) {
          console.error("Error getting location name:", error)
          // Resolve with coordinates if reverse geocoding fails
          resolve({
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude,
            longitude,
          })
        }
      },
      (error) => {
        // This is a GeolocationPositionError
        console.error("Geolocation error in getCurrentLocationWithName:", error.code, error.message)
        reject(error) // Reject with the actual GeolocationPositionError
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}
