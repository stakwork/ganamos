import { safeLocalStorage } from "./browser-utils"

export interface MockLocation {
  id: string
  name: string
  description: string
  distance: string
  lat: number
  lng: number
}

export const mockLocations: MockLocation[] = [
  {
    id: "downtown",
    name: "Downtown",
    description: "City center with many reported issues",
    distance: "0.5 miles away",
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    id: "mission",
    name: "Mission District",
    description: "Vibrant neighborhood with active community",
    distance: "1.2 miles away",
    lat: 37.7599,
    lng: -122.4148,
  },
  {
    id: "soma",
    name: "SoMa",
    description: "South of Market area with tech companies",
    distance: "0.8 miles away",
    lat: 37.7785,
    lng: -122.3995,
  },
  {
    id: "richmond",
    name: "Richmond District",
    description: "Residential area near Golden Gate Park",
    distance: "3.5 miles away",
    lat: 37.7802,
    lng: -122.4828,
  },
]

const LOCATION_STORAGE_KEY = "ganamos_selected_location"

export function saveSelectedLocation(locationId: string): void {
  safeLocalStorage.setItem(LOCATION_STORAGE_KEY, locationId)
}

export function getCurrentLocation(): MockLocation {
  const savedLocationId = safeLocalStorage.getItem(LOCATION_STORAGE_KEY)

  if (savedLocationId) {
    const foundLocation = mockLocations.find((loc) => loc.id === savedLocationId)
    if (foundLocation) {
      return foundLocation
    }
  }

  // Default to first location if none is saved or found
  return mockLocations[0]
}
