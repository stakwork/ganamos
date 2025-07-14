"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Wifi, Bluetooth, Zap, Heart, Cat, Dog, Rabbit, Squirrel, Turtle } from "lucide-react"
import Image from "next/image"

export default function ConnectPetPage() {
  const router = useRouter()
  const { profile, activeUserId, user, isConnectedAccount } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [deviceCode, setDeviceCode] = useState("")
  const [selectedPet, setSelectedPet] = useState<'cat' | 'dog' | 'rabbit' | 'squirrel' | 'turtle'>('cat')
  const [petName, setPetName] = useState("")
  const [step, setStep] = useState<'setup' | 'connect'>('setup')

  const handleConnect = () => {
    if (!deviceCode || !petName) {
      alert("Please enter a device code and pet name")
      return
    }
    setIsConnecting(true)
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false)
      // TODO: Implement actual device pairing logic
      alert(`${petName} the ${selectedPet} is now connected! Your pet will sync with your balance automatically.`)
    }, 2000)
  }

  const getPetIcon = (petType: string, size: number = 80) => {
    const iconProps = { size, color: "white", strokeWidth: 1.5 }
    switch (petType) {
      case 'dog': return <Dog {...iconProps} />
      case 'rabbit': return <Rabbit {...iconProps} />
      case 'squirrel': return <Squirrel {...iconProps} />
      case 'turtle': return <Turtle {...iconProps} />
      default: return <Cat {...iconProps} />
    }
  }

  const getCurrentBalance = () => {
    return profile?.balance || 0
  }

  const getAccountStatus = () => {
    if (isConnectedAccount) {
      return `Connected Account (${profile?.name || 'Unknown'})`
    }
    return `Main Account (${user?.user_metadata?.full_name || 'You'})`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Connect Your Pet</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
            {getPetIcon(selectedPet)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Satoshi Pet</h2>
            <p className="text-muted-foreground">Make Bitcoin real and fun for your family</p>
          </div>
        </div>

        {/* Current Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Account Balance</CardTitle>
            <CardDescription>{getAccountStatus()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{getCurrentBalance()} sats</div>
              <Badge variant="outline">Ready to sync</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pet Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Pet</CardTitle>
            <CardDescription>Pick the companion that will make Bitcoin tangible and fun</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {(['cat', 'dog', 'rabbit', 'squirrel', 'turtle'] as const).map((pet) => (
                <button
                  key={pet}
                  onClick={() => setSelectedPet(pet)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedPet === pet 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {getPetIcon(pet, 32)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pet Name */}
        <Card>
          <CardHeader>
            <CardTitle>Name Your Pet</CardTitle>
            <CardDescription>Give your Bitcoin companion a personal touch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="petName">Pet Name</Label>
              <Input
                id="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Enter your pet's name..."
                className="text-center"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Making Bitcoin Real</CardTitle>
            <CardDescription>
              Your physical pet helps kids understand that Bitcoin isn't just numbers on a screen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Tangible Bitcoin</h4>
                <p className="text-sm text-muted-foreground">Your pet reacts when you earn or spend sats, making Bitcoin feel as real as cash</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Learning Through Play</h4>
                <p className="text-sm text-muted-foreground">Kids learn Bitcoin concepts by caring for their pet with real satoshis</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Wifi className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Always in Your Pocket</h4>
                <p className="text-sm text-muted-foreground">Carry your Bitcoin companion everywhere as a fun, physical reminder</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Code Input */}
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Device</CardTitle>
            <CardDescription>Enter the pairing code from your Satoshi Pet hardware</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceCode">Device Pairing Code</Label>
              <Input
                id="deviceCode"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code (e.g. ABC123)"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Find the code on your device's screen when powered on</p>
              <p>• Code changes every 5 minutes for security</p>
              <p>• Make sure your device is nearby and turned on</p>
            </div>
          </CardContent>
        </Card>

        {/* Connect Button */}
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting || !deviceCode || !petName}
          className="w-full h-12 text-lg"
        >
          {isConnecting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting {petName}...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>Connect {petName || 'Pet'}</span>
            </div>
          )}
        </Button>

        {/* Footer Info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't have a Satoshi Pet device yet?
          </p>
          <Button variant="outline" className="w-full">
            Order Your Hardware Pet
          </Button>
          <p className="text-xs text-muted-foreground">
            Make Bitcoin as real as cash for your kids
          </p>
        </div>
      </div>
    </div>
  )
}
