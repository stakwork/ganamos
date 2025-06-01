"use client"

import { useState, useEffect } from "react"
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
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Post } from "@/lib/types"
import { reverseGeocode } from "@/lib/geocoding"

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingFix, setSubmittingFix] = useState(false)
  const [fixImage, setFixImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [fixerProfile, setFixerProfile] = useState<{ name: string; avatar_url: string | null } | null>(null)
  const [fixerNote, setFixerNote] = useState("")
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user, profile, updateBalance, activeUserId } = useAuth()
  const supabase = createBrowserSupabaseClient()
  const [displayLocation, setDisplayLocation] = useState<string>("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

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

  // Convert coordinates to city name if needed
  useEffect(() => {
    const convertLocation = async () => {
      if (post) {
        // First try to use stored city
        if (post.city) {
          setDisplayLocation(post.city)
          return
        }

        // Fall back to existing location field
        if (post.location && !post.location.includes(",")) {
          setDisplayLocation(post.location)
          return
        }

        // Last resort: convert coordinates to city
        if (post.latitude && post.longitude) {
          try {
            const cityName = await reverseGeocode(post.latitude, post.longitude)
            setDisplayLocation(cityName)
          } catch (error) {
            console.error("Error converting coordinates to city:", error)
            setDisplayLocation(post.location || "Unknown")
          }
        } else {
          setDisplayLocation(post.location || "Unknown")
        }
      }
    }

    convertLocation()
  }, [post])

  const handleCaptureFixImage = (imageSrc: string) => {
    setFixImage(imageSrc)
    setShowCamera(false)
    setShowBeforeAfter(true)
  }

  const handleRetakePhoto = () => {
    setShowBeforeAfter(false)
    setShowCamera(true)
  }

  const handleSaveNote = () => {
    setShowNoteDialog(false)
    toast({
      title: "Note saved",
      description: "Your note has been added to the fix",
    })
  }

  const handleSubmitFix = async () => {
    if (!fixImage) {
      toast({
        title: "Image required",
        description: "Please take a photo of the fixed issue",
        variant: "destructive",
      })
      return
    }

    setSubmittingFix(true)

    try {
      console.log("🔍 FIX SUBMISSION - Starting AI verification process")

      // Call Groq API to verify the fix
      const verificationResponse = await fetch("/api/verify-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          beforeImage: post?.imageUrl || post?.image_url,
          afterImage: fixImage,
          description: post?.description,
          title: post?.title,
        }),
      })

      console.log("🔍 FIX SUBMISSION - Verification API response status:", verificationResponse.status)

      if (!verificationResponse.ok) {
        throw new Error("Failed to verify fix with AI")
      }

      const verificationResult = await verificationResponse.json()
      console.log("🔍 FIX SUBMISSION - AI Verification Result:", verificationResult)

      // Implement confidence-based logic
      if (verificationResult.confidence >= 7) {
        console.log("🔍 FIX SUBMISSION - HIGH CONFIDENCE: Auto-approving fix")

        // AUTO-APPROVE: Continue with existing logic
        // Update the local state
        if (post && user && profile) {
          const now = new Date()
          const nowIso = now.toISOString()

          const updatedPost = {
            ...post,
            fixed: true,
            fixedAt: now,
            fixed_at: nowIso,
            fixedImageUrl: fixImage,
            fixed_image_url: fixImage,
            fixed_by: activeUserId || user.id,
            fixer_note: fixerNote || null,
          }

          // Update in Supabase if possible
          if (supabase) {
            const { error } = await supabase
              .from("posts")
              .update({
                fixed: true,
                fixed_at: nowIso,
                fixed_by: activeUserId || user.id,
                fixed_image_url: fixImage,
                fixer_note: fixerNote || null,
              })
              .eq("id", post.id)

            if (error) {
              console.error("Error updating post in Supabase:", error)
            }

            // Increment the user's fixed issues count
            await supabase
              .from("profiles")
              .update({
                fixed_issues_count: (profile.fixed_issues_count || 0) + 1,
              })
              .eq("id", activeUserId || user.id)
          }

          // Update the post in the mockPosts array
          const postIndex = mockPosts.findIndex((p) => p.id === post.id)
          if (postIndex !== -1) {
            mockPosts[postIndex] = updatedPost
          }

          setPost(updatedPost)

          // Update user balance - ALWAYS reward the user who fixed the issue
          const currentBalance = profile.balance || 0
          console.log("🔍 BALANCE UPDATE - Starting balance update process")
          console.log("🔍 BALANCE UPDATE - Current balance:", currentBalance)
          console.log("🔍 BALANCE UPDATE - Reward amount:", post.reward)

          const newBalance = currentBalance + post.reward
          console.log("🔍 BALANCE UPDATE - New calculated balance:", newBalance)

          try {
            // Update the balance
            console.log("🔍 BALANCE UPDATE - Calling updateBalance with new balance:", newBalance)
            await updateBalance(newBalance)
            console.log("🔍 BALANCE UPDATE - updateBalance function completed")

            // Verify the balance was updated
            if (supabase) {
              const { data: updatedProfile, error } = await supabase
                .from("profiles")
                .select("balance")
                .eq("id", user.id)
                .single()

              if (error) {
                console.error("🔍 BALANCE UPDATE - Error verifying balance update:", error)
              } else {
                console.log("🔍 BALANCE UPDATE - Verified balance in database:", updatedProfile?.balance)
              }
            }
          } catch (error) {
            console.error("🔍 BALANCE UPDATE - Error updating balance:", error)
          }

          // Trigger storage event to update other components
          window.dispatchEvent(new Event("storage"))
        }

        toast({
          title: "🎊 Fix verified!",
          description: `${post?.reward} sats have been added to your balance 💰`,
          variant: "success",
        })

        // Navigate back to dashboard after successful fix
        router.push("/dashboard")
      } else {
        console.log("🔍 FIX SUBMISSION - LOW CONFIDENCE: Issue not resolved")

        // Set under_review flag and store submission data
        if (post && supabase && user && profile) {
          const nowIso = new Date().toISOString()

          const { error } = await supabase
            .from("posts")
            .update({
              under_review: true,
              submitted_fix_by_id: activeUserId || user.id,
              submitted_fix_by_name: profile.name || user.email?.split("@")[0] || "Anonymous",
              submitted_fix_by_avatar: profile.avatar_url,
              submitted_fix_at: nowIso,
              submitted_fix_image_url: fixImage,
              submitted_fix_note: fixerNote || null,
              ai_confidence_score: verificationResult.confidence,
              ai_analysis: verificationResult.reasoning,
            })
            .eq("id", post.id)

          if (error) {
            console.error("Error updating post review status:", error)
          }
        }

        toast({
          title: "Fix submitted for review",
          description: "Your fix has been submitted for review. The original poster will be notified to approve it.",
        })

        // Navigate back to dashboard
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("🔍 FIX SUBMISSION - Error during verification:", error)
      toast({
        title: "Error",
        description: "Could not verify the fix",
        variant: "destructive",
      })
    } finally {
      setSubmittingFix(false)
    }
  }

  const handleApproveFix = async () => {
    if (!post || !user) return

    setIsReviewing(true)

    try {
      // Update the post in Supabase
      if (supabase) {
        const nowIso = new Date().toISOString()

        const { error } = await supabase
          .from("posts")
          .update({
            fixed: true,
            fixed_at: nowIso,
            fixed_by: post.submitted_fix_by_id,
            fixed_image_url: post.submitted_fix_image_url,
            fixer_note: post.submitted_fix_note,
            under_review: false,
          })
          .eq("id", post.id)

        if (error) {
          console.error("Error approving fix:", error)
          throw new Error("Failed to approve fix")
        }

        // Update the post in state
        setPost({
          ...post,
          fixed: true,
          fixed_at: nowIso,
          fixed_by: post.submitted_fix_by_id,
          fixed_image_url: post.submitted_fix_image_url,
          fixer_note: post.submitted_fix_note,
          under_review: false,
        })

        // Reward the user who fixed the issue
        if (post.submitted_fix_by_id) {
          // Get the fixer's profile
          const { data: fixerProfile, error: profileError } = await supabase
            .from("profiles")
            .select("balance")
            .eq("id", post.submitted_fix_by_id)
            .single()

          if (profileError) {
            console.error("Error getting fixer profile:", profileError)
          } else if (fixerProfile) {
            // Update the fixer's balance
            const newBalance = (fixerProfile.balance || 0) + post.reward
            await supabase.from("profiles").update({ balance: newBalance }).eq("id", post.submitted_fix_by_id)
          }
        }

        toast({
          title: "Fix approved",
          description: "The fix has been approved and the reward has been transferred.",
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Error during fix approval:", error)
      toast({
        title: "Error",
        description: "Could not approve the fix",
        variant: "destructive",
      })
    } finally {
      setIsReviewing(false)
    }
  }

  const handleRejectFix = async () => {
    if (!post || !user) return

    setIsReviewing(true)

    try {
      // Update the post in Supabase
      if (supabase) {
        const { error } = await supabase
          .from("posts")
          .update({
            under_review: false,
            submitted_fix_by_id: null,
            submitted_fix_by_name: null,
            submitted_fix_by_avatar: null,
            submitted_fix_at: null,
            submitted_fix_image_url: null,
            submitted_fix_note: null,
          })
          .eq("id", post.id)

        if (error) {
          console.error("Error rejecting fix:", error)
          throw new Error("Failed to reject fix")
        }

        // Update the post in state
        setPost({
          ...post,
          under_review: false,
          submitted_fix_by_id: null,
          submitted_fix_by_name: null,
          submitted_fix_by_avatar: null,
          submitted_fix_at: null,
          submitted_fix_image_url: null,
          submitted_fix_note: null,
        })

        toast({
          title: "❌ Fix rejected",
          description: "The fix has been rejected. The issue is still open for others to fix.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error during fix rejection:", error)
      toast({
        title: "Error",
        description: "Could not reject the fix",
        variant: "destructive",
      })
    } finally {
      setIsReviewing(false)
    }
  }

  const getFixerInitials = () => {
    if (!fixerProfile?.name) return "U"
    return fixerProfile.name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
  }

  const formatFixerName = () => {
    if (!fixerProfile?.name) return "Unknown User"
    const nameParts = fixerProfile.name.split(" ")
    const firstName = nameParts[0] || ""
    const lastInitial = nameParts.length > 1 ? `${nameParts[nameParts.length - 1].charAt(0)}.` : ""
    return `${firstName} ${lastInitial}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
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
          <h1 className="text-2xl font-bold">Submit fix</h1>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="relative w-full h-48 overflow-hidden rounded-lg">
                <Image
                  src={post.imageUrl || post.image_url || "/placeholder.svg"}
                  alt="Before"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Before</span>
                </div>
              </div>
            </div>

            <div>
              <div className="relative w-full h-48 overflow-hidden rounded-lg">
                <Image src={fixImage || "/placeholder.svg"} alt="After" fill className="object-cover" />
                <div className="absolute top-2 left-2">
                  <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">After</span>
                </div>
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-black/50 hover:bg-black/70 text-white border-0 p-2"
                      >
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
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add a note</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="note">Note (optional)</Label>
                          <Textarea
                            id="note"
                            placeholder="Add any details about how you fixed this issue..."
                            value={fixerNote}
                            onChange={(e) => setFixerNote(e.target.value)}
                            className="mt-1"
                            rows={4}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveNote}>Save note</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleRetakePhoto}
                    className="bg-black/50 hover:bg-black/70 text-white border-0 p-2"
                  >
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
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{post.title}</h3>
            </div>

            <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="p-2 mr-3 bg-amber-100 rounded-full dark:bg-amber-950/50">
                <BitcoinLogo size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">Reward</p>
                <p className="text-lg font-bold">{formatSatsValue(post.reward)}</p>
              </div>
            </div>

            {fixerNote && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Your note:</p>
                <p className="text-sm text-muted-foreground">{fixerNote}</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleSubmitFix}
            disabled={submittingFix}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
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
      </div>
    )
  }

  // Check if the current user is the post creator
  // const isPostCreator = user && (post.userId === user.id || post.user_id === user.id)

  return (
    <div className="container px-4 pb-6 mx-auto max-w-md">
      {/* Header */}
      <div className="flex items-center mb-4">
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
        <h1 className="text-2xl font-bold">
          {post.under_review &&
          post.submitted_fix_image_url &&
          user &&
          (post.userId === user.id || post.user_id === user.id)
            ? "Review Submitted Fix"
            : "Issue Details"}
        </h1>
      </div>

      {/* Before and After Images */}
      {post.under_review &&
      post.submitted_fix_image_url &&
      user &&
      (post.userId === user.id || post.user_id === user.id) ? (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <div className="relative w-full h-40 overflow-hidden rounded-lg">
              <Image
                src={post.imageUrl || post.image_url || "/placeholder.svg"}
                alt="Before"
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Before</span>
              </div>
            </div>
          </div>
          <div>
            <div className="relative w-full h-40 overflow-hidden rounded-lg">
              <Image
                src={post.submitted_fix_image_url || "/placeholder.svg"}
                alt="After"
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">After</span>
              </div>
            </div>
          </div>
        </div>
      ) : post.fixed && post.fixed_image_url ? (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <div className="relative w-full h-40 overflow-hidden rounded-lg">
              <Image
                src={post.imageUrl || post.image_url || "/placeholder.svg"}
                alt="Before"
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Before</span>
              </div>
            </div>
          </div>
          <div>
            <div className="relative w-full h-40 overflow-hidden rounded-lg">
              <Image src={post.fixed_image_url || "/placeholder.svg"} alt="After" fill className="object-cover" />
              <div className="absolute top-2 left-2">
                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">After</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-64 mb-4 overflow-hidden rounded-lg">
          <Image
            src={post.imageUrl || post.image_url || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover"
          />
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
          <span className="mr-3">{displayLocation}</span>
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
          <span>
            {formatDistanceToNow(new Date(post.createdAt || post.created_at), { addSuffix: false })
              .replace("about ", "")
              .replace(" hours", " hrs")
              .replace(" minutes", " mins")}{" "}
            ago
          </span>
        </div>
        {!post.fixed && post.created_by && (
          <div className="flex items-center mt-2">
            <p className="text-xs text-muted-foreground mr-1">Created by</p>
            <span className="text-xs font-medium text-muted-foreground">{post.created_by}</span>
          </div>
        )}
        {post.under_review && post.submitted_fix_by_name && (
          <div className="flex items-center mt-1">
            <p className="text-xs text-muted-foreground mr-1">Fix submitted by</p>
            <span className="text-xs font-medium text-muted-foreground">{post.submitted_fix_by_name}</span>
          </div>
        )}
      </div>

      {/* AI Verification Section - Only visible when a fix is submitted for review */}
      {post.under_review && post.submitted_fix_image_url && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
          <div className="flex items-center mb-1">
            <p className="text-sm font-medium">AI Review</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {showFullAnalysis ? (
              <div>
                {post.ai_analysis || "The AI analysis is not available for this submission."}
                <button onClick={() => setShowFullAnalysis(false)} className="text-white hover:underline ml-1">
                  Show less
                </button>
              </div>
            ) : (
              <div className="line-clamp-3">
                {post.ai_analysis && post.ai_analysis.length > 150 ? (
                  <>
                    {post.ai_analysis.slice(0, 150)}
                    <button onClick={() => setShowFullAnalysis(true)} className="text-white hover:underline">
                      ...see more
                    </button>
                  </>
                ) : (
                  post.ai_analysis || "The AI analysis is not available for this submission."
                )}
              </div>
            )}
          </div>
          {post.ai_confidence_score && (
            <div className="mt-2 text-xs text-muted-foreground">Confidence Score: {post.ai_confidence_score}/10</div>
          )}
        </div>
      )}

      {/* Show fixer note if it exists */}
      {post.fixed && post.fixer_note && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <h3 className="font-medium mb-2">Fixer's note:</h3>
          <p className="text-sm text-muted-foreground">{post.fixer_note}</p>
        </div>
      )}

      {/* Review Section - Only visible to the post creator when a fix is submitted */}
      {post.under_review &&
        post.submitted_fix_image_url &&
        user &&
        (post.userId === user.id || post.user_id === user.id) && (
          <div className="space-y-4 mb-6">
            {post.submitted_fix_note && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Fixer's note:</p>
                <p className="text-sm text-muted-foreground">{post.submitted_fix_note}</p>
              </div>
            )}

            {/* Bitcoin Reward Section */}
            <Card className="border dark:border-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center">
                  <div className="p-2 mr-3 bg-amber-100 rounded-full dark:bg-amber-950/50">
                    <BitcoinLogo size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{formatSatsValue(post.reward)}</p>
                    <p className="text-sm font-medium text-muted-foreground">Reward</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button onClick={handleApproveFix} disabled={isReviewing} className="flex-1 w-full">
                {isReviewing ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Processing...
                  </div>
                ) : (
                  "Approve & Pay Reward"
                )}
              </Button>
              <Button onClick={handleRejectFix} disabled={isReviewing} variant="outline" className="flex-1">
                Reject Fix
              </Button>
            </div>
          </div>
        )}

      {/* Only show the reward card if not under review */}
      {!(
        post.under_review &&
        post.submitted_fix_image_url &&
        user &&
        (post.userId === user.id || post.user_id === user.id)
      ) && (
        <Card className="mb-6 border dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 mr-3 bg-amber-100 rounded-full dark:bg-amber-950/50">
                  <BitcoinLogo size={20} />
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold mr-2">{formatSatsValue(post.reward)}</p>
                  </div>
                  <p className="font-medium text-sm text-muted-foreground">Reward</p>
                  {post.fixed && post.fixed_by && (
                    <div className="flex items-center mt-1">
                      <p className="text-xs text-muted-foreground mr-1">Earned by</p>
                      <div className="flex items-center">
                        <Avatar className="h-4 w-4 mr-1">
                          <AvatarImage
                            src={fixerProfile?.avatar_url || "/placeholder.svg"}
                            alt={fixerProfile?.name || "User"}
                          />
                          <AvatarFallback>{getFixerInitials()}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{formatFixerName()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Show Submit Fix button for all unfixed posts */}
              {!post.fixed && user && <Button onClick={() => setShowCamera(true)}>Submit Fix</Button>}

              {post.fixed && (
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-800/30"
                >
                  Fixed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
