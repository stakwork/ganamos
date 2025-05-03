"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createDepositInvoice, checkDepositStatus } from "@/app/actions/lightning-actions"
import QRCode from "@/components/qr-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeftIcon } from "lucide-react"

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

  // Generate a new invoice
  const handleCreateInvoice = async () => {
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
      const result = await createDepositInvoice(amount)
      if (result.success) {
        setInvoice(result.paymentRequest)
        setRHash(result.rHash)

        // Start checking for payment
        startCheckingPayment(result.rHash)
      } else {
        console.error("Invoice creation failed:", result.error, result.details)
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
    setChecking(true)

    // Check every 3 seconds for 5 minutes (100 times)
    let attempts = 0
    const maxAttempts = 100

    const checkInterval = setInterval(async () => {
      attempts++

      try {
        const result = await checkDepositStatus(rHash)

        if (result.success && result.settled) {
          clearInterval(checkInterval)
          setSettled(true)
          setChecking(false)

          toast({
            title: "Payment received!",
            description: `${result.amount} sats added to your balance`,
            variant: "default",
          })
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
  const simulatePaymentReceived = () => {
    setSettled(true)
    setChecking(false)

    toast({
      title: "Payment received! (Simulated)",
      description: `${amount} sats added to your balance`,
      variant: "default",
    })
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
          <CardTitle>Deposit Bitcoin</CardTitle>
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
                  <Button
                    onClick={() => {
                      setInvoice(null)
                      setRHash(null)
                      setSettled(false)
                      setError(null)
                    }}
                    className="mt-4"
                  >
                    Create New Invoice
                  </Button>
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
