"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createDepositInvoice, checkDepositStatus } from "@/app/actions/lightning-actions"
import QRCode from "@/components/qr-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import { createBrowserSupabaseClient } from "@/lib/supabase"

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<string>("")
  const [invoice, setInvoice] = useState<string | null>(null)
  const [rHash, setRHash] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)
  const [settled, setSettled] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [showAmountInput, setShowAmountInput] = useState<boolean>(false)
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

  const handleCreateInvoice = async () => {
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

      // If amount is provided, use it, otherwise create invoice without amount
      const satsAmount = amount && amount !== "" ? parseInt(amount) : undefined

      if (satsAmount && satsAmount < 100) {
        toast({
          title: "Invalid amount",
          description: "Minimum deposit is 100 sats",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const result = await createDepositInvoice(satsAmount || 0, user.id)
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
    setChecking(true)
    let checkCount = 0
    const maxChecks = 60

    const checkInterval = setInterval(async () => {
      checkCount++
      console.log(`Checking payment status... (attempt ${checkCount}/${maxChecks})`)

      const result = await checkDepositStatus(hash)

      if (result.settled) {
        console.log("Payment settled!")
        clearInterval(checkInterval)
        setSettled(true)
        setChecking(false)

        const satsAmount = amount && amount !== "" ? parseInt(amount) : result.amount || 1000
        const newBalance = profile.balance + satsAmount

        try {
          const { error: balanceError } = await supabase
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", user.id)

          if (balanceError) {
            console.error("Error updating balance:", balanceError)
          }

          const { error: txError } = await supabase.from("transactions").insert({
            user_id: user.id,
            type: "deposit",
            amount: satsAmount,
            status: "completed",
            memo: `Deposit of ${satsAmount} sats`,
          })

          if (txError) {
            console.error("Error creating transaction:", txError)
          }

          await refreshProfile()

          toast({
            title: "Payment received!",
            description: `${satsAmount} sats added to your balance`,
            variant: "default",
            duration: 2000,
          })

          setTimeout(() => {
            router.push("/profile")
          }, 2000)
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

    const satsAmount = amount && amount !== "" ? parseInt(amount) : 1000
    const newBalance = profile.balance + satsAmount
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

      toast({
        title: "Payment received! (Simulated)",
        description: `${satsAmount} sats added to your balance`,
        variant: "default",
        duration: 2000,
      })

      setTimeout(() => {
        router.push("/profile")
      }, 2000)
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
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Receive Bitcoin</h1>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && !invoice ? (
            <div className="flex flex-col items-center justify-center py-12">
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
                {amount && amount !== "" ? `${parseInt(amount)} sats` : "Sats"} added to your balance
              </p>
              <p className="text-sm text-green-500 dark:text-green-400 mt-1">Redirecting to your profile...</p>
            </div>
          ) : invoice ? (
            <>
              {/* QR Code - Main Focus */}
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <QRCode 
                    data={invoice} 
                    size={280} 
                    color="#000000" 
                    backgroundColor="#ffffff" 
                    cornerColor="#10b981"
                  />
                </div>

                {amount && amount !== "" && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Requesting</p>
                    <p className="text-2xl font-bold">{parseInt(amount).toLocaleString()} sats</p>
                  </div>
                )}
              </div>

              {/* Invoice String with Copy */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Lightning Invoice
                </p>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={invoice} 
                    readOnly 
                    className="text-xs font-mono bg-muted"
                  />
                  <Button 
                    onClick={copyToClipboard} 
                    variant="outline" 
                    size="icon"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Amount Input (Collapsible) */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAmountInput(!showAmountInput)}
                  className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Regenerate with specific amount</span>
                  {showAmountInput ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showAmountInput && (
                  <div className="mt-4 space-y-3">
                    <Input
                      type="number"
                      placeholder="Amount in sats (optional)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-center"
                      min="100"
                    />
                    <Button 
                      onClick={handleRegenerateWithAmount} 
                      variant="outline"
                      className="w-full"
                      disabled={loading}
                    >
                      Generate New Invoice
                    </Button>
                  </div>
                )}
              </div>

              {/* Status */}
              {checking && (
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  <LoadingSpinner />
                  <span>Waiting for payment...</span>
                </div>
              )}

              {/* Dev Tools */}
              {process.env.NODE_ENV !== "production" && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground text-center mb-2">Development Tools</p>
                  <Button 
                    onClick={simulatePaymentReceived} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    Simulate Payment
                  </Button>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Scan the QR code with a Lightning wallet or copy the invoice to send payment
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
