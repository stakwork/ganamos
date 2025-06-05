"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { mockPosts } from "@/lib/mock-data"
import type { Post } from "@/lib/types"
import { MapView } from "@/components/map-view"
import LoadingSpinner from "@/components/loading-spinner" // Assuming you have a spinner

export default function MapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth() // Renamed to authLoading for clarity
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true) // Separate loading for posts
  const supabase = createBrowserSupabaseClient()

  const centerPostId = searchParams.get("centerPost")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const zoomType = searchParams.get("zoom")
  const locationName = searchParams.get("name")

  const centerPost = posts.find((post) => post.id === centerPostId) || undefined
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
    // Fetch posts regardless of login state, once auth state is determined
    // if (authLoading) return; // Optionally wait for auth to resolve, or fetch immediately

    const fetchPosts = async () => {
      setPostsLoading(true)
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
            // Fall back to mock data on error
            const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
            setPosts(filteredPosts)
          } else {
            // No data and no error, fall back to mock
            const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
            setPosts(filteredPosts)
          }
        } else {
          // Fall back to mock data if Supabase client isn't available
          const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
          setPosts(filteredPosts)
        }
      } catch (error) {
        console.error("Error fetching posts:", error)
        const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
        setPosts(filteredPosts)
      } finally {
        setPostsLoading(false)
      }
    }

    fetchPosts()
  }, []) // Fetch posts once on mount, or if supabase client changes. User state doesn't gate fetching.

  const handleClose = () => {
    router.back()
  }

  // Show loading spinner if auth state is still loading OR if posts are loading
  if (authLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
        <p className="ml-2 text-lg">Loading Map...</p>
      </div>
    )
  }

  // At this point, auth state is resolved (user might be null) and posts are loaded (or failed to mock)
  return (
    <div className="h-screen w-screen">
      <MapView
        posts={posts}
        centerPost={centerPost}
        onClose={handleClose}
        isLoading={postsLoading} // Pass postsLoading to MapView if it needs it
        userLocation={userLocation}
        currentUser={user} // Pass the user (can be null) to MapView
      />
    </div>
  )
}
