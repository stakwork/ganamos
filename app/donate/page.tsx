"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Sprout, Loader2, MapPin as DropPin, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LocationInput } from "@/components/location-input"
import { createDonationInvoice, checkDonationPayment } from "@/app/actions/donation-actions"
import { getLocationRecommendations } from "@/app/actions/location-actions"
import { getCurrentLocationWithName } from "@/lib/geocoding"
import { BitcoinLogo } from "@/components/bitcoin-logo"
import QRCode from "@/components/qr-code"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"
import { formatSatsValue } from "@/lib/utils"

interface RecommendedLocation {
  name: string
  type: string
  emoji: string
  openIssues: number
  locationType: string
  locationName: string
}

const steps = [
  { label: "1. Choose Amount" },
  { label: "2. Pick Location" },
  { label: "3. Pay Invoice" },
]

function Stepper({ currentStep, setCurrentStep, resetDonationFlow }: { currentStep: number, setCurrentStep: (step: number) => void, resetDonationFlow: () => void }) {
  return (
    <div className="relative flex items-center justify-center my-1">
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-700 z-0" style={{ transform: 'translateY(12px)' }} />
      {steps.map((step, idx) => (
        <div
          key={step.label}
          className="flex-1 flex flex-col items-center z-10 cursor-pointer"
          onClick={() => {
            if (idx + 1 < currentStep) {
              resetDonationFlow();
              setCurrentStep(idx + 1);
            }
          }}
        >
          <div
            className={`pb-2 text-xs transition-colors
              ${currentStep === idx + 1
                ? "text-emerald-600"
                : "text-gray-400"}
            `}
          >
            {step.label}
          </div>
          <div
            className={`h-0.5 w-24 rounded-full transition-all duration-200 ${currentStep === idx + 1 ? "bg-emerald-600" : "bg-transparent"}`}
          />
        </div>
      ))}
    </div>
  )
}

export default function DonatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [showCustomAmount, setShowCustomAmount] = useState(false)
  const [recommendedLocations, setRecommendedLocations] = useState<RecommendedLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<RecommendedLocation | null>(null)
  const [customLocation, setCustomLocation] = useState("")
  const [customLocationDetails, setCustomLocationDetails] = useState<any | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState<{ paymentRequest: string; poolId: string } | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [paymentHash, setPaymentHash] = useState<string>("")
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [paymentDetected, setPaymentDetected] = useState(false)
  const [showFullPaymentRequest, setShowFullPaymentRequest] = useState(false)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const googleMapRef = useRef<any>(null)
  const polygonRef = useRef<any>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const amountOptions = [
    { label: "1K", value: 1000 },
    { label: "10K", value: 10000 },
    { label: "100K", value: 100000 },
  ]

  // Reset donation flow state
  const resetDonationFlow = () => {
    setSelectedAmount(null)
    setCustomAmount("")
    setShowCustomAmount(false)
    setSelectedLocation(null)
    setCustomLocation("")
    setCustomLocationDetails(null)
    setInvoiceData(null)
    setPaymentHash("")
    setIsCheckingPayment(false)
    setPaymentDetected(false)
    setShowInvoiceModal(false)
    setShowFullPaymentRequest(false)
  }

  // Remove default location selection on mount
  useEffect(() => {
    async function loadLocationRecommendations() {
      try {
        setIsLoadingLocations(true)
        let userLocation = undefined
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
        const recommendations = await getLocationRecommendations(userLocation)
        setRecommendedLocations(recommendations)
        // Do NOT set any location as selected by default
        // setSelectedLocation(null)
      } catch (error) {
        const fallback = {
          name: "Global",
          type: "global",
          emoji: "🌎",
          openIssues: 0,
          locationType: "global",
          locationName: "Global",
        }
        setRecommendedLocations([fallback])
        // Do NOT set any location as selected by default
      } finally {
        setIsLoadingLocations(false)
      }
    }
    loadLocationRecommendations()
  }, [])

  // Initialize or update Google Map and polygon when location changes
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined" || !window.google) return
    if (!selectedLocation && !customLocationDetails) return

    // Initialize map if not already
    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
    }
    const map = googleMapRef.current

    // Determine bounds and polygon
    let bounds: any = null
    let paths: any[] = []
    if (selectedLocation) {
      if (selectedLocation.type === "global") {
        // World bounds
        bounds = new window.google.maps.LatLngBounds(
          { lat: -85, lng: -180 },
          { lat: 85, lng: 180 }
        )
        paths = [
          { lat: 85, lng: -180 },
          { lat: 85, lng: 180 },
          { lat: -85, lng: 180 },
          { lat: -85, lng: -180 },
        ]
      } else if (selectedLocation.type === "country") {
        // Continental US bounds
        bounds = new window.google.maps.LatLngBounds(
          { lat: 24.396308, lng: -125.0 },
          { lat: 49.384358, lng: -66.93457 }
        )
        paths = [
          { lat: 49.384358, lng: -125.0 },
          { lat: 49.384358, lng: -66.93457 },
          { lat: 24.396308, lng: -66.93457 },
          { lat: 24.396308, lng: -125.0 },
        ]
      } else {
        // For state/city, use a small bounding box around a placeholder center
        const center = { lat: 34, lng: -118 }
        bounds = new window.google.maps.LatLngBounds(
          { lat: center.lat - 0.2, lng: center.lng - 0.2 },
          { lat: center.lat + 0.2, lng: center.lng + 0.2 }
        )
        paths = [
          { lat: center.lat + 0.2, lng: center.lng - 0.2 },
          { lat: center.lat + 0.2, lng: center.lng + 0.2 },
          { lat: center.lat - 0.2, lng: center.lng + 0.2 },
          { lat: center.lat - 0.2, lng: center.lng - 0.2 },
        ]
      }
    } else if (customLocationDetails && customLocationDetails.geometry && customLocationDetails.geometry.location) {
      const center = {
        lat: customLocationDetails.geometry.location.lat(),
        lng: customLocationDetails.geometry.location.lng(),
      }
      bounds = new window.google.maps.LatLngBounds(
        { lat: center.lat - 0.1, lng: center.lng - 0.1 },
        { lat: center.lat + 0.1, lng: center.lng + 0.1 }
      )
      paths = [
        { lat: center.lat + 0.1, lng: center.lng - 0.1 },
        { lat: center.lat + 0.1, lng: center.lng + 0.1 },
        { lat: center.lat - 0.1, lng: center.lng + 0.1 },
        { lat: center.lat - 0.1, lng: center.lng - 0.1 },
      ]
    }
    if (bounds) {
      map.fitBounds(bounds)
    }

    // Remove previous polygon
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
    }
    // Draw new polygon with green outline
    polygonRef.current = new window.google.maps.Polygon({
      paths,
      strokeColor: "#22c55e", // Tailwind emerald-500
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: "#22c55e",
      fillOpacity: 0.05,
    })
    polygonRef.current.setMap(map)
  }, [selectedLocation, customLocationDetails])

  // Payment polling effect
  useEffect(() => {
    if (step === 3 && paymentHash && !paymentDetected) {
      setIsCheckingPayment(true)

      const pollPayment = async () => {
        try {
          const result = await checkDonationPayment(paymentHash)

          if (result.success && result.settled) {
            setPaymentDetected(true)
            setIsCheckingPayment(false)

            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            // Show success toast
            toast({
              title: "Payment confirmed!",
              description: "Your donation has been received. Thank you!",
            })
          }
        } catch (error) {
          console.error("Error polling payment:", error)
        }
      }

      // Poll immediately, then every 3 seconds
      pollPayment()
      pollingIntervalRef.current = setInterval(pollPayment, 3000)
    }

    // Cleanup polling when step changes or component unmounts
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [step, paymentHash, paymentDetected, toast])

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

  const handleCustomLocationChange = (value: string, placeDetails?: any) => {
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
        setPaymentHash(result.paymentHash!)
        setStep(3)
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

  // Step 1: Choose Amount
  const renderStep1 = () => (
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="space-y-6">
        <div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {amountOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                onClick={() => handleAmountSelect(option.value)}
                className={`h-16 flex flex-col justify-center hover:bg-accent hover:text-accent-foreground ${selectedAmount === option.value ? "ring-2 ring-primary" : ""}`}
              >
                <div className="font-bold text-lg">{option.label}</div>
                <div className="text-xs text-muted-foreground">sats</div>
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={handleWhaleClick}
              className={`h-16 flex flex-col justify-center hover:bg-accent hover:text-accent-foreground ${showCustomAmount ? "ring-2 ring-primary" : ""}`}
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
        <Button
          onClick={() => setStep(2)}
          disabled={!selectedAmount}
          className="w-full h-12"
          size="lg"
        >
          Next: Choose Location
        </Button>
      </div>
    </div>
  )

  // Step 2: Choose Location
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const renderStep2 = () => (
    <div className="container px-4 py-6 mx-auto max-w-md">
      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Global */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${selectedLocation?.type === "global" && selectedLocation?.name === "Global" ? "ring-2 ring-primary" : ""}`}
          onClick={() => {
            setSelectedLocation({
              name: "Global",
              type: "global",
              emoji: "🌎",
              openIssues: recommendedLocations.find((loc) => loc.type === "global")?.openIssues || 0,
              locationType: "global",
              locationName: "Global",
            })
            setShowCustomPicker(false)
            setCustomLocation("")
            setCustomLocationDetails(null)
          }}
        >
          <CardContent className="p-3 flex flex-col items-center">
            <span className="text-2xl mb-1">🌎</span>
            <div className="font-medium text-base text-center">Global</div>
            <div className="text-xs text-gray-500 text-center mt-0.5">{recommendedLocations.find((loc) => loc.type === "global")?.openIssues || 0} open issues</div>
          </CardContent>
        </Card>
        {/* Country */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${selectedLocation?.type === "country" && selectedLocation?.name === (recommendedLocations.find((loc) => loc.type === "country")?.name) ? "ring-2 ring-primary" : ""}`}
          onClick={() => {
            const country = recommendedLocations.find((loc) => loc.type === "country")
            if (country) {
              setSelectedLocation(country)
              setShowCustomPicker(false)
              setCustomLocation("")
              setCustomLocationDetails(null)
            }
          }}
        >
          <CardContent className="p-3 flex flex-col items-center">
            <span className="text-2xl mb-1">{recommendedLocations.find((loc) => loc.type === "country")?.emoji || "🏳️"}</span>
            <div className="font-medium text-base text-center">{recommendedLocations.find((loc) => loc.type === "country")?.name || "Country"}</div>
            <div className="text-xs text-gray-500 text-center mt-0.5">{recommendedLocations.find((loc) => loc.type === "country")?.openIssues || 0} open issues</div>
          </CardContent>
        </Card>
        {/* State */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${selectedLocation?.type === "admin_1" ? "ring-2 ring-primary" : ""}`}
          onClick={() => {
            const state = recommendedLocations.find((loc) => loc.type === "admin_1")
            if (state) {
              setSelectedLocation(state)
              setShowCustomPicker(false)
              setCustomLocation("")
              setCustomLocationDetails(null)
            }
          }}
        >
          <CardContent className="p-3 flex flex-col items-center">
            <span className="text-2xl mb-1">🏛️</span>
            <div className="font-medium text-base text-center">{recommendedLocations.find((loc) => loc.type === "admin_1")?.name || "State"}</div>
            <div className="text-xs text-gray-500 text-center mt-0.5">{recommendedLocations.find((loc) => loc.type === "admin_1")?.openIssues || 0} open issues</div>
          </CardContent>
        </Card>
        {/* City */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${selectedLocation?.type === "locality" ? "ring-2 ring-primary" : ""}`}
          onClick={() => {
            const city = recommendedLocations.find((loc) => loc.type === "locality")
            if (city) {
              setSelectedLocation(city)
              setShowCustomPicker(false)
              setCustomLocation("")
              setCustomLocationDetails(null)
            }
          }}
        >
          <CardContent className="p-3 flex flex-col items-center">
            <span className="text-2xl mb-1">🏙️</span>
            <div className="font-medium text-base text-center">{recommendedLocations.find((loc) => loc.type === "locality")?.name || "City"}</div>
            <div className="text-xs text-gray-500 text-center mt-0.5">{recommendedLocations.find((loc) => loc.type === "locality")?.openIssues || 0} open issues</div>
          </CardContent>
        </Card>
        {/* El Salvador */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${selectedLocation?.type === "country" && selectedLocation?.name === "El Salvador" ? "ring-2 ring-primary" : ""}`}
          onClick={() => {
            setSelectedLocation({
              name: "El Salvador",
              type: "country",
              emoji: "🇸🇻",
              openIssues: 0,
              locationType: "country",
              locationName: "El Salvador",
            })
            setShowCustomPicker(false)
            setCustomLocation("")
            setCustomLocationDetails(null)
          }}
        >
          <CardContent className="p-3 flex flex-col items-center">
            <span className="text-2xl mb-1">🇸🇻</span>
            <div className="font-medium text-base text-center">El Salvador</div>
            <div className="text-xs text-gray-500 text-center mt-0.5">0 open issues</div>
          </CardContent>
        </Card>
        {/* Custom */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${showCustomPicker ? "ring-2 ring-primary" : ""}`}
          onClick={() => {
            setShowCustomPicker(true)
            setSelectedLocation(null)
          }}
        >
          <CardContent className="p-3 flex flex-col items-center">
            <DropPin className="w-6 h-6 mb-1" />
            <div className="font-medium text-base text-center">Custom</div>
          </CardContent>
        </Card>
        {/* Fillers for 3x3 grid */}
        <div />
        <div />
        <div />
      </div>
      {/* Custom location picker (typeahead search) */}
      {showCustomPicker && (
        <div className="mb-6">
          <LocationInput
            value={customLocation}
            onChange={handleCustomLocationChange}
            placeholder="Search locations..."
            className="w-full mb-2"
          />
        </div>
      )}
      <Button
        className="w-full h-12"
        onClick={handleDonate}
        disabled={!(selectedLocation || (showCustomPicker && customLocationDetails)) || isCreatingInvoice}
        size="lg"
      >
        {isCreatingInvoice ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Invoice...
          </>
        ) : (
          "Next: Create Invoice"
        )}
      </Button>
    </div>
  )

  // Step 3: Lightning Invoice (reuse existing logic)
  const renderStep3 = () => (
    <div className="container px-4 py-6 mx-auto max-w-md flex flex-col items-center justify-center">
      {invoiceData ? (
        <>
          {paymentDetected ? (
            // Payment Success State
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
              <div className="flex justify-center mb-4">
                <span className="text-6xl">
                  {selectedLocation?.emoji || "🌍"}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Payment Confirmed ✅</h3>
              <p className="text-xs text-gray-500 mb-4">
                Your {formatSatsValue(selectedAmount || 0)} donation to {selectedLocation?.name || customLocation} has been received.
              </p>
              <Button
                className="w-full h-12 mt-2"
                size="lg"
                onClick={() => {
                  // Route to map page, passing location if possible
                  if (selectedLocation) {
                    window.location.href = `/map?locationType=${encodeURIComponent(selectedLocation.locationType)}&locationName=${encodeURIComponent(selectedLocation.locationName)}`
                  } else if (customLocation) {
                    window.location.href = `/map?locationType=place&locationName=${encodeURIComponent(customLocation)}`
                  } else {
                    window.location.href = "/map"
                  }
                }}
              >
                See Map
              </Button>
            </div>
          ) : (
            // Payment Pending State
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                  <BitcoinLogo size={24} className="mr-2" />
                  <span className="text-2xl font-bold">{formatSatsValue(selectedAmount || 0)}</span>
                </div>
                <p className="text-sm text-gray-600">Donation to {selectedLocation?.name || customLocation}</p>
              </div>
              
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <QRCode data={invoiceData.paymentRequest} size={200} />
              </div>
              
              {/* Payment Request */}
              <div className="mb-4">
                <div className="relative">
                  <div 
                    className="flex items-center justify-between p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    onClick={() => setShowFullPaymentRequest(!showFullPaymentRequest)}
                  >
                    <div className="flex-1 font-mono text-xs truncate">
                      {showFullPaymentRequest 
                        ? invoiceData.paymentRequest
                        : `${invoiceData.paymentRequest.slice(0, 20)}...${invoiceData.paymentRequest.slice(-20)}`
                      }
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 h-6 w-6 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(invoiceData.paymentRequest)
                        toast({
                          title: "Invoice copied",
                          description: "Lightning invoice copied to clipboard",
                        })
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  {showFullPaymentRequest && (
                    <Textarea
                      value={invoiceData.paymentRequest}
                      readOnly
                      className="font-mono text-xs h-20 resize-none mt-2"
                    />
                  )}
                </div>
              </div>
              
              {/* Payment Status */}
              <div className="text-center">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {isCheckingPayment && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                  {isCheckingPayment ? "Checking payment..." : "Waiting for payment"}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
          <p className="text-gray-500">Generating your Lightning invoice...</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Sprout icon at the top */}
      <div className="w-full flex justify-center pt-8 pb-2">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
          <Sprout className="w-8 h-8 text-green-600" strokeWidth={1.5} />
        </div>
      </div>
      {/* Header and subhead always visible */}
      <div className="w-full max-w-md px-4 pb-2 pt-4">
        <h1 className="text-2xl font-bold text-center mb-2">Turn Bitcoin Into Impact</h1>
        <p className="text-center text-muted-foreground text-sm mb-12">
          Choose how much to donate and where to send it. Your Bitcoin fuels real improvements in real communities.
        </p>
        <div className="mt-2">
          <Stepper currentStep={step} setCurrentStep={(s: number) => setStep(s as 1 | 2 | 3)} resetDonationFlow={resetDonationFlow} />
        </div>
      </div>
      {/* Step content */}
      <div className="w-full max-w-md flex-1 flex flex-col">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  )
}
