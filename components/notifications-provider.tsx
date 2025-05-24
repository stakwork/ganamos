"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

type NotificationsContextType = {
  pendingGroupRequests: number
  hasPendingRequests: boolean
  pendingGroupIds: string[]
  clearPendingForGroup: (groupId: string) => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  pendingGroupRequests: 0,
  hasPendingRequests: false,
  pendingGroupIds: [],
  clearPendingForGroup: () => {},
})

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()
  const router = useRouter()

  const [pendingGroupRequests, setPendingGroupRequests] = useState(0)
  const [pendingGroupIds, setPendingGroupIds] = useState<string[]>([])
  const [adminGroupIds, setAdminGroupIds] = useState<string[]>([])

  // Fetch initial pending requests
  useEffect(() => {
    if (!user) return

    async function fetchPendingRequests() {
      try {
        // First, get all groups where the user is an admin
        const { data: adminGroups, error: adminError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id)
          .eq("role", "admin")

        if (adminError) throw adminError

        if (!adminGroups?.length) return

        const groupIds = adminGroups.map((g) => g.group_id)
        setAdminGroupIds(groupIds)

        // Then, get all pending requests for those groups
        const { data: pendingData, error: pendingError } = await supabase
          .from("group_members")
          .select(`
            id,
            group_id,
            user_id,
            status,
            profile:user_id(name)
          `)
          .in("group_id", groupIds)
          .eq("status", "pending")

        if (pendingError) throw pendingError

        // Count total pending requests
        setPendingGroupRequests(pendingData?.length || 0)

        // Get unique group IDs with pending requests
        const uniqueGroupIds = [...new Set(pendingData?.map((item) => item.group_id) || [])]
        setPendingGroupIds(uniqueGroupIds)
      } catch (error) {
        console.error("Error fetching pending requests:", error)
      }
    }

    fetchPendingRequests()
  }, [user, supabase])

  // Set up realtime subscription for new join requests
  useEffect(() => {
    if (!user || !adminGroupIds.length) return

    console.log("Setting up realtime subscription for group join requests")

    const channel = supabase
      .channel("group-join-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_members",
          filter: `status=eq.pending`,
        },
        async (payload) => {
          const { group_id, user_id } = payload.new

          // Check if the current user is an admin of this group
          if (adminGroupIds.includes(group_id)) {
            // Fetch the requesting user's name
            let userName = "Someone"
            try {
              const { data: userData, error } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", user_id)
                .single()
              if (error) {
                console.error("Error fetching user profile:", error)
              } else {
                userName = userData?.name || "Someone"
              }
            } catch (error) {
              console.error("Failed to fetch user profile:", error)
            }

            // Show toast notification
            toast({
              title: "New Join Request",
              description: `${userName} has requested to join your group`,
              action: (
                <button
                  onClick={() => router.push(`/groups/${group_id}`)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 rounded-md px-3 text-xs"
                >
                  Review
                </button>
              ),
            })

            // Update pending counts
            setPendingGroupRequests((prev) => prev + 1)
            if (!pendingGroupIds.includes(group_id)) {
              setPendingGroupIds((prev) => [...prev, group_id])
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, adminGroupIds, supabase, toast, router])

  // Function to clear pending indicator for a specific group
  const clearPendingForGroup = (groupId: string) => {
    setPendingGroupIds((prev) => prev.filter((id) => id !== groupId))
    // Recalculate total pending count
    setPendingGroupRequests((prev) => Math.max(0, prev - 1))
  }

  return (
    <NotificationsContext.Provider
      value={{
        pendingGroupRequests,
        hasPendingRequests: pendingGroupRequests > 0,
        pendingGroupIds,
        clearPendingForGroup,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}
