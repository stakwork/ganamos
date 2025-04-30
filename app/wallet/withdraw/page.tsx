"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { processWithdrawal } from "@/app/actions/lightning-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function WithdrawPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [amount, setAmount] = useState<number>(1000)
  const [paymentRequest, setPaymentRequest] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true)
  const { toast } = useToast()

  // Fetch user balance
  useEffect(() => {
    if (profile) {
      setBalance(profile.balance)
      setLoadingBalance(false)
    }
  }, [profile])

  // Process withdrawal
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (amount < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum withdrawal is 100 sats",
        variant: "destructive",
      })
      return
    }

    if (!paymentRequest || !paymentRequest.startsWith("lnbc")) {
      toast({
        title: "Invalid invoice",
        description: "Please enter a valid Lightning invoice",
        variant: "destructive",
      })
      return
    }

    if (amount > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough funds for this withdrawal",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("paymentRequest", paymentRequest)
      formData.append("amount", amount.toString())

      const result = await processWithdrawal(formData)

      if (result.success) {
        toast({
          title: "Withdrawal successful!",
          description: `${amount} sats have been sent to your wallet`,
          variant: "default",
        })
        setPaymentRequest("")
        setBalance(result.newBalance)
      } else {
        toast({
          title: "Withdrawal failed",
          description: result.error || "Failed to process withdrawal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Withdraw Bitcoin</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdraw Bitcoin</CardTitle>
          <CardDescription>Send funds from your Ganamos! account to your Lightning wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount (sats)
                </label>
                <span className="text-sm text-gray-500">
                  Balance:{" "}
                  {loadingBalance ? (
                    <svg
                      className="animate-spin inline-block h-4 w-4 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    `${balance} sats`
                  )}
                </span>
              </div>
              <Input
                id="amount"
                type="number"
                min="100"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(Number.parseInt(e.target.value, 10))}
                placeholder="Enter amount in sats"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="invoice" className="text-sm font-medium">
                Lightning Invoice
              </label>
              <Input
                id="invoice"
                value={paymentRequest}
                onChange={(e) => setPaymentRequest(e.target.value)}
                placeholder="lnbc..."
              />
              <p className="text-xs text-gray-500">
                Generate an invoice in your Lightning wallet for the amount you want to withdraw
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || loadingBalance || balance < 100}>
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : (
                "Withdraw"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          <p>Withdrawals are typically processed within seconds</p>
        </CardFooter>
      </Card>
    </div>
  )
}
