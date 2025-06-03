"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { mockPosts } from "@/lib/mock-data"
import type { Post } from "@/lib/types"
import { MapView } from "@/components/map-view"

export default function MapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  // Get center post ID from URL params if provided
  const centerPostId = searchParams.get("centerPost")
  const centerPost = posts.find((post) => post.id === centerPostId) || undefined

  // After the centerPostId line, add these lines to get location parameters
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const zoomType = searchParams.get("zoom")
  const locationName = searchParams.get("name")

  // Create userLocation object if parameters exist
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
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    fetchPosts()
  }, [user, loading, router])

  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      // Try to fetch from Supabase first
      if (supabase) {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .eq("fixed", false)
          .neq("under_review", true)

        if (data && !error) {
          setPosts(data)
          setIsLoading(false)
          return
        }
      }

      // Fall back to mock data if Supabase fails
      const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
      setPosts(filteredPosts)
    } catch (error) {
      console.error("Error fetching posts:", error)
      // Fall back to mock data
      const filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)
      setPosts(filteredPosts)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    router.back()
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen">
      <MapView
        posts={posts}
        centerPost={centerPost}
        onClose={handleClose}
        isLoading={isLoading}
        userLocation={userLocation}
      />
    </div>
  )
}
