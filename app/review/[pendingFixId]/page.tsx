"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { ArrowLeft, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { PendingFix, Post } from "@/lib/database.types"

interface PendingFixWithPost extends PendingFix {
  post: Post
  fixer_profile: {
    name: string
    avatar_url: string | null
  }
}

export default function ReviewPage({ params }: { params: { pendingFixId: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createBrowserSupabaseClient()

  const [pendingFix, setPendingFix] = useState<PendingFixWithPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    fetchPendingFix()
  }, [user, params.pendingFixId])

  const fetchPendingFix = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_fixes")
        .select(`
          *,
          post:posts(*),
          fixer_profile:profiles!fixer_id(name, avatar_url)
        `)
        .eq("id", params.pendingFixId)
        .eq("status", "pending")
        .single()

      if (error) throw error

      // Check if user is the original poster
      if (data.post.user_id !== user.id) {
        toast({
          title: "Access Denied",
          description: "You can only review fixes for your own posts",
          variant: "destructive",
        })
        router.push("/profile")
        return
      }

      setPendingFix(data)
    } catch (error) {
      console.error("Error fetching pending fix:", error)
      toast({
        title: "Error",
        description: "Failed to load pending fix",
        variant: "destructive",
      })
      router.push("/profile")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!pendingFix) return

    setProcessing(true)
    try {
      // Start transaction-like operations
      const { error: updatePostError } = await supabase
        .from("posts")
        .update({
          fixed: true,
          fixed_at: new Date().toISOString(),
          fixed_by: pendingFix.fixer_id,
          fixed_image_url: pendingFix.fix_image_url,
          fixer_note: pendingFix.fixer_note,
        })
        .eq("id", pendingFix.post_id)

      if (updatePostError) throw updatePostError

      // Update fixer's balance
      const { error: balanceError } = await supabase.rpc("increment_balance", {
        user_id: pendingFix.fixer_id,
        amount: pendingFix.post.reward,
      })

      if (balanceError) throw balanceError

      // Increment fixed issues count
      const { error: countError } = await supabase.rpc("increment_fixed_count", {
        user_id: pendingFix.fixer_id,
      })

      if (countError) throw countError

      // Update pending fix status
      const { error: pendingError } = await supabase
        .from("pending_fixes")
        .update({ status: "approved" })
        .eq("id", params.pendingFixId)

      if (pendingError) throw pendingError

      toast({
        title: "Fix Approved",
        description: "The fix has been approved and sats have been released to the fixer",
        variant: "success",
      })

      router.push("/profile")
    } catch (error) {
      console.error("Error approving fix:", error)
      toast({
        title: "Error",
        description: "Failed to approve fix. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!pendingFix) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from("pending_fixes")
        .update({ status: "rejected" })
        .eq("id", params.pendingFixId)

      if (error) throw error

      toast({
        title: "Fix Rejected",
        description: "The fix has been rejected",
      })

      router.push("/profile")
    } catch (error) {
      console.error("Error rejecting fix:", error)
      toast({
        title: "Error",
        description: "Failed to reject fix. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!pendingFix) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pending Fix Not Found</h1>
          <Button onClick={() => router.push("/profile")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 pb-20">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/profile")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        <h1 className="text-2xl font-bold mb-2">Review Fix Submission</h1>
        <p className="text-muted-foreground">
          Review this fix submission for your post and decide whether to approve or reject it.
        </p>
      </div>

      <div className="space-y-6">
        {/* Original Post Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">{pendingFix.post.title}</h3>
            <p className="text-muted-foreground mb-4">{pendingFix.post.description}</p>
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={pendingFix.post.image_url || "/placeholder.svg"}
                alt="Original issue"
                fill
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fix Submission Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Fix Submission
              <div className="flex items-center gap-2">
                <Badge variant={pendingFix.confidence_score >= 7 ? "default" : "secondary"}>
                  AI Confidence: {pendingFix.confidence_score}/10
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Submitted by: <span className="font-medium">{pendingFix.fixer_profile.name}</span>
              </p>
              {pendingFix.fixer_note && (
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Fixer's Note:</h4>
                  <p className="text-sm text-muted-foreground">{pendingFix.fixer_note}</p>
                </div>
              )}
            </div>

            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={pendingFix.fix_image_url || "/placeholder.svg"}
                alt="Fix submission"
                fill
                className="object-cover"
              />
            </div>

            {pendingFix.ai_reasoning && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium mb-1 text-sm">AI Analysis:</h4>
                <p className="text-sm text-muted-foreground">{pendingFix.ai_reasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={handleApprove} disabled={processing} className="flex-1 bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-2" />
            {processing ? "Approving..." : `Approve & Release ${pendingFix.post.reward} sats`}
          </Button>

          <Button onClick={handleReject} disabled={processing} variant="destructive" className="flex-1">
            <X className="w-4 h-4 mr-2" />
            {processing ? "Rejecting..." : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  )
}
