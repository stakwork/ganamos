"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createDepositInvoice, checkDepositStatus } from "@/app/actions/lightning-actions"
import QRCode from "@/components/qr-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ArrowLeft, Copy, Check, X } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import Image from "next/image"
import { AmountInputModal } from "@/components/amount-input-modal"

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<string>("")
  const [invoice, setInvoice] = useState<string | null>(null)
  const [rHash, setRHash] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)
  const [settled, setSettled] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [showAmountModal, setShowAmountModal] = useState<boolean>(false)
  const [showFullInvoice, setShowFullInvoice] = useState<boolean>(false)
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null)
  const { toast } = useToast()
  const supabase = createBrowserSupabaseClient()

  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

  // Auto-generate invoice on page load
  const initialInvoiceGenerated = useRef(false)

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

  // Auto-generate invoice when user is ready
  useEffect(() => {
    if (user && !initialInvoiceGenerated.current && !invoice) {
      initialInvoiceGenerated.current = true
      handleCreateInvoice()
    }
  }, [user])

  const handleCreateInvoice = async (overrideAmount?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an invoice",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // If amount is provided, use it, otherwise create no-value invoice
      const satsAmount = overrideAmount ? parseInt(overrideAmount) : (amount && amount !== "" ? parseInt(amount) : 0)

      if (satsAmount > 0 && satsAmount < 100) {
        toast({
          title: "Invalid amount",
          description: "Minimum deposit is 100 sats",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const result = await createDepositInvoice(satsAmount, user.id)
      if (result.success) {
        setInvoice(result.paymentRequest)
        setRHash(result.rHash)

        // Start checking for payment automatically
        setTimeout(() => {
        startCheckingPayment(result.rHash)
        }, 1000)
      } else {
        if (result.error?.includes("LND") || result.error?.includes("ECONNREFUSED")) {
          toast({
            title: "Lightning Network Unavailable",
            description: "Using test mode for development",
            variant: "default",
          })
          handleCreateMockInvoice()
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

    const satsAmount = amount && amount !== "" ? parseInt(amount) : 0
    setTimeout(() => {
      const mockInvoice = `lnbc${satsAmount}n1pj${Math.random().toString(36).substring(2, 10)}qdqqxqyjw5qcqpjsp5`
      const mockRHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      setInvoice(mockInvoice)
      setRHash(mockRHash)
      setLoading(false)

      setTimeout(() => {
        startCheckingPayment(mockRHash)
      }, 1000)
    }, 500)
  }

  const copyToClipboard = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Invoice copied to clipboard",
        duration: 2000,
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const startCheckingPayment = async (hash: string) => {
    if (!user) return

    setChecking(true)
    let checkCount = 0
    const maxChecks = 60

    const checkInterval = setInterval(async () => {
      checkCount++
      console.log(`Checking payment status... (attempt ${checkCount}/${maxChecks})`)

      const result = await checkDepositStatus(hash, user.id)

      if (result.settled) {
        console.log("Payment settled!")
          clearInterval(checkInterval)
          setSettled(true)
          setChecking(false)

        if (!profile) return

        // CRITICAL: Always use the actual amount received, not the pre-specified amount
        const satsAmount = parseInt(result.amount) || 1000
        setReceivedAmount(satsAmount)
        const newBalance = parseInt(profile.balance) + satsAmount

        try {
          const { error: balanceError } = await supabase
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", user.id)

          if (balanceError) {
            console.error("Error updating balance:", balanceError)
          }

          // Update the existing transaction instead of creating a new one
          const { error: txError } = await supabase
            .from("transactions")
            .update({ 
              status: "completed",
              updated_at: new Date().toISOString()
            })
            .eq("r_hash_str", rHash)
            .eq("user_id", user.id)
            .eq("status", "pending")

          if (txError) {
            console.error("Error updating transaction:", txError)
          }

          await refreshProfile()

          // Don't show toast here since we have a success screen
          // toast({
          //   title: "Payment received!",
          //   description: `${satsAmount} sats added to your balance`,
          //   variant: "default",
          //   duration: 2000,
          // })

          setTimeout(() => {
            router.push("/profile")
          }, 3000)
        } catch (error) {
          console.error("Error handling successful payment:", error)
        }
        }

      if (checkCount >= maxChecks) {
        console.log("Max check attempts reached")
          clearInterval(checkInterval)
          setChecking(false)
      }
    }, 2000)
  }

  const simulatePaymentReceived = async () => {
    if (!user || !profile) {
      console.error("No user or profile")
      return
    }

    setSettled(true)
    setChecking(false)

    // For simulated payments, use the pre-specified amount since it's a test
    const satsAmount = amount && amount !== "" ? parseInt(amount) : 1000
    setReceivedAmount(satsAmount)
    const newBalance = parseInt(profile.balance) + satsAmount
    console.log("Simulating payment received. Current balance:", profile.balance, "New balance:", newBalance)

    try {
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id)

      if (balanceError) {
        console.error("Error updating balance:", balanceError)
        return
      }

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: satsAmount,
        status: "completed",
        memo: `Simulated deposit of ${satsAmount} sats`,
      })

      if (txError) {
        console.error("Error creating transaction:", txError)
      }

      await refreshProfile()

      // Don't show toast here since we have a success screen
      // toast({
      //   title: "Payment received! (Simulated)",
      //   description: `${satsAmount} sats added to your balance`,
      //   variant: "default",
      //   duration: 2000,
      // })

      setTimeout(() => {
        router.push("/profile")
      }, 3000)
    } catch (error) {
      console.error("Error simulating payment:", error)
    }
  }

  const handleRegenerateWithAmount = () => {
    setInvoice(null)
    setRHash(null)
    setChecking(false)
    setSettled(false)
    handleCreateInvoice()
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  // If not authenticated
  if (!user) {
    return null
  }

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

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {loading && !invoice ? (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
              <LoadingSpinner />
              <p className="text-muted-foreground mt-4">Generating invoice...</p>
            </div>
          ) : settled ? (
            <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Payment Received!</h3>
              <p className="text-green-600 dark:text-green-400 mt-2">
                {receivedAmount ? `${formatSatsValue(receivedAmount)}` : "Sats"} added to your balance
              </p>
              <p className="text-sm text-green-500 dark:text-green-400 mt-1">Redirecting to your profile...</p>
            </div>
          ) : invoice ? (
            <>
              {/* User Info - Receiving to */}
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
                <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                  <div className="w-3.5 h-3.5 relative">
                    <Image
                      src="/images/bitcoin-logo.png"
                      alt="Bitcoin"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span>{formatSatsValue(profile?.balance || 0)}</span>
                </div>
              </div>

              {/* QR Code - Main Focus */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <QRCode 
                    data={invoice} 
                    size={280} 
                    color="#000000" 
                    backgroundColor="#ffffff" 
                    cornerColor="#10b981"
                  />
                </div>
          </div>

              {/* Amount Input */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowAmountModal(true)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {amount ? `${formatSatsValue(parseInt(amount))}` : "Add an amount"}
                </Button>
              </div>

              {/* Invoice String with Copy */}
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <textarea 
                    value={showFullInvoice ? invoice : (invoice.length > 50 ? `${invoice.substring(0, 20)}...${invoice.substring(invoice.length - 20)}` : invoice)} 
                    readOnly 
                    className="flex-1 text-xs font-mono bg-muted cursor-pointer resize-none border rounded-md px-3 py-2 min-h-[40px] flex items-center justify-center"
                    onClick={() => {
                      // Toggle full invoice display when clicked
                      setShowFullInvoice(!showFullInvoice)
                    }}
                    rows={showFullInvoice ? Math.ceil(invoice.length / 50) : 1}
                    style={{ 
                      height: showFullInvoice ? 'auto' : '40px',
                      minHeight: showFullInvoice ? `${Math.ceil(invoice.length / 50) * 20 + 20}px` : '40px',
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: '1.2'
                    }}
                  />
            <Button
                    onClick={copyToClipboard} 
                variant="outline"
                    size="icon"
                    className="shrink-0 mt-1"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
              </Button>
                </div>
                {showFullInvoice && (
                  <p className="text-xs text-muted-foreground text-center">
                    Click to collapse
                  </p>
                )}
          </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Amount Input Modal */}
      <AmountInputModal
        open={showAmountModal}
        onOpenChange={setShowAmountModal}
        onAmountSet={(newAmount) => {
          setAmount(newAmount)
          // Clear existing invoice and regenerate (whether amount is set or cleared)
          setInvoice(null)
          setRHash(null)
          setChecking(false)
          setSettled(false)
          setShowFullInvoice(false)
          // Generate new invoice (no-value if amount is empty, or with amount if specified)
          handleCreateInvoice(newAmount)
        }}
        currentAmount={amount}
      />
    </div>
  )
}
