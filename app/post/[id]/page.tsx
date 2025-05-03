"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { mockPosts } from "@/lib/mock-data"
import { CameraCapture } from "@/components/camera-capture"
import { getCurrentLocation } from "@/lib/mock-location"
import { formatSatsValue } from "@/lib/utils"
import { BitcoinLogo } from "@/components/bitcoin-logo"
import { getSupabaseClient } from "@/lib/supabase"
import type { Post } from "@/lib/types"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [submittingFix, setSubmittingFix] = useState(false)
  const [fixImage, setFixImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [animateSats, setAnimateSats] = useState(false)
  const [oldBalance, setOldBalance] = useState(0)
  const [newBalance, setNewBalance] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const { user, updateBalance } = useAuth()
  const supabase = getSupabaseClient()
  const balanceRef = useRef<HTMLDivElement>(null)

  // Force hide bottom nav when camera is shown
  useEffect(() => {
    if (showCamera || showBeforeAfter) {
      // Add a class to the body to help with styling
      document.body.classList.add("camera-active")

      // Add a URL parameter to help with navigation detection
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        if (showCamera) {
          url.searchParams.set("camera", "active")
        }
        if (showBeforeAfter) {
          url.searchParams.set("comparison", "active")
        }
        window.history.replaceState({}, "", url.toString())
      }
    } else {
      document.body.classList.remove("camera-active")

      // Remove the URL parameters
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        if (url.searchParams.has("camera")) {
          url.searchParams.delete("camera")
        }
        if (url.searchParams.has("comparison")) {
          url.searchParams.delete("comparison")
        }
        window.history.replaceState({}, "", url.toString())
      }
    }

    return () => {
      document.body.classList.remove("camera-active")
    }
  }, [showCamera, showBeforeAfter])

  useEffect(() => {
    // In a real app, this would be an API call
    const fetchPost = async () => {
      try {
        // First try to get from Supabase
        if (supabase) {
          const { data, error } = await supabase.from("posts").select("*").eq("id", params.id).single()

          if (data && !error) {
            setPost(data)
            setLoading(false)
            return
          }
        }

        // Fall back to mock data
        const foundPost = mockPosts.find((p) => p.id === params.id)
        if (foundPost) {
          setPost(foundPost)
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        toast({
          title: "Error",
          description: "Could not load the post details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [params.id, toast, supabase])

  // Update location when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentLocation(getCurrentLocation())
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Animation effect for balance update
  useEffect(() => {
    if (animateSats && balanceRef.current) {
      const animationDuration = 2000 // 2 seconds
      const startTime = Date.now()
      const startValue = oldBalance
      const endValue = newBalance
      const difference = endValue - startValue

      const animateValue = () => {
        const currentTime = Date.now()
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / animationDuration, 1)

        // Easing function for smoother animation
        const easeOutQuad = (t: number) => t * (2 - t)
        const easedProgress = easeOutQuad(progress)

        const currentValue = Math.floor(startValue + difference * easedProgress)

        if (user) {
          updateBalance(currentValue)
        }

        if (progress < 1) {
          requestAnimationFrame(animateValue)
        } else {
          setAnimateSats(false)
        }
      }

      requestAnimationFrame(animateValue)
    }
  }, [animateSats, oldBalance, newBalance, updateBalance, user])

  const handleClaimPost = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to claim this post",
        variant: "destructive",
      })
      return
    }

    setClaiming(true)

    try {
      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the local state
      if (post) {
        const updatedPost = {
          ...post,
          claimed: true,
          claimedBy: user.id,
          claimed_by: user.id,
          claimedAt: new Date(),
          claimed_at: new Date().toISOString(),
        }

        // Update in Supabase if possible
        if (supabase) {
          const { error } = await supabase
            .from("posts")
            .update({
              claimed: true,
              claimed_by: user.id,
              claimed_at: new Date().toISOString(),
            })
            .eq("id", post.id)

          if (error) {
            console.error("Error updating post in Supabase:", error)
          }
        }

        // Update the post in the mockPosts array
        const postIndex = mockPosts.findIndex((p) => p.id === post.id)
        if (postIndex !== -1) {
          mockPosts[postIndex] = updatedPost
        }

        setPost(updatedPost)

        // Trigger storage event to update other components
        window.dispatchEvent(new Event("storage"))
      }

      toast({
        title: "🎯 Post claimed!",
        description: "You have 6 hours to fix this issue",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not claim the post",
        variant: "destructive",
      })
    } finally {
      setClaiming(false)
    }
  }

  const handleCaptureFixImage = (imageSrc: string) => {
    setFixImage(imageSrc)
    setShowCamera(false)
    setShowBeforeAfter(true)
  }

  const handleSubmitFix = async () => {
    setSubmittingFix(true)

    if (!fixImage) {
      setSubmittingFix(false)
      toast({
        title: "Image required",
        description: "Please take a photo of the fixed issue",
        variant: "destructive",
      })
      return
    }

    try {
      // In a real app, this would be an API call to verify the fix with AI
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update the local state
      if (post && user) {
        const now = new Date()
        const nowIso = now.toISOString()

        const updatedPost = {
          ...post,
          fixed: true,
          fixedAt: now,
          fixed_at: nowIso,
          fixedImageUrl: fixImage,
          fixed_image_url: fixImage,
        }

        // Update in Supabase if possible
        if (supabase) {
          const { error } = await supabase
            .from("posts")
            .update({
              fixed: true,
              fixed_at: nowIso,
              fixed_image_url: fixImage,
            })
            .eq("id", post.id)

          if (error) {
            console.error("Error updating post in Supabase:", error)
          }
        }

        // Update the post in the mockPosts array
        const postIndex = mockPosts.findIndex((p) => p.id === post.id)
        if (postIndex !== -1) {
          mockPosts[postIndex] = updatedPost
        }

        setPost(updatedPost)

        // Update user balance if the user is not the poster
        if (post.user_id !== user.id && post.userId !== user.id) {
          // Set up animation values
          setOldBalance(user.balance)
          setNewBalance(user.balance + post.reward)
          setAnimateSats(true)
        }

        // Trigger storage event to update other components
        window.dispatchEvent(new Event("storage"))
      }

      toast({
        title: "🎊 Fix verified!",
        description: `${post?.reward} sats have been added to your balance 💰`,
        variant: "success",
      })

      // Navigate immediately to dashboard after successful fix
      router.push("/dashboard")
      return // Exit the function early to prevent setting submittingFix to false
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not verify the fix",
        variant: "destructive",
      })
      setSubmittingFix(false) // Only reset on error
    } finally {
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!post) {
    return (
      <div className="container px-4 py-6 mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <p className="mt-2 text-muted-foreground">The post you're looking for doesn't exist or has been removed.</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (showCamera) {
    return (
      <div className="container px-4 py-6 mx-auto camera-page" data-camera-active="true">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setShowCamera(false)} className="mr-2">
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
          <h1 className="text-2xl font-bold">Take "After" Photo</h1>
        </div>

        <CameraCapture onCapture={handleCaptureFixImage} />
      </div>
    )
  }

  if (showBeforeAfter) {
    return (
      <div className="container px-4 py-6 mx-auto max-w-md comparison-page" data-comparison-active="true">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setShowBeforeAfter(false)} className="mr-2">
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
          <h1 className="text-2xl font-bold">Before & After</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <h2 className="text-lg font-medium mb-2">Before</h2>
            <div className="relative w-full h-40 overflow-hidden rounded-lg">
              <Image
                src={post.imageUrl || post.image_url || "/placeholder.svg"}
                alt="Before"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-2">After</h2>
            <div className="relative w-full h-40 overflow-hidden rounded-lg">
              <Image src={fixImage || "/placeholder.svg"} alt="After" fill className="object-cover" />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmitFix}
          disabled={submittingFix}
          className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white"
        >
          {submittingFix ? (
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
              Verifying...
            </div>
          ) : (
            "Submit Fix"
          )}
        </Button>
      </div>
    )
  }

  // Check if the current user is the post creator
  const isPostCreator = user && (post.userId === user.id || post.user_id === user.id)

  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
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
          <h1 className="text-2xl font-bold">Issue Details</h1>
        </div>
      </div>

      {post.fixed ? (
        // Show before and after images side by side if the post is fixed
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="relative w-full h-40 overflow-hidden rounded-lg">
            <div className="absolute top-0 left-0 bg-black/50 text-white text-xs px-2 py-1 rounded-br-lg z-10">
              Before
            </div>
            <Image
              src={post.imageUrl || post.image_url || "/placeholder.svg"}
              alt="Before"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative w-full h-40 overflow-hidden rounded-lg">
            <div className="absolute top-0 left-0 bg-black/50 text-white text-xs px-2 py-1 rounded-br-lg z-10">
              After
            </div>
            <Image
              src={post.fixedImageUrl || post.fixed_image_url || "/placeholder.svg"}
              alt="After"
              fill
              className="object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100 dark:hover:bg-emerald-900"
              >
                Fixed
              </Badge>
            </div>
          </div>
        </div>
      ) : (
        // Show only the before image if the post is not fixed
        <div className="relative w-full h-64 mb-4 overflow-hidden rounded-lg">
          <Image
            src={post.imageUrl || post.image_url || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover"
          />
          <div className="absolute top-2 right-2">
            <Badge
              variant={post.claimed ? "secondary" : post.fixed ? "outline" : "default"}
              className={
                post.fixed
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100 dark:hover:bg-emerald-900"
                  : ""
              }
            >
              {post.fixed ? "Fixed" : post.claimed ? "In Progress" : formatSatsValue(post.reward)}
            </Badge>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold">{post.title}</h2>
        <div className="flex items-center mt-2 text-sm text-muted-foreground">
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
            className="mr-1"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="mr-3">{post.location}</span>
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
            className="mr-1"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatDistanceToNow(new Date(post.createdAt || post.created_at), { addSuffix: true })}</span>
        </div>
        <p className="mt-4">{post.description}</p>
      </div>

      <Card className="mb-6 border dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className={`p-2 mr-3 bg-amber-100 rounded-full dark:bg-amber-950/50 ${animateSats ? "animate-pulse" : ""}`}
                ref={balanceRef}
              >
                <BitcoinLogo size={20} />
              </div>
              <div>
                <p className="font-medium">Reward</p>
                <p className={`text-2xl font-bold ${animateSats ? "text-amber-500 dark:text-amber-400" : ""}`}>
                  {formatSatsValue(post.reward)}
                </p>
              </div>
            </div>

            {/* Allow any user (including the creator) to claim the post if it's not claimed or fixed */}
            {!post.claimed && !post.fixed && user && (
              <Button onClick={handleClaimPost} disabled={claiming}>
                {claiming ? "Claiming..." : "Claim"}
              </Button>
            )}

            {/* Show Submit Fix button if the post is claimed by the current user */}
            {post.claimed && (post.claimedBy === user?.id || post.claimed_by === user?.id) && !post.fixed && (
              <Button onClick={() => setShowCamera(true)}>Submit Fix</Button>
            )}

            {post.fixed && (
              <Badge
                variant="outline"
                className="px-3 py-1 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-800/30"
              >
                Completed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
