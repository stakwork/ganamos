"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PostCard } from "@/components/post-card"
import { useAuth } from "@/components/auth-provider"
import { useNotifications } from "@/components/notifications-provider"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import type { Group, GroupMember, Post } from "@/lib/types"

export default function GroupPage({ params }: { params: { id: string } }) {
  const { id: groupId } = params
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()
  const { clearPendingForGroup } = useNotifications()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userStatus, setUserStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("posts")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteUrl, setInviteUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [copiedGroupCode, setCopiedGroupCode] = useState(false)

  useEffect(() => {
    if (!user) return

    async function fetchGroupData() {
      // Validate that groupId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(groupId)) {
        console.error("Invalid group ID format:", groupId)
        toast({
          title: "Invalid Group",
          description: "The group link is invalid or malformed.",
          variant: "destructive",
        })
        router.push("/profile")
        return
      }

      setLoading(true)
      try {
        // Fetch group details
        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select("*")
          .eq("id", groupId)
          .single()

        if (groupError) {
          console.error("Error fetching group:", groupError)
          if (groupError.code === "PGRST116") {
            // Group not found
            toast({
              title: "Group not found",
              description: "The group you're looking for doesn't exist or has been deleted.",
              variant: "destructive",
            })
            router.push("/profile")
            return
          }
          throw groupError
        }

        setGroup(groupData)

        // Check user membership and role
        const { data: memberData, error: memberError } = await supabase
          .from("group_members")
          .select("*")
          .eq("group_id", groupId)
          .eq("user_id", user.id)
          .single()

        if (memberError && memberError.code !== "PGRST116") {
          console.error("Error checking membership:", memberError)
          throw memberError
        }

        if (memberData) {
          setUserRole(memberData.role)
          setUserStatus(memberData.status)
        }

        // If user is approved member, fetch other data
        if (memberData && memberData.status === "approved") {
          // Fetch approved members
          const { data: approvedMembers, error: approvedError } = await supabase
            .from("group_members")
            .select(`
              id,
              group_id,
              user_id,
              role,
              status,
              created_at,
              updated_at,
              profile:user_id(name, avatar_url, email)
            `)
            .eq("group_id", groupId)
            .eq("status", "approved")

          if (approvedError) {
            console.error("Error fetching members:", approvedError)
            throw approvedError
          }

          setMembers(approvedMembers)

          // If user is admin, fetch pending members
          if (memberData.role === "admin") {
            const { data: pendingData, error: pendingError } = await supabase
              .from("group_members")
              .select(`
                id,
                group_id,
                user_id,
                role,
                status,
                created_at,
                updated_at,
                profile:user_id(name, avatar_url, email)
              `)
              .eq("group_id", groupId)
              .eq("status", "pending")

            if (pendingError) {
              console.error("Error fetching pending members:", pendingError)
              throw pendingError
            }

            setPendingMembers(pendingData)

            // If there are pending members and we're viewing the members tab,
            // clear the notification for this group
            if (pendingData.length > 0 && activeTab === "members") {
              clearPendingForGroup(groupId)
            }
          }

          // Fetch group posts
          const { data: postsData, error: postsError } = await supabase
            .from("posts")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })

          if (postsError) {
            console.error("Error fetching posts:", postsError)
            throw postsError
          }

          setPosts(postsData)
        }

        // Generate invite URL
        if (groupData) {
          const baseUrl = window.location.origin
          setInviteUrl(`${baseUrl}/groups/join/${groupData.invite_code}`)
        }
      } catch (error) {
        console.error("Error in fetchGroupData:", error)
        toast({
          title: "Error",
          description: "Failed to load group data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGroupData()
  }, [groupId, user, supabase, router, toast, activeTab, clearPendingForGroup])

  // Clear notification when switching to members tab
  useEffect(() => {
    if (activeTab === "members" && pendingMembers.length > 0 && userRole === "admin") {
      clearPendingForGroup(groupId)
    }
  }, [activeTab, pendingMembers.length, userRole, groupId, clearPendingForGroup])

  const handleJoinRequest = async () => {
    if (!user || !group) return

    try {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setUserStatus("pending")
      toast({
        title: "Request Sent",
        description: "Your request to join this group has been sent to the admin.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error sending join request:", error)
      toast({
        title: "Error",
        description: "Failed to send join request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMemberAction = async (memberId: string, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        const { error } = await supabase
          .from("group_members")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", memberId)

        if (error) throw error

        // Update UI
        setPendingMembers((prev) => prev.filter((member) => member.id !== memberId))
        const approvedMember = pendingMembers.find((member) => member.id === memberId)
        if (approvedMember) {
          setMembers((prev) => [...prev, { ...approvedMember, status: "approved" }])
        }

        toast({
          title: "Member Approved",
          description: "The member has been approved and added to the group.",
          variant: "success",
        })
      } else {
        const { error } = await supabase
          .from("group_members")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", memberId)

        if (error) throw error

        // Update UI
        setPendingMembers((prev) => prev.filter((member) => member.id !== memberId))

        toast({
          title: "Member Rejected",
          description: "The member request has been rejected.",
          variant: "success",
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing member:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} member. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyGroupCode = () => {
    if (group?.group_code) {
      navigator.clipboard.writeText(group.group_code)
      setCopiedGroupCode(true)
      setTimeout(() => setCopiedGroupCode(false), 2000)
    }
  }

  const handleCreatePost = () => {
    // Store the group ID in localStorage to use in the post creation flow
    localStorage.setItem("selectedGroupId", groupId)
    router.push("/post/new")
  }

  if (loading) {
    return (
      <div className="container px-4 py-6 mx-auto max-w-md">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container px-4 py-6 mx-auto max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group Not Found</h1>
          <p className="mb-4">The group you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push("/profile")}>Go to Profile</Button>
        </div>
      </div>
    )
  }

  // User is not a member or pending
  if (!userStatus) {
    return (
      <div className="container px-4 py-6 mx-auto max-w-md">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
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
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Join Group</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">{group.name}</h2>
              {group.description && <p className="text-muted-foreground">{group.description}</p>}
            </div>
            <Button className="w-full" onClick={handleJoinRequest}>
              Request to Join Group
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User has a pending request
  if (userStatus === "pending") {
    return (
      <div className="container px-4 py-6 mx-auto max-w-md">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
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
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Pending Approval</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-6">
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
                className="mx-auto mb-4 text-yellow-500"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <h2 className="text-xl font-bold mb-2">{group.name}</h2>
              <p className="text-muted-foreground mb-4">
                Your request to join this group is pending approval from the admin.
              </p>
              <Button variant="outline" onClick={() => router.push("/profile")}>
                Return to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is an approved member
  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="sr-only">Back</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold truncate">{group.name}</h1>
          {userRole === "admin" && group.group_code && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Code:</span>
              <button
                onClick={copyGroupCode}
                className="font-mono text-sm font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {group.group_code}
              </button>
              {copiedGroupCode && <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>}
            </div>
          )}
        </div>
        {userRole === "admin" && (
          <Button variant="outline" size="icon" onClick={() => setShowInviteDialog(true)}>
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
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="sr-only">Share</span>
          </Button>
        )}
      </div>

      <Tabs defaultValue="members" className="w-full" onValueChange={setActiveTab}>



        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Members ({members.length})</h2>
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="relative w-10 h-10 mr-3 overflow-hidden rounded-full">
                      <Image
                        src={member.profile?.avatar_url || "/placeholder.svg?height=40&width=40"}
                        alt={member.profile?.name || "Member"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{member.profile?.name || "Unknown Member"}</p>
                      <div className="flex items-center gap-2">
                        {member.role === "admin" && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-xs">
                            Admin
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {userRole === "admin" && pendingMembers.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-medium">Pending Requests ({pendingMembers.length})</h3>
                {pendingMembers.map((member) => (
                  <Card key={member.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="relative w-10 h-10 mr-3 overflow-hidden rounded-full">
                            <Image
                              src={member.profile?.avatar_url || "/placeholder.svg?height=40&width=40"}
                              alt={member.profile?.name || "Member"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{member.profile?.name || "Unknown Member"}</p>
                            <p className="text-xs text-muted-foreground">
                              Requested {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleMemberAction(member.id, "reject")}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleMemberAction(member.id, "approve")}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Group</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Group Code</p>
              <p className="text-sm text-muted-foreground mb-3">
                Share this 4-character code for easy group discovery:
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-center">
                  <span className="font-mono text-2xl font-bold tracking-widest">{group?.group_code}</span>
                </div>
                <Button size="sm" onClick={copyGroupCode}>
                  {copiedGroupCode ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Invite Link</p>
              <p className="text-sm text-muted-foreground mb-3">Or share this direct link:</p>
              <div className="flex items-center space-x-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button size="sm" onClick={copyInviteLink}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
