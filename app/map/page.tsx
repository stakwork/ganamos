"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider" // Keep useAuth to potentially use user info if available
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { mockPosts } from "@/lib/mock-data"
import type { Post } from "@/lib/types"
import { MapView } from "@/components/map-view"
import { Loader2 } from "lucide-react" // For a generic loading indicator

export default function MapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, sessionLoaded } = useAuth() // Use sessionLoaded to wait for auth state
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const supabase = createBrowserSupabaseClient()

  const centerPostId = searchParams.get("centerPost")
  const centerPost = posts.find((post) => post.id === centerPostId) || undefined

  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const zoomType = searchParams.get("zoom")
  const locationName = searchParams.get("name")

  const userLocation =
    lat && lng
      ? {
          latitude: Number.parseFloat(lat),
          longitude: Number.parseFloat(lng),
          zoomType: zoomType || "default",
          name: locationName || "",
        }
      : undefined

  useEffect(() => {
    // Fetch posts regardless of login state,
    // but wait until the session is loaded to avoid potential race conditions
    // or if you want to fetch different posts for logged-in vs anonymous users.
    // For now, we fetch the same posts for everyone.
    if (sessionLoaded) {
      fetchPosts()
    }
  }, [sessionLoaded]) // Depend on sessionLoaded

  const fetchPosts = async () => {
    setIsLoadingPosts(true)
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .eq("fixed", false)
          .neq("under_review", true)

        if (data && !error) {
          setPosts(data)
        } else if (error) {
          console.error("Error fetching posts from Supabase:", error)
          // Fallback to mock data on Supabase error
          const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
          setPosts(filteredPosts)
        } else {
          // No data and no error, fallback to mock
          const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
          setPosts(filteredPosts)
        }
      } else {
        // Fall back to mock data if Supabase client isn't available (shouldn't happen)
        const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
        setPosts(filteredPosts)
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
      setPosts(filteredPosts)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const handleClose = () => {
    router.back()
  }

  // Show a loading indicator while auth state is being determined or posts are loading
  if (authLoading || isLoadingPosts) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          Loading Map...
        </div>
      </div>
    )
  }

  // At this point, auth state is known (user might be null for anonymous)
  // and posts have been attempted to be fetched.
  return (
    <div className="h-screen w-screen">
      <MapView
        posts={posts}
        centerPost={centerPost}
        onClose={handleClose}
        isLoading={isLoadingPosts} // Pass post loading state to MapView
        userLocation={userLocation}
        // Potentially pass 'user' to MapView if it needs to behave differently for logged-in users
        // user={user}
      />
    </div>
  )
}
