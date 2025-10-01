"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, X, QrCode, Delete } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/loading-spinner"
import Image from "next/image"

export default function WithdrawPage() {
  const router = useRouter()
  const { user, profile, connectedAccounts, activeUserId, loading: authLoading, refreshProfile } = useAuth()
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [recipientType, setRecipientType] = useState<"lightning" | "username" | "">("")
  const [recipientProfile, setRecipientProfile] = useState<any>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPasteInput, setShowPasteInput] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createBrowserSupabaseClient()

  // Handle number pad input
  const handleNumberInput = (digit: string) => {
    if (amount === "0" && digit !== "0") {
      setAmount(digit)
    } else {
      setAmount(prev => prev + digit)
    }
  }

  // Handle backspace
  const handleBackspace = () => {
    setAmount(prev => prev.slice(0, -1) || "0")
  }

  // Fetch recipient profile by username
  const fetchRecipientProfile = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single()
      
      if (error || !data) {
        setRecipientProfile(null)
        return
      }
      
      setRecipientProfile(data)
    } catch (error) {
      console.error("Error fetching recipient profile:", error)
      setRecipientProfile(null)
    }
  }

  // Handle family member selection
  const handleFamilySelect = (account: any) => {
    setRecipient(account.username || account.id)
    setRecipientType("username")
    setRecipientProfile(account) // We already have the profile data
  }

  // Handle QR scan
  const handleQRScan = async (scannedData: string) => {
    // Check if it's a Lightning invoice
    if (scannedData.toLowerCase().startsWith('lnbc')) {
      setRecipient(scannedData)
      setRecipientType("lightning")
      toast({
        title: "Lightning Invoice Detected",
        description: "Lightning invoice has been scanned successfully.",
        duration: 2000,
      })
    } else {
      // Assume it's a username
      const username = scannedData.startsWith('@') ? scannedData.substring(1) : scannedData
      setRecipient(username)
      setRecipientType("username")
      await fetchRecipientProfile(username)
      toast({
        title: "Username Detected", 
        description: `Ready to send to @${username}`,
        duration: 2000,
      })
    }
    setShowQRScanner(false)
    setShowPasteInput(false)
  }

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.toLowerCase().startsWith('lnbc')) {
        setRecipient(text)
        setRecipientType("lightning")
        setShowPasteInput(false)
        toast({
          title: "Invoice Pasted",
          description: "Lightning invoice pasted successfully.",
          duration: 2000,
        })
      } else {
        const username = text.startsWith('@') ? text.substring(1) : text
        setRecipient(username)
        setRecipientType("username")
        await fetchRecipientProfile(username)
        setShowPasteInput(false)
      }
    } catch (error) {
      toast({
        title: "Paste Failed",
        description: "Could not paste from clipboard.",
        variant: "destructive",
      })
    }
  }

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this feature",
        variant: "destructive",
        duration: 2000,
      })
      router.push("/auth/login?redirect=/wallet/withdraw")
      return
    }
  }, [user, authLoading, router, toast])

  // Process withdrawal or transfer
  const handleWithdrawal = async () => {
    if (!user || !profile) return

    const satsAmount = parseInt(amount)
    if (!satsAmount || satsAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      })
      return
    }

    if (satsAmount > (profile.balance || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough sats for this transaction.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (recipientType === "lightning") {
        // Handle Lightning invoice withdrawal
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
          body: JSON.stringify({ paymentRequest: recipient, amount: satsAmount }),
      })
        
      const result = await response.json()

      if (result.success) {
        await refreshProfile()
          toast({
            title: "Bitcoin Sent!",
            description: `Successfully sent ${formatSatsValue(satsAmount)} sats via Lightning.`,
            variant: "success",
            duration: 2000,
          })
          router.push("/wallet")
        } else {
          throw new Error(result.error || "Lightning payment failed")
        }
      } else if (recipientType === "username") {
        // Handle username-based transfer to any user
        const currentUserId = activeUserId || user.id
        const { data: result, error: transferError } = await supabase
          .rpc('transfer_sats_to_username', {
            p_from_user_id: currentUserId,
            p_to_username: recipient,
            p_amount: satsAmount,
            p_memo: note || null
          })

        if (transferError) {
          throw transferError
        }

        const transferResult = result as { 
          success: boolean, 
          error?: string,
          receiver_name?: string 
        }
        
        if (!transferResult.success) {
          throw new Error(transferResult.error || 'Transfer failed')
        }

        await refreshProfile()
        router.push("/wallet")
        
        // Show success toast after navigation
        setTimeout(() => {
          toast({
            title: "Sats Sent!",
            description: `Successfully sent ${formatSatsValue(satsAmount)} sats to ${transferResult.receiver_name ? transferResult.receiver_name.split(' ')[0] : `@${recipient}`}.`,
            variant: "success",
            duration: 2000,
          })
        }, 100)
      }
    } catch (error: any) {
      console.error("Error processing transaction:", error)
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to process transaction.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Send Bitcoin</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show login prompt
  if (!user) {
    return (
      <div className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Send Bitcoin</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-6">Please sign in to withdraw funds</p>
              <Button onClick={() => router.push("/auth/login?redirect=/wallet/withdraw")}>Sign In</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
        </Button>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Balance: {formatSatsValue(profile?.balance || 0)}
      </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/wallet")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipient Info */}
          <div className="flex flex-col items-center space-y-4 py-4">
            {!recipient ? (
              /* Dotted Box for Recipient Selection */
              <button
                onClick={() => setShowPasteInput(true)}
                className="relative w-20 h-20 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-8 w-8 text-gray-400 dark:text-gray-500 rotate-45" />
              </button>
            ) : (
              /* Selected Recipient Display */
              <div className="text-center">
                <button
                  onClick={() => setShowPasteInput(true)}
                  className="flex flex-col items-center space-y-2 hover:opacity-80 transition-opacity"
                >
                  {recipientType === "username" && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      <Image
                        src={recipientProfile?.avatar_url || "/placeholder.svg?height=64&width=64"}
                        alt={recipientProfile?.name || recipient}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="text-lg font-semibold text-white">
                    {recipientType === "lightning" ? "Lightning Payment" : `@${recipient}`}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Amount Display */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-4xl font-light">
              <div className="w-6 h-6 relative">
                <Image
                  src="/images/bitcoin-logo.png"
                  alt="Bitcoin"
                  fill
                  className="object-contain"
                />
              </div>
              <span>{(parseInt(amount) || 0).toLocaleString()}</span>
              <span className="text-2xl text-gray-500">sats</span>
            </div>
          </div>

          {/* Note Input */}
          <div className="px-4">
            <input
              type="text"
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-center"
            />
          </div>

          {/* Send Button */}
          <div className="px-4">
            <Button
              onClick={handleWithdrawal}
              disabled={!recipient || !amount || amount === "0" || loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Sending..." : "Send Sats"}
            </Button>
          </div>

          {/* Number Pad - Always Visible */}
          <div className="grid grid-cols-3 gap-3 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-10 text-lg"
                onClick={() => recipient ? handleNumberInput(num.toString()) : undefined}
                disabled={!recipient}
              >
                {num}
              </Button>
            ))}
            <div></div>
            <Button
              variant="outline"
              className="h-10 text-lg"
              onClick={() => recipient ? handleNumberInput("0") : undefined}
              disabled={!recipient}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-10 text-lg"
              onClick={() => recipient ? handleBackspace() : undefined}
              disabled={!recipient}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Simple Input Modal - No complex components */}
          {showPasteInput && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Add Recipient</h3>
                    <button
                      onClick={() => setShowPasteInput(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
        </div>
                  
                  <div className="relative">
                    <input
            type="text"
                      placeholder="Lightning invoice or username"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full p-3 pr-12 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowPasteInput(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (recipient.trim()) {
                          if (recipient.toLowerCase().startsWith('lnbc')) {
                            setRecipientType("lightning")
                            setRecipientProfile(null)
                          } else {
                            const username = recipient.startsWith('@') ? recipient.substring(1) : recipient
                            setRecipient(username)
                            setRecipientType("username")
                            await fetchRecipientProfile(username)
                          }
                          setShowPasteInput(false)
                        }
                      }}
                      disabled={!recipient.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Scanner */}
          {showQRScanner && (
            <QRScannerCamera
              onScan={handleQRScan}
              onClose={() => setShowQRScanner(false)}
              cameraError={cameraError}
              setCameraError={setCameraError}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// QR Scanner Camera Component
function QRScannerCamera({ 
  onScan, 
  onClose, 
  cameraError, 
  setCameraError 
}: { 
  onScan: (data: string) => void
  onClose: () => void
  cameraError: string | null
  setCameraError: (error: string | null) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setCameraError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        startQRDetection()
      }
    } catch (err) {
      console.error("Camera error:", err)
      setCameraError("Unable to access camera. Please check permissions.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const startQRDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    scanIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Use browser's built-in barcode detection if available
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code']
          })
          
          barcodeDetector.detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0) {
                const qrData = barcodes[0].rawValue
                console.log('QR Code detected:', qrData)
                onScan(qrData)
                stopCamera()
              }
            })
            .catch((err: any) => {
              console.log('Barcode detection error:', err)
            })
        }
      }
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white text-lg font-semibold">Scan QR Code</h2>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 p-2 rounded"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        {cameraError ? (
          <div className="text-center text-white space-y-4">
            <QrCode className="h-16 w-16 mx-auto opacity-50" />
            <p className="text-lg">{cameraError}</p>
            <button 
              onClick={startCamera}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scanning frame */}
                <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                </div>
                
                <p className="text-white text-center mt-4 text-sm">
                  Position QR code within the frame
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden canvas for QR detection */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom instructions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50">
        <p className="text-white text-center text-sm">
          Scanning for QR code...
        </p>
      </div>
    </div>
  )
}
