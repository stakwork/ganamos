"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Cat, Dog, Rabbit, Squirrel, Turtle, Trash2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function PetSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [device, setDevice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUnpairing, setIsUnpairing] = useState(false)
  const [showUnpairDialog, setShowUnpairDialog] = useState(false)
  
  // Form state
  const [petName, setPetName] = useState("")
  const [petType, setPetType] = useState<'cat' | 'dog' | 'rabbit' | 'squirrel' | 'turtle'>('cat')
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch device data
  const fetchDevice = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/device/list')
      const data = await response.json()

      if (data.success && data.devices && data.devices.length > 0) {
        const firstDevice = data.devices[0]
        setDevice(firstDevice)
        setPetName(firstDevice.pet_name || "")
        setPetType(firstDevice.pet_type || 'cat')
      } else {
        // No device connected, redirect to connect page
        toast({
          title: "No Pet Connected",
          description: "Please connect a pet first.",
          variant: "destructive",
        })
        router.push('/connect-pet')
      }
    } catch (error) {
      console.error('Error fetching device:', error)
      toast({
        title: "Error",
        description: "Failed to load pet settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    fetchDevice()
  }, [fetchDevice])

  // Check if there are unsaved changes
  useEffect(() => {
    if (device) {
      const nameChanged = petName !== (device.pet_name || "")
      const typeChanged = petType !== (device.pet_type || 'cat')
      setHasChanges(nameChanged || typeChanged)
    }
  }, [petName, petType, device])

  const getPetIcon = (type: string, size: number = 80) => {
    const iconProps = { size, color: "white", strokeWidth: 1.5 }
    switch (type) {
      case 'dog': return <Dog {...iconProps} />
      case 'rabbit': return <Rabbit {...iconProps} />
      case 'squirrel': return <Squirrel {...iconProps} />
      case 'turtle': return <Turtle {...iconProps} />
      default: return <Cat {...iconProps} />
    }
  }

  const handleSave = async () => {
    if (!device || !petName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a pet name.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/device/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          petName: petName.trim(),
          petType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Your pet settings have been updated.",
          variant: "success",
          duration: 2000,
        })
        // Update local device state
        setDevice({ ...device, pet_name: petName.trim(), pet_type: petType })
        setHasChanges(false)
      } else {
        toast({
          title: "Save Failed",
          description: result.error || "Failed to update settings.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUnpair = async () => {
    if (!device) return

    setIsUnpairing(true)
    try {
      const response = await fetch('/api/device/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Pet Unpaired",
          description: "Your device has been disconnected.",
          variant: "success",
          duration: 2000,
        })
        // Redirect to profile
        router.push('/profile')
      } else {
        toast({
          title: "Unpair Failed",
          description: result.error || "Failed to unpair device.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error unpairing device:', error)
      toast({
        title: "Error",
        description: "Failed to unpair device. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUnpairing(false)
      setShowUnpairDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pet settings...</p>
        </div>
      </div>
    )
  }

  if (!device) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with X button */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Pet Settings</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/profile')}
            className="hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-8">
        {/* Pet Visual */}
        <div className="text-center space-y-4 pt-4">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
            {getPetIcon(petType)}
          </div>
          <div>
            <p className="text-lg font-medium">{petName || "Your Pet"}</p>
            <p className="text-sm text-muted-foreground">Pairing Code: {device.pairing_code}</p>
          </div>
        </div>

        {/* Pet Name Input */}
        <div className="space-y-2">
          <Label htmlFor="petName">Pet Name</Label>
          <Input
            id="petName"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Enter your pet's name..."
            className="text-lg"
            maxLength={30}
          />
        </div>

        {/* Pet Type Selection */}
        <div className="space-y-3">
          <Label>Pet Type</Label>
          <div className="grid grid-cols-5 gap-3">
            {(['cat', 'dog', 'rabbit', 'squirrel', 'turtle'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPetType(type)}
                className={`p-4 rounded-lg border-2 transition-all relative ${
                  petType === type 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-center">
                  {getPetIcon(type, 32)}
                </div>
                {petType === type && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            Selected: {petType}
          </p>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !petName.trim()}
            className="w-full h-12"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              "Save Changes"
            )}
          </Button>
        )}

        {/* Danger Zone */}
        <div className="pt-8 space-y-4">
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Unpair your device to connect it to a different account or reset your pet.
            </p>
            <Button 
              variant="destructive" 
              onClick={() => setShowUnpairDialog(true)}
              className="w-full h-12"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Unpair Device
            </Button>
          </div>
        </div>
      </div>

      {/* Unpair Confirmation Dialog */}
      <AlertDialog open={showUnpairDialog} onOpenChange={setShowUnpairDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpair Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your {petName || "pet"} from your account. You can pair it again later using the same pairing code, or pair a different device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnpairing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnpair}
              disabled={isUnpairing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnpairing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Unpairing...</span>
                </div>
              ) : (
                "Unpair Device"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

