"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"

const AVATAR_OPTIONS = [
  "/images/avatars/anime-1.png",
  "/images/avatars/anime-2.png",
  "/images/avatars/anime-3.png",
  "/images/avatars/anime-4.png",
  "/images/avatars/anime-5.png",
  "/images/avatars/anime-6.png",
  "/images/avatars/anime-7.png",
  "/images/avatars/anime-8.png",
]

export function AddConnectedAccountDialog({
  open,
  onOpenChange,
  onAccountAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountAdded: () => void
}) {
  const [activeTab, setActiveTab] = useState("connect")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [childName, setChildName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuth()

  const handleConnect = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email address to connect",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Check if the email exists in profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, name")
        .eq("email", email)
        .single()

      if (profileError || !profileData) {
        toast({
          title: "User not found",
          description: "No user found with that email address",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Check if already connected
      const { data: existingConnection, error: connectionCheckError } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("primary_user_id", user?.id)
        .eq("connected_user_id", profileData.id)
        .single()

      if (existingConnection) {
        toast({
          title: "Already connected",
          description: `You're already connected to ${profileData.name}`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Create the connection
      const { error: connectionError } = await supabase.from("connected_accounts").insert({
        primary_user_id: user?.id,
        connected_user_id: profileData.id,
        created_at: new Date().toISOString(),
      })

      if (connectionError) {
        console.error("Error creating connection:", connectionError)
        toast({
          title: "Connection failed",
          description: "Could not connect to this account",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      toast({
        title: "Account connected",
        description: `Successfully connected to ${profileData.name}`,
      })

      // Reset form and close dialog
      setEmail("")
      onOpenChange(false)
      onAccountAdded()
    } catch (error) {
      console.error("Error connecting account:", error)
      toast({
        title: "Connection failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChildAccount = async () => {
    if (!childName) {
      toast({
        title: "Name required",
        description: "Please enter a name for the child account",
        variant: "destructive",
      })
      return
    }

    if (!selectedAvatar) {
      toast({
        title: "Avatar required",
        description: "Please select an avatar for the child account",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Call our server-side API to create the child account
      const response = await fetch("/api/child-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: childName,
          avatarUrl: selectedAvatar,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create child account")
      }

      toast({
        title: "Child account created",
        description: `Successfully created account for ${childName}`,
      })

      // Reset form and close dialog
      setChildName("")
      setSelectedAvatar("")
      onOpenChange(false)
      onAccountAdded()
    } catch (error: any) {
      console.error("Error creating child account:", error)
      toast({
        title: "Account creation failed",
        description: `Error creating child account: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Connected Account</DialogTitle>
          <DialogDescription>
            Connect to another account or create a child account to manage multiple profiles.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connect" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect">Connect Account</TabsTrigger>
            <TabsTrigger value="create">Create Child Account</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleConnect} disabled={isLoading}>
                {isLoading ? "Connecting..." : "Connect Account"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="childName">Child's Name</Label>
              <Input
                id="childName"
                placeholder="Enter name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Avatar</Label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_OPTIONS.map((avatar) => (
                  <div
                    key={avatar}
                    className={`relative w-16 h-16 rounded-full overflow-hidden cursor-pointer border-2 ${
                      selectedAvatar === avatar ? "border-primary" : "border-transparent"
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    <Image src={avatar || "/placeholder.svg"} alt="Avatar option" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCreateChildAccount} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Child Account"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
