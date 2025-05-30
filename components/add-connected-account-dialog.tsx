"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface AddConnectedAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountAdded: () => void
}

export function AddConnectedAccountDialog({ open, onOpenChange, onAccountAdded }: AddConnectedAccountDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showChildAccountForm, setShowChildAccountForm] = useState(false)
  const [childUsername, setChildUsername] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const { user } = useAuth()
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()

  // Studio Ghibli-style animal avatar options (7 images + camera option)
  const ghibliAvatars = [
    "/images/avatars/ghibli-1.png", // Fox
    "/images/avatars/ghibli-2.png", // Bunny
    "/images/avatars/ghibli-3.png", // Owl
    "/images/avatars/ghibli-4.png", // Cat
    "/images/avatars/ghibli-5.png", // Deer
    "/images/avatars/ghibli-6.png", // Bear
    "/images/avatars/ghibli-7.png", // Swan
  ]

  const handleGoogleConnect = async () => {
    setIsLoading(true)
    try {
      // For now, show a message that this feature is coming soon
      toast({
        title: "Coming Soon",
        description: "Google account connection will be available soon. Please use email/password for now.",
      })
    } catch (error) {
      console.error("Error connecting Google account:", error)
      toast({
        title: "Error",
        description: "Failed to connect Google account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      // First, try to sign in with the provided credentials to verify they're valid
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        toast({
          title: "Invalid Credentials",
          description: "The email or password is incorrect.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Get the user profile for the connected account
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single()

      if (profileError || !profileData) {
        toast({
          title: "Account Not Found",
          description: "No profile found for this email address.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Check if this account is already connected
      const { data: existingConnection } = await supabase
        .from("connected_accounts")
        .select("id")
        .eq("primary_user_id", user.id)
        .eq("connected_user_id", profileData.id)
        .single()

      if (existingConnection) {
        toast({
          title: "Already Connected",
          description: "This account is already connected to your profile.",
        })
        setIsLoading(false)
        return
      }

      // Create the connection
      const { error: connectionError } = await supabase.from("connected_accounts").insert({
        primary_user_id: user.id,
        connected_user_id: profileData.id,
      })

      if (connectionError) {
        throw connectionError
      }

      toast({
        title: "Account Connected",
        description: `Successfully connected ${profileData.name}'s account.`,
      })

      // Reset form and close dialog
      setEmail("")
      setPassword("")
      setShowEmailForm(false)
      onOpenChange(false)
      onAccountAdded()
    } catch (error) {
      console.error("Error connecting account:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect the account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChildAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      // Call the API route to create the child account
      const response = await fetch("/api/child-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: childUsername,
          avatarUrl: selectedAvatar,
          primaryUserId: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create child account")
      }

      toast({
        title: "Child Account Created",
        description: `Successfully created ${result.username}'s account.`,
      })

      // Reset form and close dialog
      setChildUsername("")
      setSelectedAvatar("")
      setShowChildAccountForm(false)
      onOpenChange(false)
      onAccountAdded()
    } catch (error) {
      console.error("Error creating child account:", error)
      toast({
        title: "Creation Failed",
        description: "Failed to create the child account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // In a real app, you would upload the file to storage
      // For now, we'll use a URL.createObjectURL as a placeholder
      const avatarUrl = URL.createObjectURL(file)
      setSelectedAvatar(avatarUrl)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setEmail("")
    setPassword("")
    setShowEmailForm(false)
    setShowChildAccountForm(false)
    setChildUsername("")
    setSelectedAvatar("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Connected Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showChildAccountForm ? (
            <form onSubmit={handleCreateChildAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="child-username">Username</Label>
                <Input
                  id="child-username"
                  type="text"
                  placeholder="Enter username"
                  value={childUsername}
                  onChange={(e) => setChildUsername(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Choose Avatar</Label>
                <div className="grid grid-cols-4 gap-2">
                  {ghibliAvatars.map((avatar, index) => (
                    <div
                      key={index}
                      className={`relative w-16 h-16 overflow-hidden rounded-full cursor-pointer border-2 transition-all ${
                        selectedAvatar === avatar
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedAvatar(avatar)}
                    >
                      <Image
                        src={avatar || "/placeholder.svg"}
                        alt={`Studio Ghibli animal avatar ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ))}

                  {/* Camera option as 8th slot */}
                  <label
                    htmlFor="child-avatar-upload"
                    className={`relative w-16 h-16 overflow-hidden rounded-full cursor-pointer border-2 transition-all flex items-center justify-center bg-gray-100 hover:bg-gray-200 ${
                      selectedAvatar && !ghibliAvatars.includes(selectedAvatar)
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600"
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <input
                      id="child-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                {selectedAvatar && !ghibliAvatars.includes(selectedAvatar) && (
                  <p className="text-sm text-green-600">Custom photo selected</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowChildAccountForm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !selectedAvatar || !childUsername.trim()}
                  className="flex-1"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          ) : showEmailForm ? (
            <form onSubmit={handleEmailConnect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="connect-email">Email</Label>
                <Input
                  id="connect-email"
                  type="email"
                  placeholder="their@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="connect-password">Password</Label>
                <Input
                  id="connect-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Connecting..." : "Connect Account"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Button
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleConnect}
                disabled={isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Connect with Google
              </Button>

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
              >
                Connect with Email
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowChildAccountForm(true)}
                disabled={isLoading}
              >
                Create Child Account
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
