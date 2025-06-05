"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@clerk/nextjs"
import { Camera } from "@/components/camera"

export default function PostPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const { user } = useUser()

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
        {post &&
          !post.fixed && // Only show actions if post is loaded and not fixed
          (user ? ( // Check if a user is logged in
            user.id === post.user_id ? (
              // Logged-in user is the owner of the post
              <div className="mt-4">
                {" "}
                {/* Wrapper for styling if needed */}
                <Button variant="outline" className="w-full">
                  Edit My Post
                </Button>{" "}
                {/* Replace with actual edit functionality */}
                {/* You might have other owner-specific buttons here */}
              </div>
            ) : (
              // Logged-in user is NOT the owner of the post
              <div className="mt-4">
                {" "}
                {/* Wrapper for styling if needed */}
                <Button onClick={() => setShowCamera(true)} className="w-full">
                  Submit Fix
                </Button>
              </div>
            )
          ) : (
            // No user is logged in (anonymous user)
            <div className="mt-4">
              {" "}
              {/* Wrapper for styling if needed */}
              <Button onClick={() => setShowCamera(true)} className="w-full">
                Submit Fix
              </Button>
            </div>
          ))}

        {/* Displaying "Fixed" status if the post is fixed */}
        {post && post.fixed && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded-md text-center">
            <p className="font-semibold text-green-700 dark:text-green-300">This issue has been fixed!</p>
            {/* You might want a button to view fix details here */}
          </div>
        )}
      </Card>
      <Camera isOpen={showCamera} onClose={() => setShowCamera(false)} postId={post.id} />
    </div>
  )
}
