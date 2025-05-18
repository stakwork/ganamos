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
import { getFilters, clearFilters, countActiveFilters } from "@/lib/filter-store"
import type { Post } from "@/lib/types"
import { Filter, X } from "lucide-react"

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()
  const [filters, setFilters] = useState(getFilters())
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [hasMore, setHasMore] = useState(true)

  // Load filters and count active ones
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentFilters = getFilters()
      setFilters(currentFilters)
      setActiveFilterCount(countActiveFilters(currentFilters))

      // Update location based on filter
      if (currentFilters.isActive) {
        saveSelectedLocation(currentFilters.location)
        setCurrentLocation(currentFilters.location)
      }
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    // Set default location if no filters are active
    if (typeof window !== "undefined" && !filters.isActive) {
      saveSelectedLocation("downtown")
      setCurrentLocation(getCurrentLocation())
    }

    // Fetch posts with page 1
    fetchPosts(1)
  }, [user, loading, router, filters])

  const fetchPosts = async (page = currentPage) => {
    setIsLoading(true)
    try {
      // Try to fetch from Supabase first
      if (supabase) {
        // Calculate pagination range
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        console.log(`Fetching posts from ${from} to ${to}`)

        let query = supabase
          .from("posts")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .eq("fixed", false)

        // Apply filters if active
        if (filters.isActive) {
          // Apply location filter
          if (filters.location) {
            query = query.eq("location", filters.location)
          }

          // Apply reward range filter
          if (filters.rewardRange[0] > 0 || filters.rewardRange[1] < 10000) {
            query = query.gte("reward", filters.rewardRange[0]).lte("reward", filters.rewardRange[1])
          }

          // Apply date filter
          if (filters.dateFilter !== "any") {
            const now = new Date()
            let dateLimit

            if (filters.dateFilter === "today") {
              // Start of today
              dateLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            } else if (filters.dateFilter === "week") {
              // 7 days ago
              dateLimit = new Date(now)
              dateLimit.setDate(dateLimit.getDate() - 7)
            }

            if (dateLimit) {
              query = query.gte("created_at", dateLimit.toISOString())
            }
          }
        }

        // Apply pagination
        query = query.range(from, to)

        const { data, error, count } = await query

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
      let filteredPosts = mockPosts.filter((post) => !post.fixed)

      // Apply filters to mock data if active
      if (filters.isActive) {
        // Apply location filter
        if (filters.location) {
          filteredPosts = filteredPosts.filter((post) => post.location === filters.location)
        }

        // Apply reward range filter
        if (filters.rewardRange[0] > 0 || filters.rewardRange[1] < 10000) {
          filteredPosts = filteredPosts.filter(
            (post) => post.reward >= filters.rewardRange[0] && post.reward <= filters.rewardRange[1],
          )
        }

        // Apply date filter
        if (filters.dateFilter !== "any") {
          const now = new Date()
          let dateLimit

          if (filters.dateFilter === "today") {
            // Start of today
            dateLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          } else if (filters.dateFilter === "week") {
            // 7 days ago
            dateLimit = new Date(now)
            dateLimit.setDate(dateLimit.getDate() - 7)
          }

          if (dateLimit) {
            filteredPosts = filteredPosts.filter((post) => new Date(post.created_at) >= dateLimit)
          }
        }
      }

      const mockPaginatedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize)

      if (page === 1) {
        setPosts(mockPaginatedPosts)
      } else {
        setPosts((prev) => [...prev, ...mockPaginatedPosts])
      }

      // Check if there are more mock posts to load
      setHasMore(page * pageSize < filteredPosts.length)
    } catch (error) {
      console.error("Error fetching posts:", error)
      // Fall back to mock data with same filter logic
      let filteredPosts = mockPosts.filter((post) => !post.fixed)

      if (filters.isActive) {
        // Apply location filter
        if (filters.location) {
          filteredPosts = filteredPosts.filter((post) => post.location === filters.location)
        }

        // Apply reward range filter
        if (filters.rewardRange[0] > 0 || filters.rewardRange[1] < 10000) {
          filteredPosts = filteredPosts.filter(
            (post) => post.reward >= filters.rewardRange[0] && post.reward <= filters.rewardRange[1],
          )
        }

        // Apply date filter
        if (filters.dateFilter !== "any") {
          const now = new Date()
          let dateLimit

          if (filters.dateFilter === "today") {
            // Start of today
            dateLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          } else if (filters.dateFilter === "week") {
            // 7 days ago
            dateLimit = new Date(now)
            dateLimit.setDate(dateLimit.getDate() - 7)
          }

          if (dateLimit) {
            filteredPosts = filteredPosts.filter((post) => new Date(post.created_at) >= dateLimit)
          }
        }
      }

      const mockPaginatedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize)

      if (page === 1) {
        setPosts(mockPaginatedPosts)
      } else {
        setPosts((prev) => [...prev, ...mockPaginatedPosts])
      }

      // Check if there are more mock posts to load
      setHasMore(page * pageSize < filteredPosts.length)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle filter changes
  const handleClearFilters = () => {
    clearFilters()
    setFilters(getFilters())
    setActiveFilterCount(0)
    // Reset to page 1
    setCurrentPage(1)
    // Reset location to downtown
    saveSelectedLocation("downtown")
    setCurrentLocation("downtown")
  }

  // Update when posts change
  useEffect(() => {
    const handleStorageChange = () => {
      const currentFilters = getFilters()
      setFilters(currentFilters)
      setActiveFilterCount(countActiveFilters(currentFilters))
      fetchPosts(1)
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
            {/* Filter indicator */}
            {filters.isActive && activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-sm"
                onClick={handleClearFilters}
              >
                <Filter className="w-4 h-4" />
                <span>
                  {activeFilterCount} {activeFilterCount === 1 ? "Filter" : "Filters"}
                </span>
                <X
                  className="w-4 h-4 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFilters()
                  }}
                />
              </Button>
            )}

            <div className={filters.isActive && activeFilterCount > 0 ? "" : "ml-auto"}>
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
                  <p className="text-muted-foreground mb-6">
                    {filters.isActive
                      ? "No issues match your current filters"
                      : "Be the first to post an issue in your community"}
                  </p>
                  {filters.isActive ? (
                    <Button onClick={handleClearFilters} className="flex items-center gap-2 mb-4">
                      <X className="w-4 h-4" />
                      Clear Filters
                    </Button>
                  ) : null}
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
    </>
  )
}
