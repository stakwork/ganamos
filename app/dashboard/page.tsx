"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/post-card"
import { mockPosts } from "@/lib/mock-data"
import { getCurrentLocation, saveSelectedLocation } from "@/lib/mock-location"
import { formatSatsValue } from "@/lib/utils"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Plus } from "lucide-react"
import type { Post } from "@/lib/types"

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    // Always set location to Downtown
    if (typeof window !== "undefined") {
      // Set Downtown as the default location
      saveSelectedLocation("downtown")
      setCurrentLocation(getCurrentLocation())
    }

    // Fetch posts with page 1
    fetchPosts(1)
  }, [user, loading, router])

  const fetchPosts = async (page = currentPage) => {
    setIsLoading(true)
    try {
      // Try to fetch from Supabase first
      if (supabase) {
        // Calculate pagination range
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        console.log(`Fetching posts from ${from} to ${to}`)

        const { data, error, count } = await supabase
          .from("posts")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .eq("fixed", false)
          .range(from, to)

        if (data && !error) {
          if (page === 1) {
            setPosts(data)
          } else {
            setPosts((prev) => [...prev, ...data])
          }

          // Check if there are more posts to load
          setHasMore(count ? from + data.length < count : false)
          setIsLoading(false)
          return
        }
      }

      // Fall back to mock data if Supabase fails
      const mockPaginatedPosts = mockPosts.filter((post) => !post.fixed).slice((page - 1) * pageSize, page * pageSize)

      if (page === 1) {
        setPosts(mockPaginatedPosts)
      } else {
        setPosts((prev) => [...prev, ...mockPaginatedPosts])
      }

      // Check if there are more mock posts to load
      setHasMore(page * pageSize < mockPosts.filter((post) => !post.fixed).length)
    } catch (error) {
      console.error("Error fetching posts:", error)
      // Fall back to mock data
      const mockPaginatedPosts = mockPosts.filter((post) => !post.fixed).slice((page - 1) * pageSize, page * pageSize)

      if (page === 1) {
        setPosts(mockPaginatedPosts)
      } else {
        setPosts((prev) => [...prev, ...mockPaginatedPosts])
      }

      // Check if there are more mock posts to load
      setHasMore(page * pageSize < mockPosts.filter((post) => !post.fixed).length)
    } finally {
      setIsLoading(false)
    }
  }

  // Update when posts change
  useEffect(() => {
    const handleStorageChange = () => {
      fetchPosts()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Update location when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentLocation(getCurrentLocation())
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleSatsClick = () => {
    router.push("/wallet")
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-transparent pb-4">
        <div className="container px-4 pt-6 mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9"></div>
            <Button
              variant="ghost"
              onClick={handleSatsClick}
              className="flex items-center px-3 py-1 text-sm font-medium bg-amber-100 rounded-full text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={16} height={16} className="mr-1" />
              {profile ? formatSatsValue(profile.balance) : formatSatsValue(0)}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-center w-full px-4">
        <div className="relative w-full max-w-md pb-20">
          {/* Feed content */}
          {posts.length === 0 && isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg dark:border-gray-800 overflow-hidden">
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.length > 0 ? (
                <>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}

                  {hasMore && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentPage((prev) => prev + 1)
                          fetchPosts(currentPage + 1)
                        }}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
                            Loading...
                          </div>
                        ) : (
                          "Load More"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center border rounded-lg dark:border-gray-800 bg-white/90 dark:bg-gray-900/90">
                  <div className="flex flex-col items-center">
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
                      className="text-muted-foreground mb-4"
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <p className="text-lg font-medium mb-2">No issues found</p>
                    <p className="text-muted-foreground mb-6">Be the first to post an issue in your community</p>
                    <Button onClick={() => router.push("/post/new")} className="flex items-center gap-2">
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
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                      Post a new issue
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed position container that centers the button horizontally */}
      <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
        {/* Container with the same width as the feed */}
        <div className="w-full max-w-md px-4 relative pointer-events-none">
          {/* Button positioned at the right side of this container */}
          <button
            onClick={() => router.push("/post/new")}
            className="absolute right-4 bottom-0 flex items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-all w-14 h-14 pointer-events-auto"
            aria-label="New Post"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </div>
    </>
  )
}
