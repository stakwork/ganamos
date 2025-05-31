"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Post } from "@/components/post"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { Group, Post as PostType, Profile } from "@/lib/database.types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { PendingFix } from "@/lib/database.types"

interface Activity {
  id: string
  created_at: string
  type: string
  post_id: string
  post_title: string
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  })
}

const ProfilePage = () => {
  const { data: session } = useSession()
  const user = session?.user
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingFix[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const [date, setDate] = useState<Date | undefined>(new Date())

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        setProfile(profileData)
      } catch (error: any) {
        console.error("Error fetching profile:", error.message)
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        })
      }
    }

    const fetchUserPosts = async () => {
      try {
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (postsError) {
          throw postsError
        }

        setPosts(postsData)
      } catch (error: any) {
        console.error("Error fetching posts:", error.message)
      }
    }

    const fetchUserGroups = async () => {
      try {
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("*")
          .contains("members", [user.id])

        if (groupsError) {
          throw groupsError
        }

        setUserGroups(groupsData || [])
      } catch (error: any) {
        console.error("Error fetching groups:", error.message)
      }
    }

    const fetchActivity = async () => {
      try {
        const { data, error } = await supabase
          .from("activity")
          .select(`*, posts (title)`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        const enrichedActivity = data.map((item) => ({
          id: item.id,
          created_at: item.created_at,
          type: item.type,
          post_id: item.post_id,
          post_title: (item.posts as { title: string })?.title || "Unknown Post",
        }))

        setActivity(enrichedActivity)
      } catch (error: any) {
        console.error("Error fetching activity:", error.message)
      }
    }

    const fetchPendingReviews = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("pending_fixes")
          .select(`
            *,
            post:posts!inner(title, user_id),
            fixer_profile:profiles!fixer_id(name, avatar_url)
          `)
          .eq("post.user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })

        if (error) throw error
        setPendingReviews(data || [])
      } catch (error) {
        console.error("Error fetching pending reviews:", error)
      }
    }

    fetchProfile()
    fetchUserPosts()
    fetchUserGroups()
    fetchPendingReviews()
    fetchActivity()
    setLoading(false)
  }, [session?.user, user?.id, toast])

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-4">
        <p>Could not load profile.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.name} />
            <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold">{profile.name}</h2>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
        </div>
        <Button onClick={() => router.push("/account")}>Edit Profile</Button>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="reviews" className="relative">
            Reviews
            {pendingReviews.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {pendingReviews.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Activity</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date.toString()) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <ScrollArea className="h-[400px] w-full rounded-md border">
            {activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="p-4">
                {activity.map((item) => (
                  <Card key={item.id} className="mb-4">
                    <CardContent>
                      <p className="font-semibold">{item.type}</p>
                      <p className="text-sm text-muted-foreground">Post: {item.post_title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Groups</h3>
            <Button size="sm" onClick={() => router.push("/groups/create")}>
              Create Group
            </Button>
          </div>
          {userGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Not part of any groups yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userGroups.map((group) => (
                <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{group.name}</h4>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pending Reviews</h3>
            {pendingReviews.length > 0 && <Badge variant="secondary">{pendingReviews.length}</Badge>}
          </div>

          {pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pending fix reviews</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <Card key={review.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{review.post.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Fix submitted by {review.fixer_profile.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant={review.confidence_score >= 7 ? "default" : "secondary"}>
                            AI Confidence: {review.confidence_score}/10
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => router.push(`/review/${review.id}`)}>
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfilePage
