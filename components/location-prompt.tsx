"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { mockLocations, saveSelectedLocation } from "@/lib/mock-location"
import { isBrowser } from "@/lib/browser-utils"

export function LocationPrompt({ onPermissionGranted }: { onPermissionGranted: () => void }) {
  // Initialize with a default value for SSR
  const [selectedLocation, setSelectedLocation] = useState("")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark that we're now client-side
    setIsClient(true)
    // Set initial location after component mounts
    if (Array.isArray(mockLocations) && mockLocations.length > 0) {
      setSelectedLocation(mockLocations[0].id)
    }
  }, [])

  const handleContinue = () => {
    // Save the selected mock location
    if (isBrowser && selectedLocation) {
      saveSelectedLocation(selectedLocation)
    }
    onPermissionGranted()
  }

  // Only render the full component on the client side
  if (!isClient) {
    return (
      <div className="container flex items-center justify-center h-screen max-w-md px-4 mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container flex items-center justify-center h-screen max-w-md px-4 mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Choose Your Location</CardTitle>
          <CardDescription>Select a location to see nearby issues in your area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 mb-4 bg-blue-100 rounded-full mx-auto w-16 h-16 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>

          <RadioGroup value={selectedLocation} onValueChange={setSelectedLocation} className="space-y-3">
            {Array.isArray(mockLocations) && mockLocations.length > 0 ? (
              mockLocations.map((location) => (
                <div key={location.id} className="flex items-start space-x-2 border p-3 rounded-md">
                  <RadioGroupItem value={location.id} id={location.id} className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor={location.id} className="font-medium">
                      {location.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{location.description}</p>
                    <p className="text-xs text-muted-foreground">{location.distance}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">No locations available</div>
            )}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleContinue} disabled={!selectedLocation}>
            Continue with Selected Location
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
