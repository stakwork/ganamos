"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Sprout, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LocationInput } from "@/components/location-input"
import { createDonationInvoice } from "@/app/actions/donation-actions"
import { getLocationRecommendations } from "@/app/actions/location-actions"
import { LightningInvoiceModal } from "@/components/lightning-invoice-modal"
import { getCurrentLocationWithName } from "@/lib/geocoding"
import type { PlaceResult } from "@googlemaps/google-maps-services-js"

interface RecommendedLocation {
  name: string
  type: string
  emoji: string
  openIssues: number
  locationType: string
  locationName: string
}

declare global {
  interface Window {
    google: any
  }
}

export default function DonatePage() {
  const router = useRouter()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [recommendedLocations, setRecommendedLocations] = useState<RecommendedLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<RecommendedLocation | null>(null)
  const [customLocation, setCustomLocation] = useState("")
  const [customLocationDetails, setCustomLocationDetails] = useState<PlaceResult | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState<{ paymentRequest: string; poolId: string } | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  const amountOptions = [
    { label: "1K", value: 1000 },
    { label: "10K", value: 10000 },
    { label: "100K", value: 100000 },
  ]

  // Load location recommendations on mount
  useEffect(() => {
    async function loadLocationRecommendations() {
      try {
        setIsLoadingLocations(true)

        // Try to get user's current location
        let userLocation = null
        try {
          const currentLocation = await getCurrentLocationWithName()
          if (currentLocation) {
            userLocation = {
              locality: currentLocation.locality,
              admin_area_1: currentLocation.admin_area_1,
              country: currentLocation.country,
              country_code: currentLocation.country_code,
            }
          }
        } catch (error) {
          console.log("Could not get user location, using global recommendations")
        }

        // Get recommendations based on user location
        const recommendations = await getLocationRecommendations(userLocation)
        setRecommendedLocations(recommendations)

        // Set Global as default selection
        const globalLocation = recommendations.find((loc) => loc.type === "global")
        if (globalLocation) {
          setSelectedLocation(globalLocation)
        }
      } catch (error) {
        console.error("Error loading location recommendations:", error)
        // Fallback to just Global
        const fallback = {
          name: "Global",
          type: "global",
          emoji: "🌎",
          openIssues: 0,
          locationType: "global",
          locationName: "Global",
        }
        setRecommendedLocations([fallback])
        setSelectedLocation(fallback)
      } finally {
        setIsLoadingLocations(false)
      }
    }

    loadLocationRecommendations()
  }, [])

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
    setShowCustomAmount(false)
  }

  const handleWhaleClick = () => {
    setShowCustomAmount(true)
    setSelectedAmount(null)
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedAmount(numValue)
    } else {
      setSelectedAmount(null)
    }
  }

  const handleLocationSelect = (location: RecommendedLocation) => {
    setSelectedLocation(location)
    setCustomLocation("")
    setCustomLocationDetails(null)
  }

  const handleCustomLocationChange = (value: string, placeDetails?: google.maps.places.PlaceResult) => {
    setCustomLocation(value)
    setCustomLocationDetails(placeDetails || null)
    setSelectedLocation(null)
  }

  const handleDonate = async () => {
    if (!selectedAmount) return

    let locationType = ""
    let locationName = ""

    if (selectedLocation) {
      locationType = selectedLocation.locationType
      locationName = selectedLocation.locationName
    } else if (customLocationDetails) {
      locationType = "place"
      locationName = customLocationDetails.formatted_address || customLocation
    } else if (customLocation) {
      locationType = "place"
      locationName = customLocation
    } else {
      return
    }

    setIsCreatingInvoice(true)

    try {
      const result = await createDonationInvoice({
        amount: selectedAmount,
        locationType,
        locationName,
      })

      if (result.success) {
        setInvoiceData({
          paymentRequest: result.paymentRequest!,
          poolId: result.poolId!,
        })
        setShowInvoiceModal(true)
      } else {
        console.error("Failed to create donation invoice:", result.error)
      }
    } catch (error) {
      console.error("Error creating donation invoice:", error)
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const canDonate = selectedAmount && selectedAmount > 0 && (selectedLocation || customLocation)

  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      {/* Combined Header and Educational Section */}
      <div className="mb-8 text-center p-6 border dark:border-gray-800 rounded-lg">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Sprout className="w-8 h-8 text-green-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-3">Donate to fix issues</h1>
        <p className="text-gray-600 text-sm px-2 leading-relaxed">
          Incentivize the community to fix issues. The more you donate, the faster the community improves.
        </p>
      </div>

      <div className="space-y-6">
        {/* Amount Selection */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <img src="/images/bitcoin-logo.png" alt="Bitcoin" className="w-6 h-6" />
            <h3 className="font-semibold">Choose Amount</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {amountOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                onClick={() => handleAmountSelect(option.value)}
                className={`h-16 flex flex-col justify-center hover:bg-accent hover:text-accent-foreground ${
                  selectedAmount === option.value ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="font-bold text-lg">{option.label}</div>
                <div className="text-xs text-muted-foreground">sats</div>
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={handleWhaleClick}
              className={`h-16 flex flex-col justify-center hover:bg-accent hover:text-accent-foreground ${
                showCustomAmount ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="text-2xl">🐋</div>
              <div className="text-xs text-muted-foreground">custom</div>
            </Button>
          </div>

          {showCustomAmount && (
            <div className="mt-3">
              <Input
                type="number"
                placeholder="Enter custom amount in sats"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Location Selection */}
        <div>
          <h3 className="font-semibold mb-3">Choose Location</h3>

          {/* Loading State */}
          {isLoadingLocations && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading locations...</span>
            </div>
          )}

          {/* Recommended Locations */}
          {!isLoadingLocations && (
            <div className="space-y-2 mb-4">
              {recommendedLocations.map((location, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${
                    selectedLocation === location ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleLocationSelect(location)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{location.emoji}</span>
                        <div>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-gray-500">
                            {location.openIssues} open issue{location.openIssues !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Custom Location Toggle */}
          {!isLoadingLocations && (
            <LocationInput
              value={customLocation}
              onChange={handleCustomLocationChange}
              placeholder="Search locations..."
              className="w-full"
            />
          )}
        </div>

        {/* Donate Button */}
        <Button
          onClick={handleDonate}
          disabled={!canDonate || isCreatingInvoice || isLoadingLocations}
          className="w-full h-12"
          size="lg"
        >
          {isCreatingInvoice ? "Creating Invoice..." : `Donate ${selectedAmount || 0} sats`}
        </Button>
      </div>

      {/* Lightning Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <LightningInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          paymentRequest={invoiceData.paymentRequest}
          amount={selectedAmount || 0}
          onPaymentComplete={() => {
            setShowInvoiceModal(false)
            router.push("/dashboard")
          }}
        />
      )}
    </div>
  )
}
