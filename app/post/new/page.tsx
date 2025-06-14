"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { v4 as uuidv4 } from "@/lib/uuid"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import type { Group } from "@/lib/types"
import {
  createPostFundingInvoiceAction,
  checkPostFundingStatusAction,
  createFundedAnonymousPostAction,
} from "@/app/actions/post-actions"
import { getCurrentLocationWithName } from "@/lib/geocoding" // Import the geocoding utility

// Pre-load the camera component
import dynamic from "next/dynamic"
const DynamicCameraCapture = dynamic(
  () => import("@/components/camera-capture").then((mod) => ({ default: mod.CameraCapture })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground mb-4 animate-pulse"
        >
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <p className="text-sm text-muted-foreground">Loading camera...</p>
      </div>
    ),
  },
)

export default function NewPostPage() {
  const [description, setDescription] = useState("")
  const [reward, setReward] = useState(2000)
  const [image, setImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<"photo" | "details">("photo")
  const [currentLocation, setCurrentLocation] = useState<{
    name: string
    lat: number
    lng: number
    displayName?: string // Keep displayName for UI consistency
  } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const { user, profile, updateBalance, activeUserId } = useAuth()
  const supabase = createBrowserSupabaseClient()
  const [showKeypad, setShowKeypad] = useState(false)
  const isAnonymous = !user
  const MIN_ANONYMOUS_REWARD = 500
  const [fundingPaymentRequest, setFundingPaymentRequest] = useState<string | null>(null)
  const [fundingRHash, setFundingRHash] = useState<string | null>(null)
  const [isAwaitingPayment, setIsAwaitingPayment] = useState(false)
  const [showFundingModal, setShowFundingModal] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false)
  const [lastCreatedPostId, setLastCreatedPostId] = useState<string | null>(null)
  const [locationErrorCount, setLocationErrorCount] = useState(0)
  const [showFullInvoice, setShowFullInvoice] = useState(false)

  useEffect(() => {
    if (isAnonymous) {
      setReward((prev) => Math.max(prev, MIN_ANONYMOUS_REWARD))
    }
  }, [isAnonymous])

  // Check if there's a selected group from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedGroupId = localStorage.getItem("selectedGroupId")
      if (storedGroupId) {
        setSelectedGroupId(storedGroupId)
        // Clear it after using it
        localStorage.removeItem("selectedGroupId")
      }
    }
  }, [])

  // Fetch user's groups
  useEffect(() => {
    async function fetchUserGroups() {
      if (!user) return

      setLoadingGroups(true)
      try {
        // Fetch groups where the user is an approved member
        const { data: memberGroups, error: memberError } = await supabase
          .from("group_members")
          .select(`
            group_id,
            groups:group_id(
              id,
              name,
              description,
              created_by,
              created_at,
              updated_at,
              invite_code
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "approved")

        if (memberError) {
          console.error("Error fetching user groups:", memberError)
          throw memberError
        }

        // Transform the data to match the Group interface
        const transformedGroups = memberGroups
          .filter((item) => item.groups) // Filter out any null groups
          .map((item) => item.groups as Group)

        setUserGroups(transformedGroups)
      } catch (error) {
        console.error("Error in fetchUserGroups:", error)
        toast({
          title: "Error",
          description: "Failed to load your groups. You can still post without selecting a group.",
          variant: "destructive",
        })
      } finally {
        setLoadingGroups(false)
      }
    }

    fetchUserGroups()
  }, [user, supabase, toast])

  // Hide navigation bar
  useEffect(() => {
    // Hide the navigation bar when on details step
    const bottomNav = document.querySelector(".fixed.bottom-0.left-0.z-50.w-full.h-16") as HTMLElement
    if (bottomNav && step === "details") {
      bottomNav.style.display = "none"
    }

    return () => {
      // Show the navigation bar again when component unmounts
      const bottomNav = document.querySelector(".fixed.bottom-0.left-0.z-50.w-full.h-16") as HTMLElement
      if (bottomNav) {
        bottomNav.style.display = "grid"
      }
    }
  }, [step])

  // Polling for payment status
  useEffect(() => {
    if (isAwaitingPayment && fundingRHash) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          console.log("Polling for payment status for rHash:", fundingRHash)
          const statusResult = await checkPostFundingStatusAction(fundingRHash)
          if (statusResult.success && statusResult.settled) {
            console.log("Payment confirmed for rHash:", fundingRHash)
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
            setIsAwaitingPayment(false)
            setShowFundingModal(false)
            toast({
              title: "Payment Confirmed!",
              description: "Your payment has been received. Creating your post...",
              variant: "success",
            })

            // Now create the funded anonymous post
            const postDetails = {
              description,
              reward,
              image_url: image,
              location: currentLocation?.name || null, // Use the name from geocoding
              latitude: currentLocation?.lat || null,
              longitude: currentLocation?.lng || null,
              city: currentLocation?.displayName || currentLocation?.name || null, // Use displayName or fallback to name
              funding_r_hash: fundingRHash,
              funding_payment_request: fundingPaymentRequest!,
            }

            const creationResult = await createFundedAnonymousPostAction(postDetails)
            if (creationResult.success && creationResult.postId) {
              setLastCreatedPostId(creationResult.postId)
              toast({
                title: "🎉 Anonymous Post Created!",
                description: "Your issue has been posted successfully.",
                variant: "success",
                duration: 4000,
              })
              setShowCreateAccountPrompt(true)
            } else {
              toast({
                title: "Error Creating Post",
                description: creationResult.error || "Failed to create post after payment.",
                variant: "destructive",
              })
            }
            setIsSubmitting(false)
            setFundingPaymentRequest(null)
            setFundingRHash(null)
          } else if (!statusResult.success) {
            console.error("Error polling payment status:", statusResult.error)
          }
        } catch (error) {
          console.error("Exception during payment polling:", error)
        }
      }, 5000)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [
    isAwaitingPayment,
    fundingRHash,
    description,
    reward,
    image,
    currentLocation,
    toast,
    router, // router was here before, keeping it for consistency with the revert
    fundingPaymentRequest,
  ])

  const handleCapture = (imageSrc: string) => {
    setImage(imageSrc)
    setStep("details")
  }

  const handleGetLocation = async () => {
    setIsGettingLocation(true)
    // setLocationErrorCount(0) // Reset error count on new attempt - this was part of the undone change

    try {
      const locationInfo = await getCurrentLocationWithName() // Use the imported utility

      if (locationInfo) {
        setCurrentLocation({
          name: locationInfo.name, // This is the geocoded name (e.g., "City, State")
          lat: locationInfo.latitude,
          lng: locationInfo.longitude,
          displayName: locationInfo.name, // Use the geocoded name for display
        })
      } else {
        // This case handles if getCurrentLocationWithName returns null (e.g., geolocation not supported)
        // This path might not be hit if getCurrentLocationWithName always rejects on failure.
        setLocationErrorCount((prev) => prev + 1)
        toast({
          title: "Location Unavailable",
          description: "Could not retrieve location. Geolocation might not be supported or enabled.",
          variant: "destructive", // Changed to destructive for error
        })
      }
    } catch (error: any) {
      // Catch any unexpected errors from the utility or promise
      console.error("Error in handleGetLocation:", error)
      setLocationErrorCount((prev) => prev + 1)

      let errorMessage = "Location Error"
      let errorDescription = "Failed to get your location. You can still post without it."

      if (error && error.code !== undefined) {
        // Check if error is a GeolocationPositionError
        errorMessage = "Location Unavailable"
        switch (error.code) {
          case 0: // Custom code for "not supported"
            errorDescription = "Geolocation is not supported by your browser. You can still post without location."
            break
          case 1: // PERMISSION_DENIED
            errorDescription = "Location permission denied. You can still post without location."
            break
          case 2: // POSITION_UNAVAILABLE
            errorDescription = "Location information unavailable. You can still post without location."
            break
          case 3: // TIMEOUT
            errorDescription = "Location request timed out. You can still post without location."
            break
          default:
            errorDescription = `An unexpected error occurred (Code: ${error.code}). You can still post without location.`
        }
      } else if (error && error.message) {
        // Fallback for other types of errors
        errorDescription = `${error.message}. You can still post without location.`
      }

      if (locationErrorCount > 0) {
        // Changed from > 1 to > 0 to show on second attempt
        errorDescription += " This may be due to browser restrictions or network issues."
      }
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive", // Changed to destructive
      })
    } finally {
      setIsGettingLocation(false)
    }
  }

  const handleRemoveLocation = () => {
    setCurrentLocation(null)
    toast({
      title: "Location removed",
      description: "Location has been removed from the post",
      variant: "default",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const isAnonymousSubmit = !user

    if (isAnonymousSubmit && reward < MIN_ANONYMOUS_REWARD) {
      toast({
        title: "Minimum Reward Required",
        description: `Anonymous posts require a minimum reward of ${MIN_ANONYMOUS_REWARD} sats.`,
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!image) {
      toast({
        title: "Image required",
        description: "Please take a photo of the issue",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!description) {
      toast({
        title: "Missing information",
        description: "Please describe the issue",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (isAnonymousSubmit && !currentLocation) {
      toast({
        title: "Location Required",
        description: "Anonymous posts require a location. Please add your location before posting.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!isAnonymousSubmit && reward > 0 && (!user || !profile || profile.balance < reward)) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough sats to offer this reward",
        variant: "destructive",
      })
      router.push("/wallet")
      setIsSubmitting(false)
      return
    }

    // Handle anonymous submission
    if (isAnonymousSubmit) {
      try {
        const fundingInvoiceResult = await createPostFundingInvoiceAction(reward)

        if (fundingInvoiceResult.success && fundingInvoiceResult.paymentRequest && fundingInvoiceResult.rHash) {
          console.log("Setting funding modal state:", {
            paymentRequest: fundingInvoiceResult.paymentRequest,
            rHash: fundingInvoiceResult.rHash,
            paymentRequestLength: fundingInvoiceResult.paymentRequest.length,
          })
          setFundingPaymentRequest(fundingInvoiceResult.paymentRequest)
          setFundingRHash(fundingInvoiceResult.rHash)
          setShowFundingModal(true)
          setIsAwaitingPayment(true)
          setIsSubmitting(false) // Reset submitting state
          return // Return early to prevent executing the registered user flow
        } else {
          toast({
            title: "Error",
            description: fundingInvoiceResult.error || "Could not create funding invoice. Please try again.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      } catch (error) {
        console.error("Error creating funding invoice:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred while preparing your post.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }
    }

    // This code only runs for registered users
    try {
      const now = new Date()
      const postId = uuidv4()

      const postDataForSupabase = {
        id: postId,
        user_id: activeUserId || user!.id,
        created_by: profile!.name,
        created_by_avatar: profile!.avatar_url,
        title: description.substring(0, 50),
        description,
        image_url: image,
        location: currentLocation?.name || null, // Use geocoded name
        latitude: currentLocation?.lat || null,
        longitude: currentLocation?.lng || null,
        reward,
        claimed: false,
        fixed: false,
        created_at: now.toISOString(),
        group_id: selectedGroupId,
        city: currentLocation?.displayName || currentLocation?.name || null, // Use displayName or fallback to name
        is_anonymous: false,
      }

      if (supabase) {
        const { error: insertError } = await supabase.from("posts").insert(postDataForSupabase)
        if (insertError) {
          console.error("Error saving post to Supabase:", insertError)
          throw insertError
        }
      }

      if (profile && reward > 0) {
        updateBalance(profile.balance - reward)
      }

      const successToast = toast({
        title: "🎉 Post created!",
        description: "Your issue has been posted successfully ✅",
        variant: "success",
        duration: 3000,
      })
      setTimeout(() => successToast.dismiss(), 3000)

      if (selectedGroupId) {
        router.push(`/groups/${selectedGroupId}?newPost=${postId}`)
      } else {
        router.push(`/dashboard?newPost=${postId}`)
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "There was an error creating your post.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === "details") {
      setStep("photo")
    } else {
      router.push("/dashboard")
    }
  }

  const navigateToWallet = () => {
    router.push("/wallet")
  }

  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      {step === "photo" ? (
        <>
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-black/30 text-white/70 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              Take photo of the issue
            </div>
          </div>
          <DynamicCameraCapture onCapture={handleCapture} />
        </>
      ) : (
        <>
          {!showCreateAccountPrompt && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {image && (
                <div className="relative w-full h-48 overflow-hidden rounded-lg">
                  <img src={image || "/placeholder.svg"} alt="Issue preview" className="object-cover w-full h-full" />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 left-2"
                    onClick={() => setStep("photo")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span className="sr-only">Back to camera</span>
                  </Button>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    rows={3}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Describe the issue"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <div className="mt-1 flex items-center justify-between">
                  {currentLocation ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-500"
                      >
                        <path d="M20.42 8.42A8.38 8.38 0 0 0 12 2.16a8.38 8.38 0 0 0-8.42 8.42A8.18 8.18 0 0 0 3 16v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a8.18 8.18 0 0 0-.58-7.58z" />
                        <circle cx="12" cy="11" r="3" />
                      </svg>
                      <span className="text-sm text-gray-900">{currentLocation.displayName}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLocation}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" disabled={isGettingLocation} onClick={handleGetLocation}>
                      {isGettingLocation ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Getting location...
                        </>
                      ) : (
                        "Add Location"
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="reward" className="block text-sm font-medium text-gray-700">
                  Reward (Sats)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                    <span className="text-gray-500">⚡</span>
                  </div>
                  <input
                    type="number"
                    name="reward"
                    id="reward"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0"
                    value={reward}
                    onChange={(e) => setReward(Number.parseInt(e.target.value))}
                    min={0}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">sats</span>
                  </div>
                </div>
              </div>

              {user && userGroups.length > 0 && (
                <div>
                  <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                    Post to Group (Optional)
                  </label>
                  <div className="mt-1">
                    <select
                      id="group"
                      name="group"
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={selectedGroupId || ""}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                    >
                      <option value="">Post to Public</option>
                      {userGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Posting...
                    </>
                  ) : (
                    "Post Issue"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Funding Modal */}
          {showFundingModal && fundingPaymentRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-lg font-semibold mb-4">Fund Your Anonymous Post</h2>
                <p className="text-gray-700 mb-4">
                  To create an anonymous post, you need to fund it with {reward} sats. Please use the following payment
                  request:
                </p>
                <div className="bg-gray-100 p-3 rounded-md break-all">
                  {showFullInvoice ? fundingPaymentRequest : `${fundingPaymentRequest.substring(0, 30)}...`}
                  {!showFullInvoice && (
                    <button onClick={() => setShowFullInvoice(true)} className="text-blue-500 hover:underline ml-1">
                      Show Full Invoice
                    </button>
                  )}
                </div>
                <p className="text-gray-700 mt-4">
                  Open your Lightning wallet and pay the invoice to finalize your anonymous post.
                </p>
                <Button onClick={() => setShowFundingModal(false)} className="mt-4">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Create Account Prompt */}
          {showCreateAccountPrompt && lastCreatedPostId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-lg font-semibold mb-4">Create an Account?</h2>
                <p className="text-gray-700 mb-4">
                  You&apos;ve successfully created an anonymous post. Would you like to create an account to manage your
                  posts and earn rewards?
                </p>
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" onClick={() => setShowCreateAccountPrompt(false)}>
                    No, thanks
                  </Button>
                  <Button onClick={() => router.push(`/register?postId=${lastCreatedPostId}`)}>Create Account</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
