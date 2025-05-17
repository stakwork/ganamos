"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { PostCard } from "@/components/post-card"
import { useAuth } from "@/components/auth-provider"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { formatSatsValue } from "@/lib/utils"
import { mockPosts } from "@/lib/mock-data"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { AvatarSelector } from "@/components/avatar-selector"
import type { Post } from "@/lib/types"

type ActivityItem = {
  id: string
  type: "post" | "claim" | "fix" | "reward"
  postId: string
  postTitle: string
  timestamp: Date
  amount?: number
}

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("posted")
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [postedIssues, setPostedIssues] = useState<Post[]>([])
  const [fixedIssues, setFixedIssues] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fixedCount, setFixedCount] = useState(0)
  const [bitcoinPrice, setBitcoinPrice] = useState(64000) // Default fallback price
  const [isPriceLoading, setIsPriceLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }

    if (user) {
      // Fetch fixed count on initial load
      fetchFixedCount()

      // Fetch data for the initial active tab
      fetchDataForTab(activeTab)

      // Fetch Bitcoin price
      fetchBitcoinPrice()
    }

    // Set up a listener for storage events to update data when it changes
    const handleStorageChange = () => {
      fetchDataForTab(activeTab)
      fetchFixedCount()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [user, loading, router, activeTab])

  useEffect(() => {
    if (profile) {
      console.log("🔍 PROFILE PAGE - Profile data loaded:", profile)
      console.log("🔍 PROFILE PAGE - Current balance:", profile.balance)
    }
  }, [profile])

  // Fetch the current Bitcoin price
  const fetchBitcoinPrice = async () => {
    try {
      setIsPriceLoading(true)
      console.log("🔍 Fetching Bitcoin price from CoinMarketCap")

      const response = await fetch("/api/bitcoin-price")
      const data = await response.json()

      if (data.price) {
        console.log(`🔍 Current Bitcoin price: $${data.price}`)
        setBitcoinPrice(data.price)
      } else {
        console.warn("No price data returned, using fallback price")
      }
    } catch (error) {
      console.error("Error fetching Bitcoin price:", error)
      // Keep using the default price
    } finally {
      setIsPriceLoading(false)
    }
  }

  // Calculate USD value from satoshis
  const calculateUsdValue = (sats: number) => {
    // 1 BTC = 100,000,000 satoshis
    const btcAmount = sats / 100000000
    const usdValue = btcAmount * bitcoinPrice
    return usdValue.toFixed(2)
  }

  // Fetch the count of fixed issues for the user
  const fetchFixedCount = async () => {
    if (!user) return

    try {
      if (supabase) {
        console.log("🔍 Fetching fixed count for user:", user.id)
        const { data, error, count } = await supabase
          .from("posts")
          .select("*", { count: "exact" })
          .eq("claimed_by", user.id)
          .eq("fixed", true)

        if (!error) {
          console.log(`🔍 Found ${count} fixed issues`)
          setFixedCount(count || 0)
        } else {
          console.error("Error fetching fixed count:", error)
          // Fall back to mock data for fixed count
          const mockFixedCount = mockPosts.filter(
            (post) => (post.claimed_by === user.id || post.claimedBy === user.id) && post.fixed === true,
          ).length
          setFixedCount(mockFixedCount)
        }
      }
    } catch (error) {
      console.error("Error in fetchFixedCount:", error)
    }
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchDataForTab(value)
  }

  // Fetch data based on the selected tab
  const fetchDataForTab = async (tab: string) => {
    if (!user) return

    setIsLoading(true)
    console.log(`🔍 Fetching data for tab: ${tab}`)

    try {
      if (tab === "posted") {
        await fetchPostedIssues()
      } else if (tab === "fixing") {
        await fetchFixedIssues()
      } else if (tab === "activity") {
        await fetchActivities()
      }
    } catch (error) {
      console.error(`Error fetching data for tab ${tab}:`, error)
      toast({
        title: "Error",
        description: `Failed to load ${tab} data`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch issues posted by the user
  const fetchPostedIssues = async () => {
    try {
      if (supabase) {
        console.log("🔍 Fetching posted issues")
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (data && !error) {
          console.log(`🔍 Found ${data.length} posted issues`)
          setPostedIssues(data)
          return
        } else if (error) {
          console.error("Error fetching posted issues:", error)
        }
      }

      // Fall back to mock data
      console.log("🔍 Using mock data for posted issues")
      const mockPostedIssues = mockPosts.filter((post) => post.userId === user.id || post.user_id === user.id)
      setPostedIssues(mockPostedIssues)
    } catch (error) {
      console.error("Error in fetchPostedIssues:", error)
      throw error
    }
  }

  // Fetch issues fixed by the user
  const fetchFixedIssues = async () => {
    try {
      if (supabase) {
        console.log("🔍 Fetching fixed issues")
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("claimed_by", user.id)
          .eq("fixed", true)
          .order("fixed_at", { ascending: false })

        if (data && !error) {
          console.log(`🔍 Found ${data.length} fixed issues`)
          setFixedIssues(data)
          return
        } else if (error) {
          console.error("Error fetching fixed issues:", error)
        }
      }

      // Fall back to mock data
      console.log("🔍 Using mock data for fixed issues")
      const mockFixedIssues = mockPosts.filter(
        (post) => (post.claimed_by === user.id || post.claimedBy === user.id) && post.fixed === true,
      )
      setFixedIssues(mockFixedIssues)
    } catch (error) {
      console.error("Error in fetchFixedIssues:", error)
      throw error
    }
  }

  // Fetch activities for the user
  const fetchActivities = async () => {
    try {
      if (supabase) {
        console.log("🔍 Fetching user activities")

        // Get all posts related to the user (posted or claimed)
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (data && !error) {
          console.log(`🔍 Found ${data.length} posts for activities`)
          generateActivities(data)
          return
        } else if (error) {
          console.error("Error fetching activities:", error)
        }
      }

      // Fall back to mock data
      console.log("🔍 Using mock data for activities")
      const userPosts = mockPosts.filter((post) => post.userId === user.id || post.user_id === user.id)
      const claimedPosts = mockPosts.filter((post) => post.claimed_by === user.id || post.claimedBy === user.id)

      // Combine and deduplicate posts
      const allPosts = [...userPosts]
      claimedPosts.forEach((post) => {
        if (!allPosts.some((p) => p.id === post.id)) {
          allPosts.push(post)
        }
      })

      generateActivities(allPosts)
    } catch (error) {
      console.error("Error in fetchActivities:", error)
      throw error
    }
  }

  const generateActivities = (posts: Post[]) => {
    if (!user) return

    console.log("🔍 Generating activities from posts")
    const userActivities: ActivityItem[] = []

    // Posts created by the user
    posts
      .filter((post) => post.userId === user.id || post.user_id === user.id)
      .forEach((post) => {
        userActivities.push({
          id: `post-${post.id}`,
          type: "post",
          postId: post.id,
          postTitle: post.title,
          timestamp: new Date(post.createdAt || post.created_at),
        })
      })

    // Posts claimed by the user
    posts
      .filter((post) => post.claimed_by === user.id || post.claimedBy === user.id)
      .forEach((post) => {
        if (post.claimed_at || post.claimedAt) {
          userActivities.push({
            id: `claim-${post.id}`,
            type: "claim",
            postId: post.id,
            postTitle: post.title,
            timestamp: new Date(post.claimed_at || post.claimedAt),
          })
        }
      })

    // Posts fixed by the user
    posts
      .filter((post) => (post.claimed_by === user.id || post.claimedBy === user.id) && post.fixed === true)
      .forEach((post) => {
        if (post.fixed_at || post.fixedAt) {
          userActivities.push({
            id: `fix-${post.id}`,
            type: "fix",
            postId: post.id,
            postTitle: post.title,
            timestamp: new Date(post.fixed_at || post.fixedAt),
          })

          userActivities.push({
            id: `reward-${post.id}`,
            type: "reward",
            postId: post.id,
            postTitle: post.title,
            timestamp: new Date(post.fixed_at || post.fixedAt),
            amount: post.reward,
          })
        }
      })

    // Sort by timestamp (newest first)
    userActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    console.log(`🔍 Generated ${userActivities.length} activity items`)

    setActivities(userActivities)
  }

  if (loading || !user || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="mb-6"></div>

      <Card className="mb-6 border dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="relative w-16 h-16 mr-4 overflow-hidden rounded-full cursor-pointer"
                onClick={() => setShowAvatarSelector(true)}
              >
                <Image
                  src={profile.avatar_url || "/placeholder.svg?height=64&width=64"}
                  alt={profile.name || "User"}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-opacity hover:bg-opacity-30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 transition-opacity hover:opacity-100"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <Separator className="my-4 dark:bg-gray-800" />

          <div className="grid grid-cols-2 gap-4">
            <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="p-3 text-center border rounded-lg w-full h-auto dark:border-gray-800"
                  onClick={() => router.push("/wallet")}
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <div className="w-4 h-4 mr-1.5 relative">
                        <Image
                          src="/images/bitcoin-logo.png"
                          alt="Bitcoin"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                    </div>
                    <p className="text-xl font-bold">{formatSatsValue(profile.balance)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isPriceLoading ? "Loading..." : `$${calculateUsdValue(profile.balance)} USD`}
                    </p>
                  </div>
                </Button>
              </DialogTrigger>
            </Dialog>
            <div className="p-3 text-center border rounded-lg dark:border-gray-800">
              <p className="text-sm text-muted-foreground">Issues Fixed</p>
              <p className="text-xl font-bold">{fixedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posted" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 mb-4 dark:bg-gray-800/50">
          <TabsTrigger value="posted">Posted</TabsTrigger>
          <TabsTrigger value="fixing">Fixed</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="posted" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
              </div>
            </div>
          ) : postedIssues.length > 0 ? (
            postedIssues.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">You haven't posted any issues yet</p>
              <Button className="mt-4" onClick={() => router.push("/post/new")}>
                Post your first issue
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fixing" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
              </div>
            </div>
          ) : fixedIssues.length > 0 ? (
            fixedIssues.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">You haven't fixed any issues yet</p>
              <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                Find issues to fix
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
              </div>
            </div>
          ) : activities.length > 0 ? (
            activities.map((activity) => <ActivityCard key={activity.id} activity={activity} />)
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No activity yet</p>
              <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                Start exploring issues
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <div className="mt-8">
        <Button variant="outline" className="w-full dark:border-gray-700" onClick={signOut}>
          Log Out
        </Button>
      </div>

      <AvatarSelector isOpen={showAvatarSelector} onOpenChange={setShowAvatarSelector} />
    </div>
  )
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/post/${activity.postId}`)
  }

  // Format the date safely
  const formatDate = () => {
    try {
      if (!activity.timestamp) return "Recently"

      // Check if the date is valid
      if (isNaN(activity.timestamp.getTime())) return "Recently"

      return formatDistanceToNow(activity.timestamp, { addSuffix: true })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Recently"
    }
  }

  return (
    <Card className="cursor-pointer hover:bg-muted/50 border dark:border-gray-800" onClick={handleClick}>
      <CardContent className="p-4">
        <div className="flex items-start">
          <ActivityIcon type={activity.type} />
          <div className="ml-3 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <ActivityTitle activity={activity} />
                <p className="text-sm text-muted-foreground">{activity.postTitle}</p>
              </div>
              <div className="text-xs text-muted-foreground">{formatDate()}</div>
            </div>

            {activity.type === "reward" && activity.amount && (
              <Badge
                variant="outline"
                className="mt-2 flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/30"
              >
                <div className="w-3 h-3 relative">
                  <Image
                    src="/images/bitcoin-logo.png"
                    alt="Bitcoin"
                    width={12}
                    height={12}
                    className="object-contain"
                  />
                </div>
                +{formatSatsValue(activity.amount)}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityTitle({ activity }: { activity: ActivityItem }) {
  switch (activity.type) {
    case "post":
      return <p className="font-medium">You posted a new issue</p>
    case "claim":
      return <p className="font-medium">You claimed an issue</p>
    case "fix":
      return <p className="font-medium">You fixed an issue</p>
    case "reward":
      return <p className="font-medium">You received a reward</p>
    default:
      return <p className="font-medium">Activity</p>
  }
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "post":
      return (
        <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-950/50">
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
            className="text-blue-600 dark:text-blue-400"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </div>
      )
    case "claim":
      return (
        <div className="p-2 bg-purple-100 rounded-full dark:bg-purple-950/50">
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
            className="text-purple-600 dark:text-purple-400"
          >
            <path d="M11 12H3" />
            <path d="M16 6H3" />
            <path d="M16 18H3" />
            <path d="M18 6h.01" />
            <path d="M18 12h.01" />
            <path d="M18 18h.01" />
          </svg>
        </div>
      )
    case "fix":
      return (
        <div className="p-2 bg-emerald-100 rounded-full dark:bg-emerald-950/50">
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
            className="text-emerald-600 dark:text-emerald-400"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )
    case "reward":
      return (
        <div className="p-2 bg-amber-100 rounded-full dark:bg-amber-950/50">
          <div className="w-4 h-4 relative">
            <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={16} height={16} className="object-contain" />
          </div>
        </div>
      )
    default:
      return (
        <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800/50">
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
            className="text-gray-600 dark:text-gray-400"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      )
  }
}
