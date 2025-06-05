"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@clerk/nextjs"
import { Camera } from "@/components/camera"
import { BitcoinIcon as BitcoinLogo } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

function formatSatsValue(value: number) {
  return value.toLocaleString()
}

export default function PostPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const { user } = useUser()
  const [fixerProfile, setFixerProfile] = useState(null)

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/posts/${id}`)
        if (!response.ok) {
          router.push("/404")
          return
        }
        const data = await response.json()
        setPost(data)
      } catch (error) {
        console.error("Failed to fetch post:", error)
        router.push("/500")
      }
    }

    if (id) {
      fetchPost()
    }
  }, [id, router])

  useEffect(() => {
    async function fetchFixerProfile() {
      if (post?.fixed_by) {
        try {
          const response = await fetch(`/api/users/${post.fixed_by}`)
          if (response.ok) {
            const data = await response.json()
            setFixerProfile(data)
          } else {
            console.error("Failed to fetch fixer profile")
          }
        } catch (error) {
          console.error("Error fetching fixer profile:", error)
        }
      }
    }

    fetchFixerProfile()
  }, [post?.fixed_by])

  const getFixerInitials = () => {
    if (!fixerProfile?.name) return ""
    const nameParts = fixerProfile.name.split(" ")
    return nameParts.map((part) => part[0].toUpperCase()).join("")
  }

  const formatFixerName = () => {
    return fixerProfile?.name || "Anonymous"
  }

  const handleCaptureFixImage = async (image: string | null) => {
    console.log("Captured image:", image)
  }

  if (!post) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
          <CardDescription>Posted by {post.author}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{post.content}</p>
        </CardContent>
        {/* Only show the reward card if not under review by the post creator */}
        {!(
          post.under_review &&
          post.submitted_fix_image_url &&
          user &&
          (post.userId === user.id || post.user_id === user.id)
        ) && (
          <Card className="mb-6 border dark:border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 mr-3 bg-amber-100 rounded-full dark:bg-amber-950/50">
                    <BitcoinLogo size={20} />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <p className="text-2xl font-bold mr-2">{formatSatsValue(post.reward)}</p>
                    </div>
                    <p className="font-medium text-sm text-muted-foreground">Reward</p>
                    {post.fixed &&
                      post.fixed_by && ( // This part remains the same, shows who fixed it if applicable
                        <div className="flex items-center mt-1">
                          <p className="text-xs text-muted-foreground mr-1">Earned by</p>
                          <div className="flex items-center">
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarImage
                                src={fixerProfile?.avatar_url || "/placeholder.svg"}
                                alt={fixerProfile?.name || "User"}
                              />
                              <AvatarFallback>{getFixerInitials()}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{formatFixerName()}</span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* --- MODIFIED SECTION FOR "SUBMIT FIX" BUTTON --- */}
                {!post.fixed && <Button onClick={() => setShowCamera(true)}>Submit Fix</Button>}

                {post.fixed && ( // If the post IS fixed
                  <Badge
                    variant="outline"
                    className="px-3 py-1 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-800/30"
                  >
                    Fixed
                  </Badge>
                )}
                {/* --- END OF MODIFIED SECTION --- */}
              </div>
            </CardContent>
          </Card>
        )}
      </Card>
      <Camera isOpen={showCamera} onClose={() => setShowCamera(false)} postId={post.id} />
    </div>
  )
}
