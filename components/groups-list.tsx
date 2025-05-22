"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateGroupDialog } from "@/components/create-group-dialog"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Group } from "@/lib/types"

export function GroupsList({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchGroups() {
      setLoading(true)
      try {
        // Fetch groups where the user is a member
        const { data: memberGroups, error: memberError } = await supabase
          .from("group_members")
          .select(`
            group_id,
            role,
            status,
            groups:group_id(
              id,
              name,
              description,
              created_by,
              created_at,
              updated_at,
              invite_code
            )
          `)
          .eq("user_id", userId)
          .eq("status", "approved")

        if (memberError) {
          console.error("Error fetching member groups:", memberError)
          throw memberError
        }

        // Transform the data to match the Group interface
        const transformedGroups = memberGroups
          .filter((item) => item.groups) // Filter out any null groups
          .map((item) => {
            const group = item.groups as any
            return {
              ...group,
              role: item.role,
              status: item.status,
            }
          })

        // Fetch member counts for each group
        const groupsWithCounts = await Promise.all(
          transformedGroups.map(async (group) => {
            const { count, error } = await supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id)
              .eq("status", "approved")

            return {
              ...group,
              memberCount: error ? 0 : count || 0,
            }
          }),
        )

        setGroups(groupsWithCounts)
      } catch (error) {
        console.error("Error in fetchGroups:", error)
        toast({
          title: "Error",
          description: "Failed to load groups. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchGroups()
    }
  }, [userId, supabase, toast])

  const handleGroupClick = (groupId: string) => {
    router.push(`/groups/${groupId}`)
  }

  const handleCreateSuccess = (newGroup: Group) => {
    setGroups((prev) => [newGroup, ...prev])
    setShowCreateDialog(false)
    toast({
      title: "Group Created",
      description: "Your new group has been created successfully.",
      variant: "success",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Your Groups</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
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
            className="mr-1"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          New Group
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <GroupSkeleton />
          <GroupSkeleton />
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleGroupClick(group.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{group.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </Badge>
                      {group.created_by === userId && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
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
                    className="text-muted-foreground"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg border-dashed">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-muted-foreground"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-muted-foreground mb-4">You haven't joined any groups yet</p>
          <Button onClick={() => setShowCreateDialog(true)}>Create Your First Group</Button>
        </div>
      )}

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        userId={userId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}

function GroupSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="w-full">
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}
