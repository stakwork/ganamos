"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface AvatarSelectorProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AvatarSelector({ isOpen, onOpenChange }: AvatarSelectorProps) {
  const { profile, updateProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState("gallery")
  const [isUploading, setIsUploading] = useState(false)

  // Anime avatar options
  const animeAvatars = [
    "/images/avatars/anime-1.png",
    "/images/avatars/anime-2.png",
    "/images/avatars/anime-3.png",
    "/images/avatars/anime-4.png",
    "/images/avatars/anime-5.png",
    "/images/avatars/anime-6.png",
    "/images/avatars/anime-7.png",
    "/images/avatars/anime-8.png",
  ]

  const handleSelectAvatar = async (avatarUrl: string) => {
    try {
      setIsUploading(true)
      await updateProfile({ avatar_url: avatarUrl })

      toast({
        title: "Profile updated",
        description: "Your avatar has been updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating avatar:", error)
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)

      // In a real app, you would upload the file to storage
      // For now, we'll use a URL.createObjectURL as a placeholder
      const avatarUrl = URL.createObjectURL(file)

      await updateProfile({ avatar_url: avatarUrl })

      toast({
        title: "Profile updated",
        description: "Your avatar has been updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleTakePhoto = () => {
    router.push("/profile/camera")
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="gallery" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-4">
            <div className="grid grid-cols-4 gap-2">
              {animeAvatars.map((avatar, index) => (
                <div
                  key={index}
                  className="relative w-16 h-16 overflow-hidden rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleSelectAvatar(avatar)}
                >
                  <Image
                    src={avatar || "/placeholder.svg"}
                    alt={`Avatar option ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="camera" className="mt-4">
            <div className="flex flex-col items-center justify-center p-4">
              <div className="mb-4 text-center">
                <p>Take a new photo for your profile</p>
              </div>
              <Button onClick={handleTakePhoto} disabled={isUploading}>
                {isUploading ? "Processing..." : "Open Camera"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="flex flex-col items-center justify-center p-4">
              <div className="mb-4 text-center">
                <p>Upload a photo from your device</p>
              </div>
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  {isUploading ? "Uploading..." : "Choose File"}
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
