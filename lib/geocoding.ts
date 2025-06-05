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
          "User-Agent": "Ganamos-App/1.0", // Good practice to set a User-Agent
        },
      },
    )

    if (!response.ok) {
      // Consider logging response status/text for more detailed error info
      console.error(`Geocoding request failed with status: ${response.status}`)
      throw new Error("Geocoding request failed")
    }

    const data = await response.json()

    if (data && data.address) {
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
      // If only minor address parts are available, fallback to display_name or coords
    }

    if (data.display_name) {
      const displayName = data.display_name
      if (displayName.length > 50) {
        const parts = displayName.split(",")
        return parts.slice(0, 2).join(",").trim() // Take first two significant parts
      }
      return displayName
    }

    // Ultimate fallback if no usable address parts or display_name
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  } catch (error) {
    console.error("Reverse geocoding failed:", error)
    // Fallback to coordinates on any error during reverse geocoding
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  }
}

// Helper function for a single geolocation attempt
async function attemptGetCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export async function getCurrentLocationWithName(): Promise<LocationData | null> {
  if (!navigator.geolocation) {
    console.warn("Geolocation API not supported in this browser.")
    // Consistently throw an error object that the UI can check for .code
    const error: GeolocationPositionError = {
      code: 0, // Custom code for "not supported" or handle differently
      message: "Geolocation is not supported by your browser.",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }
    throw error
  }

  let position: GeolocationPosition | null = null
  let lastError: GeolocationPositionError | null = null

  // Attempt 1: High accuracy, allow recent cache, moderate timeout
  const options1: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 12000, // Increased from 10000ms
    maximumAge: 60000, // Allow 1-minute old cache
  }

  console.log("Attempting geolocation (1st try) with options:", options1)
  try {
    position = await attemptGetCurrentPosition(options1)
    console.log("Geolocation success (1st try):", position.coords)
  } catch (e) {
    lastError = e as GeolocationPositionError
    console.warn(`Geolocation failed (1st try) - Code: ${lastError.code}, Message: ${lastError.message}`)

    // Attempt 2: Lower accuracy, longer timeout, allow older cache (if error was timeout or position unavailable)
    if (
      lastError.code === GeolocationPositionError.TIMEOUT ||
      lastError.code === GeolocationPositionError.POSITION_UNAVAILABLE
    ) {
      const options2: PositionOptions = {
        enableHighAccuracy: false, // Key change: try without high accuracy
        timeout: 20000, // Longer timeout
        maximumAge: 300000, // Allow 5-minute old cache
      }
      console.log("Attempting geolocation (2nd try - fallback) with options:", options2)
      try {
        position = await attemptGetCurrentPosition(options2)
        console.log("Geolocation success (2nd try):", position.coords)
        lastError = null // Clear previous error as this attempt succeeded
      } catch (e2) {
        lastError = e2 as GeolocationPositionError // Store the second error
        console.warn(`Geolocation failed (2nd try) - Code: ${lastError.code}, Message: ${lastError.message}`)
      }
    }
  }

  if (position) {
    const { latitude, longitude } = position.coords
    try {
      const name = await reverseGeocode(latitude, longitude)
      return {
        name,
        latitude,
        longitude,
      }
    } catch (reverseGeocodeError) {
      console.error("Error getting location name after successful geolocation:", reverseGeocodeError)
      // Fallback to coordinates if reverse geocoding fails but geolocation succeeded
      return {
        name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, // Provide coords as name
        latitude,
        longitude,
      }
    }
  } else {
    // If position is still null, it means all attempts failed or permission was denied initially.
    // Throw the last encountered error (or a generic one if somehow lastError is null).
    if (lastError) {
      throw lastError // This allows the calling UI to inspect error.code
    }
    // This case should ideally not be reached if navigator.geolocation exists and attempts were made.
    // However, as a safeguard:
    const genericError: GeolocationPositionError = {
      code: GeolocationPositionError.POSITION_UNAVAILABLE,
      message: "Unable to determine location after multiple attempts.",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }
    throw genericError
  }
}
