"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { MapView } from "@/components/map-view"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/components/auth-provider"
import { createBrowserSupabaseClient } from "@/lib/supabase"

export default function MapPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from("posts")
            .select("*")
            .eq("fixed", false)
            .order("created_at", { ascending: false })
          if (error) {
            console.error("Error fetching posts:", error)
            setPosts([])
          } else {
            setPosts(data || [])
          }
        } else {
          setPosts([])
        }
      } catch (error) {
        console.error("Error in fetchPosts:", error)
        setPosts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <MapView posts={posts} onClose={() => window.history.back()} />
}
