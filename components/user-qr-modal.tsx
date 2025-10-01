"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import QRCode from "@/components/qr-code"
import { Copy } from "lucide-react"

interface UserQRModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserQRModal({ open, onOpenChange }: UserQRModalProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  // Generate QR code data - using username for account connection
  const qrData = profile?.username || user?.id || ""

  const handleCopyUsername = () => {
    const dataToCopy = profile?.username || user?.id || ""
    if (dataToCopy) {
      navigator.clipboard.writeText(dataToCopy)
      toast({
        title: "Copied!",
        description: profile?.username ? "Your username has been copied to clipboard." : "Your account ID has been copied to clipboard.",
        duration: 2000,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">My QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* User Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold">{profile?.name || "User"}</h3>
            <p className="text-sm text-gray-500">Share this QR code to connect accounts</p>
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white rounded-lg">
            <QRCode 
              data={qrData}
              size={200}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </div>

          {/* Username/Account ID with Copy Button */}
          <div className="w-full space-y-2">
            <p className="text-xs text-gray-500 text-center">
              {profile?.username ? "Username:" : "Account ID:"}
            </p>
            <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
              <code className="flex-1 text-xs font-mono truncate">
                {profile?.username || user?.id || ""}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUsername}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p>Others can scan this QR code or enter your {profile?.username ? "username" : "Account ID"}</p>
            <p>to connect their account to yours as a family member.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
