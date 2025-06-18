"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/post-card"
import { getCurrentLocation, saveSelectedLocation } from "@/lib/mock-location"
import { formatSatsValue } from "@/lib/utils"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Plus, X, Filter, User, SlidersHorizontal, ChevronDown, ArrowUpDown } from "lucide-react"
import type { Post } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ActiveFilters {
  count: number
  dateFilter: string
  rewardRange: [number, number]
  location: string
  searchQuery: string
  sortBy?: 'proximity' | 'recency' | 'reward'
  timestamp?: string
}

export default function DashboardPage() {
  const {
    user,
    profile,
    loading,
    session,
    sessionLoaded,
    isConnectedAccount,
    connectedAccounts,
    activeUserId,
    switchToAccount,
    resetToMainAccount,
  } = useAuth()
  const router = useRouter()
  const [currentLocation, setCurrentLocation] = useState(getCurrentLocation())
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [hasMore, setHasMore] = useState(true)

  const [activeFilters, setActiveFilters] = useState<ActiveFilters | null>(null)
  const [filterCleared, setFilterCleared] = useState(false)

  // Add session guard with useEffect
  useEffect(() => {
    if (sessionLoaded && !session) {
      console.log("Dashboard - No session after loading, redirecting to login")
      router.push("/auth/login")
    }
  }, [session, sessionLoaded, router])

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

    // Load active filters from localStorage
    const loadFilters = () => {
      const filtersJson = localStorage.getItem("activeFilters")
      if (filtersJson) {
        try {
          const filters = JSON.parse(filtersJson)
          if (!filters.sortBy) filters.sortBy = 'proximity'
          setActiveFilters(filters)
          setCurrentPage(1)
          fetchPosts(1, filters)
        } catch (e) {
          console.error("Error parsing filters:", e)
          fetchPosts(1, null)
        }
      } else {
        fetchPosts(1, {
          ...activeFilters,
          sortBy: 'proximity',
          count: activeFilters?.count ?? 0,
          dateFilter: activeFilters?.dateFilter ?? 'any',
          rewardRange: activeFilters?.rewardRange ?? [0, 10000],
          location: activeFilters?.location ?? '',
          searchQuery: activeFilters?.searchQuery ?? '',
        })
      }
    }

    loadFilters()

    // Set up event listener for storage changes
    const handleStorageChange = () => {
      loadFilters()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [user, loading, router])

  // Effect to handle filter cleared state
  useEffect(() => {
    if (filterCleared) {
      fetchPosts(1, null)
      setFilterCleared(false)
    }
  }, [filterCleared])

  // Refetch posts when sortBy changes
  useEffect(() => {
    if (activeFilters && typeof activeFilters.sortBy === 'string') {
      fetchPosts(1, activeFilters)
    }
  }, [activeFilters?.sortBy])

  const clearFilters = () => {
    localStorage.removeItem("activeFilters")
    setActiveFilters(null)
    // Reset to page 1 and refresh posts without filters
    setCurrentPage(1)
    setPosts([]) // Clear posts immediately to avoid showing filtered results
    setIsLoading(true) // Show loading state
    setFilterCleared(true) // Set flag to trigger re-fetch
  }

  const fetchPosts = async (page = currentPage, filters = activeFilters) => {
    console.log("Fetching posts with filters:", filters)
    // Enhanced logging before API call
    console.log("Session before API call:", !!session)
    if (session) {
      console.log("Session expiry:", new Date(session.expires_at! * 1000).toISOString())
    }

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
          .eq("fixed", false)
          .neq("under_review", true)

        // Apply sorting
        const sortBy = filters?.sortBy || 'proximity'
        if (sortBy === 'recency') {
          query = query.order('created_at', { ascending: false })
        } else if (sortBy === 'reward') {
          query = query.order('reward', { ascending: false })
        } else if (sortBy === 'proximity' && currentLocation?.lat && currentLocation?.lng) {
          // If using PostGIS or similar, you could use .order('distance', ...) with a computed column
          // For now, fallback to recency if proximity sort not supported
          query = query.order('created_at', { ascending: false })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        // Apply filters if active
        if (filters) {
          // Apply search query filter
          if (filters.searchQuery) {
            query = query.ilike("title", `%${filters.searchQuery}%`)
          }

          // Apply date filter
          if (filters.dateFilter === "today") {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            query = query.gte("created_at", today.toISOString())
          } else if (filters.dateFilter === "week") {
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            query = query.gte("created_at", weekAgo.toISOString())
          }

          // Apply reward range filter
          if (filters.rewardRange[0] > 0) {
            query = query.gte("reward", filters.rewardRange[0])
          }
          if (filters.rewardRange[1] < 10000) {
            query = query.lte("reward", filters.rewardRange[1])
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
      // let filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)

      // Apply filters to mock data if active
      // if (filters) {
      //   if (filters.searchQuery) {
      //     filteredPosts = filteredPosts.filter((post) =>
      //       post.title.toLowerCase().includes(filters.searchQuery.toLowerCase()),
      //     )
      //   }

      //   if (filters.dateFilter === "today") {
      //     const today = new Date()
      //     today.setHours(0, 0, 0, 0)
      //     filteredPosts = filteredPosts.filter((post) => {
      //       const postDate = new Date(post.created_at)
      //       return postDate >= today
      //     })
      //   } else if (filters.dateFilter === "week") {
      //     const weekAgo = new Date()
      //     weekAgo.setDate(weekAgo.getDate() - 7)
      //     filteredPosts = filteredPosts.filter((post) => {
      //       const postDate = new Date(post.created_at)
      //       return postDate >= weekAgo
      //     })
      //   }

      //   filteredPosts = filteredPosts.filter(
      //     (post) => post.reward >= filters.rewardRange[0] && post.reward <= filters.rewardRange[1],
      //   )
      // }

      // console.log(`Filtered posts count: ${filteredPosts.length}`)

      // const mockPaginatedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize)

      // if (page === 1) {
      //   setPosts(mockPaginatedPosts)
      // } else {
      //   setPosts((prev) => [...prev, ...mockPaginatedPosts])
      // }

      // // Check if there are more mock posts to load
      // setHasMore(page * pageSize < filteredPosts.length)
    } catch (error) {
      console.error("Error fetching posts:", error)
      // Fall back to mock data with simplified filter logic
      // let filteredPosts = [...mockPosts].filter((post) => !post.fixed && !post.under_review)

      // // Apply basic filters even in error case
      // if (filters && filters.dateFilter === "today") {
      //   const today = new Date()
      //   today.setHours(0, 0, 0, 0)
      //   filteredPosts = filteredPosts.filter((post) => new Date(post.created_at) >= today)
      // }

      // const mockPaginatedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize)

      // if (page === 1) {
      //   setPosts(mockPaginatedPosts)
      // } else {
      //   setPosts((prev) => [...prev, ...mockPaginatedPosts])
      // }

      // setHasMore(page * pageSize < filteredPosts.length)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSatsClick = () => {
    router.push("/wallet")
  }

  function handleSortChange(sort: 'proximity' | 'recency' | 'reward') {
    const prev = (activeFilters || {}) as Partial<ActiveFilters>
    const newFilters = {
      count: prev.count ?? 0,
      dateFilter: prev.dateFilter ?? 'any',
      rewardRange: prev.rewardRange ?? [0, 10000],
      location: prev.location ?? '',
      searchQuery: prev.searchQuery ?? '',
      sortBy: sort,
      timestamp: prev.timestamp ?? new Date().toISOString(),
    }
    setActiveFilters(newFilters)
    localStorage.setItem('activeFilters', JSON.stringify(newFilters))
  }

  // Session guard with early return
  if (sessionLoaded && !session) {
    return null // Will redirect in useEffect
  }

  // IMPORTANT CHANGE: Skip the full-screen loading state when we're coming from auth
  // Only show loading state if we're not in the auth flow (sessionLoaded is true but still loading user data)
  if (!sessionLoaded && (loading || !user)) {
    // We're still in the auth flow, don't show another loading screen
    return null
  } else if (loading || !user) {
    // We're not in the auth flow, but still loading user data (e.g., after a refresh)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-transparent pb-4 w-full flex justify-center">
        <div className="w-full max-w-md pt-6 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Filter Button: just icon */}
              <Button
                variant="ghost"
                onClick={() => router.push("/search")}
                className="flex items-center h-9 w-9 justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                aria-label="Filter"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>

              {/* Sort Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 h-9 px-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm focus-visible:ring-0 focus-visible:outline-none border-0"
                    aria-label="Sort options"
                  >
                    {(() => {
                      const sortBy = activeFilters?.sortBy || 'proximity'
                      if (sortBy === 'proximity') return 'Nearby'
                      if (sortBy === 'recency') return 'Recent'
                      if (sortBy === 'reward') return 'Reward'
                    })()}
                    {/* Custom sort icon SVG */}
                    <svg className="ml-1 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <rect x="10" y="5" width="8" height="2" rx="1" />
                      <rect x="10" y="9" width="6" height="2" rx="1" />
                      <rect x="10" y="13" width="4" height="2" rx="1" />
                      <rect x="10" y="17" width="2" height="2" rx="1" />
                      <path d="M6 5v12M6 17l-2-2M6 17l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => handleSortChange('recency')}
                    className={activeFilters?.sortBy === 'recency' ? 'font-semibold text-emerald-600' : ''}
                  >
                    Recent
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange('proximity')}
                    className={activeFilters?.sortBy === 'proximity' ? 'font-semibold text-emerald-600' : ''}
                  >
                    Nearby
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange('reward')}
                    className={activeFilters?.sortBy === 'reward' ? 'font-semibold text-emerald-600' : ''}
                  >
                    Reward
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {activeFilters && activeFilters.count > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center px-3 py-1 text-sm font-medium bg-blue-100 rounded-full text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-all"
                >
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  {activeFilters.count} {activeFilters.count === 1 ? "Filter" : "Filters"}
                  <X className="ml-1 h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={handleSatsClick}
                className="flex items-center h-9 px-3 text-sm font-medium bg-amber-100 rounded-full text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
              >
                <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={16} height={16} className="mr-1" />
                {profile ? formatSatsValue(profile.balance) : formatSatsValue(0)}
              </Button>
              {/* Connected Accounts Dropdown - only show if user has connected accounts */}
              {connectedAccounts.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Switch connected account">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={profile?.avatar_url ?? undefined}
                          alt={profile?.name ?? "Connected Account"}
                        />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    {/* Main Account */}
                    <DropdownMenuItem
                      onClick={resetToMainAccount}
                      className={`flex items-center gap-3 py-3 px-3 text-base ${!isConnectedAccount ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={user?.user_metadata?.avatar_url ?? "/placeholder.svg"} 
                          alt={user?.user_metadata?.full_name ?? "User"} 
                        />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 font-medium">Main Account</span>
                      {!isConnectedAccount && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>

                    {/* Connected Accounts */}
                    {connectedAccounts.map((account) => (
                      <DropdownMenuItem
                        key={account.id}
                        onClick={() => switchToAccount(account.id)}
                        className={`flex items-center gap-3 py-3 px-3 text-base ${activeUserId === account.id ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={account.avatar_url ?? undefined} alt={account.name ?? undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 font-medium">{account.name}</span>
                        {activeUserId === account.id && <span className="text-blue-600">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-md pb-20 px-4">
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
                          const nextPage = currentPage + 1
                          setCurrentPage(nextPage)
                          fetchPosts(nextPage)
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
                      {activeFilters && activeFilters.count > 0
                        ? "Try removing some filters to see more results"
                        : "Be the first to post an issue in your community"}
                    </p>
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
    </>
  )
}
