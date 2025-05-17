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
import type { Post } from "@/lib/types"

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [showSearchPage, setShowSearchPage] = useState(false)
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
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowSearchPage(true)}
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
                className="text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="sr-only">Search</span>
            </Button>
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

      <div className="container px-4 pb-6 mx-auto max-w-md">
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

      {showSearchPage && <SearchPage onClose={() => setShowSearchPage(false)} />}
    </>
  )
}

function SearchPage({ onClose }: { onClose: () => void }) {
  // Group posts by reward range for the bar chart
  const rewardRanges = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]
  const postsByReward = rewardRanges.map((min, index) => {
    const max = rewardRanges[index + 1] || Number.POSITIVE_INFINITY
    const count = mockPosts.filter((post) => post.reward >= min && post.reward < max).length
    return { min, max, count }
  })

  const maxCount = Math.max(...postsByReward.map((range) => range.count))
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("any")
  const [rewardRange, setRewardRange] = useState<[number, number]>([0, 10000])

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="container px-4 py-6 mx-auto max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Search</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Search</label>
            <div className="relative mt-1">
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
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search issues..."
                className="w-full pl-10 pr-4 py-2 border rounded-md dark:border-gray-800 bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Location</label>
            <select className="w-full mt-1 p-2 border rounded-md dark:border-gray-800 bg-background">
              <option>Downtown</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Reward Range</label>
            <div className="mt-4">
              <div className="flex h-24 items-end space-x-1 mb-2">
                {postsByReward.map((range, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-200 dark:bg-emerald-900/50 rounded-t"
                    style={{
                      height: `${range.count ? (range.count / maxCount) * 100 : 0}%`,
                      opacity: rewardRange[0] <= range.min && range.max <= rewardRange[1] ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="1000"
                value={rewardRange[1]}
                onChange={(e) => setRewardRange([rewardRange[0], Number.parseInt(e.target.value)])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatSatsValue(rewardRange[0])}</span>
                <span>{formatSatsValue(rewardRange[1])}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date</label>
            <div className="flex gap-2">
              <Button
                variant={selectedDateFilter === "any" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedDateFilter("any")}
              >
                Any Time
              </Button>
              <Button
                variant={selectedDateFilter === "today" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedDateFilter("today")}
              >
                Today
              </Button>
              <Button
                variant={selectedDateFilter === "week" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedDateFilter("week")}
              >
                This Week
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="w-1/2 dark:border-gray-700" onClick={onClose}>
              Cancel
            </Button>
            <Button className="w-1/2" onClick={onClose}>
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
