"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { v4 as uuidv4 } from "@/lib/uuid"
import { formatSatsValue } from "@/lib/utils"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import type { Group } from "@/lib/types"

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
    displayName?: string
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

  const handleCapture = (imageSrc: string) => {
    setImage(imageSrc)
    setStep("details")
  }

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      })
      return
    }

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Set initial location with coordinates
        const locationData = {
          name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
          displayName: "Unknown", // Default fallback
        }

        try {
          // Try to get city name via reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          )

          if (response.ok) {
            const data = await response.json()
            const cityName = data.address?.city || data.address?.town || data.address?.village || "Unknown"
            locationData.displayName = cityName
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error)
          // Keep the default "Unknown" fallback
        }

        setCurrentLocation(locationData)
        setIsGettingLocation(false)
        toast({
          title: "Location added",
          description: "Your location has been added to the post",
          variant: "default",
        })
      },
      (error) => {
        console.error("Error getting location:", error)
        setIsGettingLocation(false)

        let errorMessage = "Failed to get your location"
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. You can still post without location."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable"
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out"
            break
        }

        toast({
          title: "Location error",
          description: errorMessage,
          variant: "destructive",
        })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
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

    if (!image) {
      toast({
        title: "Image required",
        description: "Please take a photo of the issue",
        variant: "destructive",
      })
      return
    }

    if (!description) {
      toast({
        title: "Missing information",
        description: "Please describe the issue",
        variant: "destructive",
      })
      return
    }

    if (reward > 0 && (!user || !profile || profile.balance < reward)) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough sats to offer this reward",
        variant: "destructive",
      })
      router.push("/wallet")
      return
    }

    setIsSubmitting(true)

    try {
      // Create a new post with current timestamp
      const now = new Date()
      const postId = uuidv4()

      const newPost = {
        id: postId,
        userId: user.id,
        user_id: user.id, // Add both formats for compatibility
        title: description.substring(0, 50), // Use first part of description as title for compatibility
        description,
        imageUrl: image,
        image_url: image, // Add both formats for compatibility
        location: currentLocation?.name,
        latitude: currentLocation ? currentLocation.lat : null,
        longitude: currentLocation ? currentLocation.lng : null,
        reward,
        claimed: false,
        fixed: false,
        createdAt: now,
        created_at: now.toISOString(), // Add both formats for compatibility
        group_id: selectedGroupId,
        city: currentLocation?.displayName || null,
      }

      // Save to Supabase if available
      if (supabase) {
        try {
          await supabase.from("posts").insert({
            id: postId,
            user_id: activeUserId || user.id,
            created_by: profile.name,
            created_by_avatar: profile.avatar_url,
            title: description.substring(0, 50), // Use first part of description as title for compatibility
            description,
            image_url: image,
            location: currentLocation ? currentLocation.name : null,
            latitude: currentLocation ? currentLocation.lat : null,
            longitude: currentLocation ? currentLocation.lng : null,
            reward,
            claimed: false,
            fixed: false,
            created_at: now.toISOString(),
            group_id: selectedGroupId,
            city: currentLocation ? currentLocation.displayName : null,
          })
        } catch (error) {
          console.error("Error saving post to Supabase:", error)
          // Continue with local storage even if Supabase fails
        }
      }

      // Remove: mockPosts.unshift(newPost)

      // Update user balance if reward is greater than 0
      if (profile && reward > 0) {
        updateBalance(profile.balance - reward)
      }

      // Show success message with shorter duration
      const successToast = toast({
        title: "🎉 Post created!",
        description: "Your issue has been posted successfully ✅",
        variant: "success",
        duration: 3000, // 3 seconds
      })

      // Automatically dismiss the toast after 3 seconds
      setTimeout(() => {
        successToast.dismiss()
      }, 3000)

      // Navigate to the appropriate destination
      if (selectedGroupId) {
        router.push(`/groups/${selectedGroupId}?newPost=true`)
      } else {
        router.push("/dashboard?newPost=true")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "There was an error creating your post",
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

  if (!user) {
    return (
      <div className="container px-4 py-6 mx-auto max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-4">Please log in to post an issue</p>
          <Button onClick={() => router.push("/auth/login")}>Log In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Post Issue</h1>
        </div>

        {/* Bitcoin Balance Pill */}
        <button
          onClick={() => router.push("/wallet")}
          className="flex items-center space-x-1 bg-[#3E1C09] text-[#FDE68A] px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[#2D1507] transition-colors"
        >
          <div className="w-4 h-4 relative">
            <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={16} height={16} className="object-contain" />
          </div>
          <span>{formatSatsValue(profile?.balance || 0)}</span>
        </button>
      </div>

      {step === "photo" ? (
        <DynamicCameraCapture onCapture={handleCapture} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {image && (
            <div className="relative w-full h-48 overflow-hidden rounded-lg">
              <img src={image || "/placeholder.svg"} alt="Issue preview" className="object-cover w-full h-full" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2"
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
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span className="sr-only">Retake photo</span>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Describe the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              required
              className="resize-none"
            />
          </div>

          {/* Location and Visibility Row */}
          <div className="flex gap-2">
            {/* Location Section */}
            <div className="flex-1">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg h-12">
                {currentLocation ? (
                  <div className="flex items-center flex-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1 text-green-600 flex-shrink-0"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-green-700 dark:text-green-400 block truncate">
                        {currentLocation.displayName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center flex-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1 text-muted-foreground flex-shrink-0"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-xs text-muted-foreground">No location</span>
                  </div>
                )}

                {currentLocation ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLocation}
                    className="text-xs h-6 px-2 ml-1 flex-shrink-0"
                  >
                    ×
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetLocation}
                    className="text-xs h-6 px-2 flex-shrink-0"
                    disabled={isGettingLocation}
                  >
                    {isGettingLocation ? "..." : "Add"}
                  </Button>
                )}
              </div>
            </div>

            {/* Visibility Section */}
            <div className="flex-1">
              {userGroups.length > 0 ? (
                <Select
                  value={selectedGroupId || "public"}
                  onValueChange={(value) => setSelectedGroupId(value === "public" ? null : value)}
                >
                  <SelectTrigger className="w-full h-12 p-3">
                    <div className="flex items-center space-x-2 w-full">
                      <div className="flex-shrink-0">
                        {selectedGroupId ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-orange-600"
                          >
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="m7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-green-600"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2a14.5 14.5 0 0 0 0 20a14.5 14.5 0 0 0 0-20" />
                            <path d="M2 12h20" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium text-xs truncate">
                          {selectedGroupId
                            ? userGroups.find((g) => g.id === selectedGroupId)?.name || "Group"
                            : "Public"}
                        </div>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center space-x-3 py-1">
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
                          className="text-green-600"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2a14.5 14.5 0 0 0 0 20a14.5 14.5 0 0 0 0-20" />
                          <path d="M2 12h20" />
                        </svg>
                        <div>
                          <div className="font-medium">Public</div>
                          <div className="text-xs text-muted-foreground">Anyone can see this post</div>
                        </div>
                      </div>
                    </SelectItem>
                    {userGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center space-x-3 py-1">
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
                            className="text-orange-600"
                          >
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="m7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <div>
                            <div className="font-medium">{group.name}</div>
                            <div className="text-xs text-muted-foreground">Only group members can see this post</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg h-12">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600 mr-2 flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20a14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  <span className="text-xs font-medium">Public</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Apple Cash Style Reward Selector */}
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="flex items-center justify-between w-full max-w-xs">
                {/* Minus Button */}
                <button
                  type="button"
                  onClick={() => setReward(Math.max(0, reward - 500))}
                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 dark:text-gray-300"
                  >
                    <path d="M5 12h14" />
                  </svg>
                </button>

                {/* Central Amount Display */}
                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="w-32 text-center hover:opacity-80 transition-opacity"
                >
                  <span className="text-5xl font-light text-gray-900 dark:text-white">
                    {reward === 0 ? "0" : formatSatsValue(reward).replace(" sats", "").replace(".0", "")}
                  </span>
                </button>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={() => setReward(reward + 500)}
                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 dark:text-gray-300"
                  >
                    <path d="M12 5v14m-7-7h14" />
                  </svg>
                </button>
              </div>

              {/* Bitcoin and Sats Label */}
              <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-4 h-4 relative">
                  <Image
                    src="/images/bitcoin-logo.png"
                    alt="Bitcoin"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>
                <span>sats reward</span>
              </div>

              {/* Custom Input Field */}
              {showKeypad && (
                <div className="w-full max-w-xs">
                  <input
                    type="number"
                    value={reward}
                    onChange={(e) => setReward(Number(e.target.value) || 0)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    min="0"
                    max="50000"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Posting...
              </div>
            ) : (
              "Post Issue"
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
