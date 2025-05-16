"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Post } from "@/lib/types"
import { formatSatsValue } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createBrowserSupabaseClient } from "@/lib/supabase"

export function PostCard({ post }: { post: Post }) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const [profileName, setProfileName] = useState<string>("")
  const [profileAvatar, setProfileAvatar] = useState<string>("")
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const postUserId = post.userId || post.user_id
        if (!postUserId) {
          setIsLoadingProfile(false)
          return
        }

        setUserId(postUserId)

        const supabase = createBrowserSupabaseClient()
        const { data, error } = await supabase.from("profiles").select("name, avatar_url").eq("id", postUserId).single()

        if (error) {
          console.error("Error fetching profile:", error)
          setIsLoadingProfile(false)
          return
        }

        if (data) {
          // Format name as first name and last initial
          const nameParts = data.name?.split(" ") || []
          const firstName = nameParts[0] || ""
          const lastInitial = nameParts.length > 1 ? `${nameParts[nameParts.length - 1].charAt(0)}.` : ""
          setProfileName(`${firstName} ${lastInitial}`)
          setProfileAvatar(data.avatar_url || "")
        }
        setIsLoadingProfile(false)
      } catch (error) {
        console.error("Error in fetchProfileData:", error)
        setIsLoadingProfile(false)
      }
    }

    fetchProfileData()
  }, [post.userId, post.user_id])

  const handleClick = () => {
    router.push(`/post/${post.id}`)
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the card click
    if (userId) {
      router.push(`/profile/${userId}`)
    }
  }

  // Format the date safely
  const formatDate = () => {
    try {
      // Check if createdAt exists and is valid
      if (!post.createdAt && !post.created_at) return "Recently"

      const date = new Date(post.createdAt || post.created_at)

      // Check if the date is valid
      if (isNaN(date.getTime())) return "Recently"

      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Recently"
    }
  }

  // Get the image URL, handling both imageUrl and image_url properties
  const getImageUrl = () => {
    return post.imageUrl || post.image_url || "/placeholder.svg"
  }

  const getInitials = () => {
    if (!profileName) return "U"
    return profileName
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
  }

  return (
    <Card className="overflow-hidden border dark:border-gray-800">
      <div className="relative w-full h-48 cursor-pointer" onClick={handleClick}>
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
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
              className="text-gray-400"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        ) : (
          <img
            src={getImageUrl() || "/placeholder.svg"}
            alt={post.description}
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant={post.fixed ? "outline" : "default"}
            className={
              post.fixed
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100 dark:hover:bg-emerald-900"
                : "flex items-center gap-1"
            }
          >
            {post.fixed ? (
              "Fixed"
            ) : (
              <>
                <div className="w-3 h-3 relative">
                  <Image
                    src="/images/bitcoin-logo.png"
                    alt="Bitcoin"
                    width={12}
                    height={12}
                    className="object-contain"
                  />
                </div>
                {formatSatsValue(post.reward)}
              </>
            )}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div>
            <p className="text-sm line-clamp-3" onClick={handleClick}>
              {post.description}
            </p>
          </div>

          {/* Profile info row */}
          <div className="flex items-center">
            <div className="flex items-center cursor-pointer hover:opacity-80" onClick={handleProfileClick}>
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={profileAvatar || "/placeholder.svg"} alt={profileName || "User"} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {isLoadingProfile ? "Loading..." : profileName || "Anonymous"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 text-muted-foreground"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-xs text-muted-foreground">{formatDate()}</span>
            </div>

            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 text-muted-foreground"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-xs text-muted-foreground">{post.location}</span>
            </div>
          </div>

          {!post.fixed && (
            <Button size="sm" variant="outline" onClick={handleClick} className="dark:border-gray-700">
              View Details
            </Button>
          )}

          {post.fixed && (
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800/30 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50"
            >
              Completed
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
