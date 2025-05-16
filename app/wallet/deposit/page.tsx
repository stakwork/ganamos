"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createDepositInvoice, checkDepositStatus } from "@/app/actions/lightning-actions"
import QRCode from "@/components/qr-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeftIcon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(1000)
  const [invoice, setInvoice] = useState<string | null>(null)
  const [rHash, setRHash] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)
  const [settled, setSettled] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

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

    if (amount < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit is 100 sats",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Wait a moment to ensure authentication is fully established
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Pass the user ID to the server action
      const result = await createDepositInvoice(amount, user.id)
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

        setError(result.error || "Failed to create invoice")
        toast({
          title: "Error Creating Invoice",
          description: result.error || "Failed to create invoice. Check console for details.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      setError("An unexpected error occurred")
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
    setError(null)

    // Create a fake invoice and r_hash for testing
    setTimeout(() => {
      const mockInvoice = `lnbc${amount}n1pj${Math.random().toString(36).substring(2, 10)}qdqqxqyjw5qcqpjsp5`
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

    // Calculate new balance
    const newBalance = profile.balance + amount
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
        amount: amount,
        status: "completed",
        memo: `Simulated deposit of ${amount} sats`,
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
        description: `${amount} sats added to your balance`,
        variant: "default",
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
            <ArrowLeftIcon className="h-5 w-5" />
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

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Deposit Bitcoin</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-6">Please sign in to access this feature</p>
              <Button onClick={() => router.push("/auth/login?redirect=/wallet/deposit")}>Sign In</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Deposit Bitcoin</h1>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Add funds to your Ganamos! account using Lightning Network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!invoice ? (
            <>
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount (sats)
                </label>
                <Input
                  id="amount"
                  type="number"
                  min="100"
                  value={amount}
                  onChange={(e) => setAmount(Number.parseInt(e.target.value, 10))}
                  placeholder="Enter amount in sats"
                />
              </div>
              <Button onClick={handleCreateInvoice} className="w-full" disabled={loading}>
                {loading ? <LoadingSpinner /> : "Generate Invoice"}
              </Button>

              {process.env.NODE_ENV !== "production" && (
                <Button onClick={handleCreateMockInvoice} variant="outline" className="w-full mt-2" disabled={loading}>
                  Generate Test Invoice
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {settled ? (
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Payment Received!</h3>
                  <p className="text-green-600 dark:text-green-400">{amount} sats have been added to your balance</p>
                  <p className="text-sm text-green-500 dark:text-green-400 mt-1">Redirecting to your profile...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <QRCode data={invoice} size={250} color="#000000" backgroundColor="#ffffff" cornerColor="#10b981" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Scan with a Lightning wallet or copy the invoice
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input value={invoice} readOnly className="text-xs" />
                      <Button onClick={copyToClipboard} variant="outline" size="sm">
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="text-center">
                    {!checking && (
                      <Button onClick={() => startCheckingPayment(rHash!)} variant="outline">
                        Check Payment Status
                      </Button>
                    )}

                    {process.env.NODE_ENV !== "production" && (
                      <Button onClick={simulatePaymentReceived} variant="outline" className={checking ? "" : "ml-2"}>
                        Simulate Payment
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
        {process.env.NODE_ENV !== "production" && (
          <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-800">
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <div className="mt-2 space-y-1">
                <p>LND_REST_URL: {process.env.LND_REST_URL ? `"${process.env.LND_REST_URL}"` : "Not set"}</p>
                <p>LND_ADMIN_MACAROON set: {process.env.LND_ADMIN_MACAROON ? "Yes" : "No"}</p>
                <p>Current state: {invoice ? "Invoice generated" : "No invoice"}</p>
                <p>User authenticated: {user ? "Yes" : "No"}</p>
                <p>User ID: {user?.id ? user.id.substring(0, 8) + "..." : "None"}</p>
                <p>Current balance: {profile ? profile.balance : "Unknown"} sats</p>
                {rHash && <p>rHash: {rHash.substring(0, 10)}...</p>}
                {invoice && <p>Invoice length: {invoice.length} chars</p>}
              </div>
            </details>
          </div>
        )}
        <CardFooter className="flex justify-center text-sm text-gray-500">
          <p>Lightning Network payments are typically confirmed within seconds</p>
        </CardFooter>
      </Card>
    </div>
  )
}
