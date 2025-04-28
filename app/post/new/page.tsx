"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { getCurrentLocation } from "@/lib/mock-location"
import { mockPosts } from "@/lib/mock-data"
import { v4 as uuidv4 } from "@/lib/uuid"
import { formatSatsValue } from "@/lib/utils"
import { LocationSelector } from "@/components/location-selector"
import { getSupabaseClient } from "@/lib/supabase"

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
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <p className="text-sm text-muted-foreground">Loading camera...</p>
      </div>
    ),
  },
)

export default function NewPostPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [reward, setReward] = useState(2000)
  const [image, setImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<"photo" | "details">("photo")
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [showLocationSelector, setShowLocationSelector] = useState(false)
  const [showAddSatsDialog, setShowAddSatsDialog] = useState(false)
  const [satsToAdd, setSatsToAdd] = useState(5000)
  const { toast } = useToast()
  const router = useRouter()
  const { user, profile, updateBalance } = useAuth()
  const supabase = getSupabaseClient()

  // Update location when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentLocation(getCurrentLocation())
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleCapture = (imageSrc: string) => {
    setImage(imageSrc)
    setStep("details")
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

    if (!title || !description) {
      toast({
        title: "Missing information",
        description: "Please fill out all fields",
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
      setShowAddSatsDialog(true)
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
        title,
        description,
        imageUrl: image,
        image_url: image, // Add both formats for compatibility
        location: currentLocation.name,
        reward,
        claimed: false,
        fixed: false,
        createdAt: now,
        created_at: now.toISOString(), // Add both formats for compatibility
      }

      // Save to Supabase if available
      if (supabase) {
        try {
          await supabase.from("posts").insert({
            id: postId,
            user_id: user.id,
            title,
            description,
            image_url: image,
            location: currentLocation.name,
            reward,
            claimed: false,
            fixed: false,
            created_at: now.toISOString(),
          })
        } catch (error) {
          console.error("Error saving post to Supabase:", error)
          // Continue with local storage even if Supabase fails
        }
      }

      // Add to the beginning of the array to show it first in the feed
      mockPosts.unshift(newPost)

      // Update user balance if reward is greater than 0
      if (profile && reward > 0) {
        updateBalance(profile.balance - reward)
      }

      // Show success message
      toast({
        title: "🎉 Post created!",
        description: "Your issue has been posted successfully ✅",
        variant: "success", // We'll create this variant
      })

      // Navigate to dashboard immediately
      router.push("/dashboard")
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

  const handleAddSats = () => {
    if (profile) {
      // In a real app, this would be a payment flow
      // For now, we'll just add the sats to the user's balance
      updateBalance(profile.balance + satsToAdd)

      toast({
        title: "Sats added",
        description: `${formatSatsValue(satsToAdd)} have been added to your balance`,
      })

      setShowAddSatsDialog(false)
    }
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
      <div className="flex items-center mb-6">
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

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
            <div className="flex items-center">
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
                className="mr-2 text-muted-foreground"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm text-muted-foreground">{currentLocation.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationSelector(true)}
              className="text-xs h-7 px-2"
            >
              Change
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs to be fixed?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label htmlFor="reward" className="mr-2">
                  Reward
                </Label>
                <div className="w-4 h-4 mr-1 relative">
                  <Image
                    src="/images/bitcoin-logo.png"
                    alt="Bitcoin"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>
              </div>
              <span className="text-lg font-medium">{formatSatsValue(reward)}</span>
            </div>
            <Slider
              id="reward"
              min={0}
              max={10000}
              step={500}
              value={[reward]}
              onValueChange={(value) => setReward(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 sats</span>
              <span>10,000 sats</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-xs text-muted-foreground mr-1">Your current balance:</p>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 relative">
                    <Image
                      src="/images/bitcoin-logo.png"
                      alt="Bitcoin"
                      width={12}
                      height={12}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xs">{formatSatsValue(profile?.balance || 0)}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSatsDialog(true)}
                className="text-xs h-7 px-2"
              >
                Add Sats
              </Button>
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

      {/* Location Selector Dialog */}
      <LocationSelector isOpen={showLocationSelector} onOpenChange={setShowLocationSelector} />

      {/* Add Sats Dialog */}
      <Dialog open={showAddSatsDialog} onOpenChange={setShowAddSatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sats to Your Balance</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-amber-100 rounded-full dark:bg-amber-900/50">
                <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={32} height={32} className="object-contain" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sats-amount">Amount to add</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSatsToAdd(Math.max(1000, satsToAdd - 1000))}
                >
                  -
                </Button>
                <div className="flex-1 text-center font-bold text-lg">{formatSatsValue(satsToAdd)}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSatsToAdd(satsToAdd + 1000)}>
                  +
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddSatsDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddSats}>
                Add Sats
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
