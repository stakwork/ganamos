"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Wifi, Bluetooth, Zap, Heart, Cat, Dog, Rabbit, Squirrel, Turtle, Package } from "lucide-react"
import Image from "next/image"

export default function ConnectPetPage() {
  const router = useRouter()
  const { profile, activeUserId, user, isConnectedAccount } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [deviceCode, setDeviceCode] = useState("")
  const [selectedPet, setSelectedPet] = useState<'cat' | 'dog' | 'rabbit' | 'squirrel' | 'turtle'>('cat')
  const [petName, setPetName] = useState("")
  const [step, setStep] = useState<'get-started' | 'choose-pet' | 'name-pet' | 'connect-device'>('get-started')
  const [showCodeEntry, setShowCodeEntry] = useState(false)


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

  const handleNext = () => {
    if (step === 'get-started') setStep('choose-pet')
    else if (step === 'choose-pet') setStep('name-pet')
    else if (step === 'name-pet') setStep('connect-device')
  }

  const handleBack = () => {
    if (step === 'choose-pet') setStep('get-started')
    else if (step === 'name-pet') setStep('choose-pet')
    else if (step === 'connect-device') setStep('name-pet')
    else router.back()
  }

  const canProceed = () => {
    if (step === 'get-started') return true
    if (step === 'choose-pet') return selectedPet
    if (step === 'name-pet') return petName.trim().length > 0
    if (step === 'connect-device') return deviceCode.length === 6
    return false
  }

  const getStepTitle = () => {
    switch (step) {
      case 'get-started': return 'Satoshi Pet'
      case 'choose-pet': return 'Choose Your Pet'
      case 'name-pet': return 'Name Your Pet'
      case 'connect-device': return 'Connect Device'
      default: return 'Satoshi Pet'
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 'get-started': return 'Make Bitcoin physical and fun'
      case 'choose-pet': return 'Pick the companion that will make Bitcoin tangible'
      case 'name-pet': return 'Give your Bitcoin companion a personal touch'
      case 'connect-device': return 'Enter your device code or order a new pet'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Back Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border shadow-sm"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="max-w-md mx-auto p-4 pt-16 min-h-screen flex flex-col">
        {/* Step Content */}
        <div className="flex-1 flex flex-col space-y-8">
          {step === 'get-started' && (
            <div className="space-y-8">
              {/* Hero Visual */}
              <div className="text-center space-y-4">
                <div className="relative w-32 h-32 mx-auto">
                  {/* Bitcoin Coins - Raining down into cat's circle */}
                  {/* Left coin */}
                  <div className="absolute w-6 h-6 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-white top-0 transform -translate-x-1/2" style={{ left: '15%', animation: 'coinRain 3s ease-in-out infinite, coinFade 3s ease-in-out infinite', opacity: 0 }}>
                    ₿
                  </div>
                  
                  {/* Center coin */}
                  <div className="absolute w-6 h-6 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-white top-0 left-1/2 transform -translate-x-1/2" style={{ animation: 'coinRain 3s ease-in-out infinite, coinFade 3s ease-in-out infinite', animationDelay: '1s, 1s', opacity: 0 }}>
                    ₿
                  </div>
                  
                  {/* Right coin */}
                  <div className="absolute w-6 h-6 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-white top-0 transform -translate-x-1/2" style={{ left: '75%', animation: 'coinRain 3s ease-in-out infinite, coinFade 3s ease-in-out infinite', animationDelay: '2s, 2s', opacity: 0 }}>
                    ₿
                  </div>

                  {/* Main Cat Circle */}
                  <div className="relative w-32 h-32 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                    {/* Subtle background glow effect */}
                    <div className="absolute inset-2 bg-white/10 rounded-full animate-pulse" style={{ animationDuration: '3s' }}></div>
                    
                    {/* Animated Cat Icon */}
                    <div 
                      className="relative z-10"
                      style={{
                        animation: 'float 4s ease-in-out infinite, wiggle 6s ease-in-out infinite'
                      }}
                    >
                      <Cat size={80} color="white" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{getStepTitle()}</h1>
                  <p className="text-muted-foreground">{getStepDescription()}</p>
                </div>
              </div>

              {/* Custom CSS for animations */}
              <style jsx>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px) scale(1); }
                  25% { transform: translateY(-3px) scale(1.02); }
                  50% { transform: translateY(-6px) scale(1.05); }
                  75% { transform: translateY(-3px) scale(1.02); }
                }
                
                @keyframes wiggle {
                  0%, 100% { transform: translateX(0px) rotate(0deg); }
                  10% { transform: translateX(-5px) rotate(-3deg); }
                  20% { transform: translateX(5px) rotate(3deg); }
                  30% { transform: translateX(-3px) rotate(-1.5deg); }
                  40% { transform: translateX(3px) rotate(1.5deg); }
                  50% { transform: translateX(0px) rotate(0deg); }
                  60% { transform: translateX(-3px) rotate(-1.5deg); }
                  70% { transform: translateX(3px) rotate(1.5deg); }
                  80% { transform: translateX(-5px) rotate(-3deg); }
                  90% { transform: translateX(5px) rotate(3deg); }
                }
                
                @keyframes coinRain {
                  0% { transform: translateY(-60px); }
                  100% { transform: translateY(80px); }
                }
                
                @keyframes coinFade {
                  0% { opacity: 0; }
                  20% { opacity: 1; }
                  80% { opacity: 1; }
                  100% { opacity: 0; }
                }
                

              `}</style>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Heart className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Your pet reacts when you earn or spend sats</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Kids learn Bitcoin concepts through play</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Carry Bitcoin everywhere as a physical reminder</p>
                </div>
              </div>
            </div>
          )}

          {step !== 'get-started' && (
            <>
              {/* Header for other steps */}
              <div className="text-center space-y-2 mb-4">
                <h1 className="text-2xl font-bold">{getStepTitle()}</h1>
                <p className="text-muted-foreground">{getStepDescription()}</p>
              </div>
            </>
          )}

          {step === 'choose-pet' && (
            <div className="space-y-6">
              {/* Pet Visual */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  {getPetIcon(selectedPet)}
                </div>
              </div>

              {/* Pet Selection */}
              <div className="grid grid-cols-5 gap-3">
                {(['cat', 'dog', 'rabbit', 'squirrel', 'turtle'] as const).map((pet) => (
                  <button
                    key={pet}
                    onClick={() => setSelectedPet(pet)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPet === pet 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {getPetIcon(pet, 32)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'name-pet' && (
            <div className="space-y-6">
              {/* Pet Visual */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  {getPetIcon(selectedPet)}
                </div>
                {petName && (
                  <p className="text-lg font-medium text-muted-foreground">{petName}</p>
                )}
              </div>

              {/* Pet Name Input */}
              <div className="space-y-3">
                <Input
                  id="petName"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Enter your pet's name..."
                  className="text-center text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 'connect-device' && (
            <div className="space-y-6">
              {/* Pet Visual */}
              <div className="text-center">
                <div className="relative mx-auto mb-4" style={{ width: '128px', height: '128px' }}>
                  {/* Sonar Rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400/20 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
                  
                  {/* Main Pet Circle */}
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center relative z-10">
                    {getPetIcon(selectedPet)}
                  </div>
                </div>
                <p className="text-lg font-medium">{petName}</p>
                <p className="text-sm text-foreground animate-pulse">Ready to connect</p>
              </div>

              {!showCodeEntry ? (
                /* Initial Options */
                <div className="space-y-4">
                  <Button 
                    onClick={() => setShowCodeEntry(true)}
                    className="w-full h-12 text-lg"
                  >
                    <Wifi className="h-5 w-5 mr-2" />
                    Pair My Pet
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/pet-store')}
                    className="w-full h-12 text-lg"
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Order Pet - $49
                  </Button>
                </div>
              ) : (
                /* Code Entry */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                    </div>
                    <Input
                      id="deviceCode"
                      value={deviceCode}
                      onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                      placeholder="Enter pairing code"
                      maxLength={6}
                      className="text-center text-l tracking-widest font-mono"
                      autoFocus
                    />
                  </div>
  
                  <div
                    onClick={() => setShowCodeEntry(false)}
                    className="w-full text-center text-sm text-muted-foreground mt-2 cursor-pointer transition-colors hover:text-primary font-medium"
                    style={{ marginTop: '1rem' }}
                    tabIndex={0}
                    role="button"
                    onKeyPress={e => {
                      if (e.key === 'Enter' || e.key === ' ') setShowCodeEntry(false)
                    }}
                  >
                    <span className="font-normal">Back to Options</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Button */}
        <div className="mt-auto pb-32">
          {step === 'connect-device' && showCodeEntry ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || !canProceed()}
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
                  <span>Connect {petName}</span>
                </div>
              )}
            </Button>
          ) : step !== 'connect-device' ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()}
              className="w-full h-12 text-lg"
            >
              {step === 'get-started' && 'Get Started'}
              {step === 'choose-pet' && 'Continue'}
              {step === 'name-pet' && 'Continue'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
