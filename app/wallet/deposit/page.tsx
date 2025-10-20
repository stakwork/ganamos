"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createDepositInvoice, checkDepositStatus } from "@/app/actions/lightning-actions"
import QRCode from "@/components/qr-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ArrowLeft, X, Delete } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import Image from "next/image"

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<string>("0")
  const [invoice, setInvoice] = useState<string | null>(null)
  const [rHash, setRHash] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)
  const [settled, setSettled] = useState<boolean>(false)
  const [note, setNote] = useState<string>("")
  const { toast } = useToast()

  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

  // Bitcoin price state
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const bitcoinPriceFetched = useRef(false)

  // Fetch the current Bitcoin price
  const fetchBitcoinPrice = useCallback(async () => {
    if (bitcoinPriceFetched.current) return

    try {
      setIsPriceLoading(true)
      const response = await fetch("/api/bitcoin-price")
      if (response.ok) {
        const data = await response.json()
        if (data.price && typeof data.price === "number") {
          setBitcoinPrice(data.price)
          bitcoinPriceFetched.current = true
        } else {
          console.warn("Bitcoin price API returned invalid price data")
          setBitcoinPrice(null)
        }
      } else {
        console.error("Failed to fetch Bitcoin price")
        setBitcoinPrice(null)
      }
    } catch (error) {
      console.error("Error fetching Bitcoin price:", error)
      setBitcoinPrice(null)
    } finally {
      setIsPriceLoading(false)
    }
  }, [])

  // Fetch Bitcoin price on mount
  useEffect(() => {
    fetchBitcoinPrice()
  }, [fetchBitcoinPrice])

  // Calculate USD value
  const calculateUsdValue = (sats: number) => {
    if (!bitcoinPrice) return null
    const btcAmount = sats / 100000000
    const usdValue = btcAmount * bitcoinPrice
    return usdValue.toFixed(2)
  }

  // Handle number pad input
  const handleNumberInput = (digit: string) => {
    if (amount === "0" && digit !== "0") {
      setAmount(digit)
    } else {
      setAmount((prev) => prev + digit)
    }
  }

  // Handle backspace
  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1) || "0")
  }

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this feature",
        variant: "destructive",
      })
      router.push("/auth/login?redirect=/wallet/deposit")
    }
  }, [user, authLoading, router, toast])

  // Generate a new invoice
  const handleCreateInvoice = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create an invoice",
        variant: "destructive",
      })
      router.push("/auth/login?redirect=/wallet/deposit")
      return
    }

    const satsAmount = parseInt(amount)
    if (!satsAmount || satsAmount < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit is 100 sats",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Wait a moment to ensure authentication is fully established
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Pass the user ID to the server action
      const result = await createDepositInvoice(satsAmount, user.id)
      if (result.success) {
        setInvoice(result.paymentRequest)
        setRHash(result.rHash)

        // Start checking for payment
        startCheckingPayment(result.rHash)
      } else {
        console.error("Invoice creation failed:", result.error, result.details)

        // Handle authentication errors specifically
        if (result.error === "Not authenticated") {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          router.push("/auth/login?redirect=/wallet/deposit")
          return
        }

        toast({
          title: "Error Creating Invoice",
          description: result.error || "Failed to create invoice. Check console for details.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Check console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate a mock invoice for development/testing
  const handleCreateMockInvoice = () => {
    setLoading(true)

    const satsAmount = parseInt(amount)
    // Create a fake invoice and r_hash for testing
    setTimeout(() => {
      const mockInvoice = `lnbc${satsAmount}n1pj${Math.random().toString(36).substring(2, 10)}qdqqxqyjw5qcqpjsp5`
      const mockRHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      setInvoice(mockInvoice)
      setRHash(mockRHash)
      setLoading(false)

      toast({
        title: "Mock Invoice Created",
        description: "This is a test invoice that won't actually receive payments",
      })
    }, 1000)
  }

  // Check if payment has been received
  const startCheckingPayment = async (rHash: string) => {
    if (!user) {
      console.error("Cannot check payment status: User not authenticated")
      return
    }

    setChecking(true)

    // Check every 3 seconds for 5 minutes (100 times)
    let attempts = 0
    const maxAttempts = 100

    const checkInterval = setInterval(async () => {
      attempts++

      try {
        // Pass the user ID to the server action
        const result = await checkDepositStatus(rHash, user.id)

        if (result.success && result.settled) {
          clearInterval(checkInterval)
          setSettled(true)
          setChecking(false)

          console.log("Payment received! New balance:", result.newBalance)

          // Refresh the profile to get the updated balance
          await refreshProfile()

          // Show success message and redirect to profile page
          toast({
            title: "Payment received!",
            description: `${result.amount} sats added to your balance`,
            variant: "default",
            duration: 2000,
          })

          // Short delay before redirecting to ensure toast is seen
          setTimeout(() => {
            router.push("/profile")
          }, 1500)
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          setChecking(false)

          toast({
            title: "Timeout",
            description: "Invoice expired. Please create a new one.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error checking payment:", error)
      }
    }, 3000)

    // Cleanup function
    return () => clearInterval(checkInterval)
  }

  // For mock testing - simulate payment received
  const simulatePaymentReceived = async () => {
    if (!user || !profile) {
      console.error("Cannot simulate payment: User not authenticated")
      return
    }

    setSettled(true)
    setChecking(false)

    const satsAmount = parseInt(amount)
    // Calculate new balance
    const newBalance = profile.balance + satsAmount
    console.log("Simulating payment received. Current balance:", profile.balance, "New balance:", newBalance)

    // Update the user's balance in the database
    try {
      // Create a transaction record for the simulated deposit
      const { createBrowserSupabaseClient } = await import("@/lib/supabase")
      const supabase = createBrowserSupabaseClient()

      // Add a transaction record
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: satsAmount,
        status: "completed",
        memo: `Simulated deposit of ${satsAmount} sats`,
      })

      if (txError) {
        console.error("Error creating transaction record:", txError)
      }

      // Update the user's balance
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (balanceError) {
        console.error("Error updating balance:", balanceError)
      }

      // Refresh the profile to get the updated balance
      await refreshProfile()

      toast({
        title: "Payment received! (Simulated)",
        description: `${satsAmount} sats added to your balance`,
        variant: "default",
        duration: 2000,
      })

      // Short delay before redirecting to ensure toast is seen
      setTimeout(() => {
        router.push("/profile")
      }, 1500)
    } catch (error) {
      console.error("Error simulating payment:", error)
      toast({
        title: "Error",
        description: "Failed to simulate payment",
        variant: "destructive",
      })
    }
  }

  // Copy invoice to clipboard
  const copyToClipboard = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice)
      toast({
        title: "Copied!",
        description: "Invoice copied to clipboard",
        variant: "default",
      })
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
          <h1 className="text-2xl font-bold">Deposit Bitcoin</h1>
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
          <h1 className="text-2xl font-bold">Deposit Bitcoin</h1>
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to deposit funds</p>
          <Button onClick={() => router.push("/auth/login?redirect=/wallet/deposit")}>Sign In</Button>
        </div>
      </div>
    )
  }

  // If invoice has been generated, show QR code screen
  if (invoice) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto min-h-screen bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Deposit Bitcoin</h1>
            <Button variant="ghost" size="icon" onClick={() => router.push("/wallet")}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4 space-y-6">
            {settled ? (
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Payment Received!</h3>
                <p className="text-green-600 dark:text-green-400 mt-2">
                  {parseInt(amount)} sats have been added to your balance
                </p>
                <p className="text-sm text-green-500 dark:text-green-400 mt-1">Redirecting to your profile...</p>
              </div>
            ) : (
              <>
                {/* Amount Display */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Deposit Amount</p>
                  <div className="flex items-center justify-center space-x-2 text-4xl font-light">
                    <div className="w-6 h-6 relative">
                      <Image src="/images/bitcoin-logo.png" alt="Bitcoin" fill className="object-contain" />
                    </div>
                    <span>{(parseInt(amount) || 0).toLocaleString()}</span>
                    <span className="text-2xl text-gray-500">sats</span>
                  </div>
                  {!isPriceLoading && bitcoinPrice && calculateUsdValue(parseInt(amount) || 0) ? (
                    <p className="text-sm text-muted-foreground">${calculateUsdValue(parseInt(amount) || 0)} USD</p>
                  ) : (
                    <p className="text-sm text-muted-foreground opacity-0">$0.00 USD</p>
                  )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <QRCode data={invoice} size={250} color="#000000" backgroundColor="#ffffff" cornerColor="#10b981" />
                </div>

                {/* Invoice String */}
                <div className="space-y-2">
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                    Scan with a Lightning wallet or copy the invoice
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input value={invoice} readOnly className="text-xs font-mono" />
                    <Button onClick={copyToClipboard} variant="outline" size="sm">
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {!checking && (
                    <Button onClick={() => startCheckingPayment(rHash!)} variant="outline" className="w-full">
                      Check Payment Status
                    </Button>
                  )}

                  {process.env.NODE_ENV !== "production" && (
                    <Button onClick={simulatePaymentReceived} variant="outline" className="w-full">
                      Simulate Payment (Dev)
                    </Button>
                  )}

                  {checking && (
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <LoadingSpinner />
                      <span>Waiting for payment...</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Lightning Network payments are typically confirmed within seconds
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main deposit screen (enter amount)
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Balance: {formatSatsValue(profile?.balance || 0)}
          </div>

          <Button variant="ghost" size="icon" onClick={() => router.push("/wallet")}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* User Info - Receiving to self */}
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="text-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <Image
                    src={profile?.avatar_url || "/placeholder.svg?height=64&width=64"}
                    alt={profile?.name || "Your account"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-lg font-semibold">
                  {profile?.name || "Your Account"}
                </div>
                <div className="text-sm text-muted-foreground">Receiving Bitcoin</div>
              </div>
            </div>
          </div>

          {/* Amount Display */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-4xl font-light">
              <div className="w-6 h-6 relative">
                <Image src="/images/bitcoin-logo.png" alt="Bitcoin" fill className="object-contain" />
              </div>
              <span>{(parseInt(amount) || 0).toLocaleString()}</span>
              <span className="text-2xl text-gray-500">sats</span>
            </div>
            {!isPriceLoading && bitcoinPrice && calculateUsdValue(parseInt(amount) || 0) ? (
              <p className="text-sm text-muted-foreground">${calculateUsdValue(parseInt(amount) || 0)} USD</p>
            ) : (
              <p className="text-sm text-muted-foreground opacity-0">$0.00 USD</p>
            )}
          </div>

          {/* Note Input */}
          <div className="px-4">
            <input
              type="text"
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-transparent text-center text-gray-500 dark:text-gray-400 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
            />
          </div>

          {/* Generate Invoice Button */}
          <div className="px-4">
            <Button
              onClick={handleCreateInvoice}
              disabled={!amount || amount === "0" || loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Generating..." : "Generate Invoice"}
            </Button>

            {process.env.NODE_ENV !== "production" && (
              <Button
                onClick={handleCreateMockInvoice}
                variant="outline"
                disabled={!amount || amount === "0" || loading}
                className="w-full h-12 mt-2"
              >
                Generate Test Invoice
              </Button>
            )}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-16 sm:h-14 text-xl sm:text-lg"
                onClick={() => handleNumberInput(num.toString())}
              >
                {num}
              </Button>
            ))}
            <div></div>
            <Button variant="outline" className="h-16 sm:h-14 text-xl sm:text-lg" onClick={() => handleNumberInput("0")}>
              0
            </Button>
            <Button variant="outline" className="h-16 sm:h-14 text-xl sm:text-lg" onClick={handleBackspace}>
              <Delete className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
