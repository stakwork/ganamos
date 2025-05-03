"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { mockLocations, getCurrentLocation, saveSelectedLocation, type MockLocation } from "@/lib/mock-location"
import { isBrowser } from "@/lib/browser-utils"

interface LocationSelectorProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function LocationSelector({ isOpen, onOpenChange }: LocationSelectorProps) {
  // Initialize with a default location for SSR
  const [selectedLocation, setSelectedLocation] = useState<MockLocation>(mockLocations[0])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark that we're now client-side
    setIsClient(true)
    // Initialize with stored location on mount
    setSelectedLocation(getCurrentLocation())
  }, [])

  const handleLocationChange = (locationId: string) => {
    const location = mockLocations.find((loc) => loc.id === locationId)
    if (location) {
      setSelectedLocation(location)
      if (isBrowser) {
        saveSelectedLocation(locationId)
      }
    }
  }

  const handleSave = () => {
    if (isBrowser) {
      saveSelectedLocation(selectedLocation.id)
    }
    onOpenChange(false)
  }

  // Only render the full component on the client side
  if (!isClient) {
    return null // Return null or a loading state during SSR
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Location</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedLocation.id} onValueChange={handleLocationChange} className="space-y-3">
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
        </div>
        <Button onClick={handleSave} className="w-full">
          Save Location
        </Button>
      </DialogContent>
    </Dialog>
  )
}
