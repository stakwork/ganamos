"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, X, Plus, Delete } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { formatSatsValue } from "@/lib/utils"
import type { Profile } from "@/lib/database.types"

export default function SendSatsPage() {
  const router = useRouter()
  const params = useParams()
  const childAccountId = params.id as string
  const { user, profile, connectedAccounts, updateBalance } = useAuth()
  const { toast } = useToast()
  const supabase = createBrowserSupabaseClient()

  const [childAccount, setChildAccount] = useState<Profile | null>(null)
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState("")
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(true)

  // Find the child account
  useEffect(() => {
    const account = connectedAccounts.find(acc => acc.id === childAccountId)
    if (account) {
      setChildAccount(account)
    } else {
      // If account not found, redirect back
      router.push("/profile")
    }
  }, [childAccountId, connectedAccounts, router])

  // Fetch Bitcoin price
  useEffect(() => {
    async function fetchBitcoinPrice() {
      try {
        const response = await fetch("/api/bitcoin-price")
        
        if (response.ok) {
          const data = await response.json()
          if (data.price && typeof data.price === 'number') {
            setBitcoinPrice(data.price)
          } else {
            setBitcoinPrice(null)
          }
        } else {
          setBitcoinPrice(null)
        }
      } catch (error) {
        console.warn("Failed to fetch Bitcoin price:", error)
        setBitcoinPrice(null)
      } finally {
        setIsPriceLoading(false)
      }
    }
    fetchBitcoinPrice()
  }, [])

  // Handle number pad input (now for sats)
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

  // Convert sats to dollars using real Bitcoin price
  const satsToDollars = (sats: number): string => {
    if (!bitcoinPrice) return "..."
    const btcAmount = sats / 100000000 // 100 million sats = 1 BTC
    const usdValue = btcAmount * bitcoinPrice
    return usdValue.toFixed(2)
  }

  // Handle send sats
  const handleSendSats = async () => {
    if (!user || !profile || !childAccount || !amount || amount === "0") return

    const satsAmount = parseInt(amount)

    if (satsAmount > (profile.balance || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough sats to send this amount.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Use the secure database function for family transfers
      const { data: result, error: transferError } = await supabase
        .rpc('family_transfer_sats', {
          p_from_user_id: user.id,
          p_to_user_id: childAccount.id,
          p_amount: satsAmount,
          p_memo: note || null
        })

      if (transferError) {
        console.error("Error calling transfer function:", transferError)
        throw transferError
      }

      // Parse the result from the function
      const transferResult = result as { 
        success: boolean, 
        error?: string,
        sender_transaction_id?: string,
        receiver_transaction_id?: string,
        new_sender_balance?: number,
        new_receiver_balance?: number
      }

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Transfer failed')
      }


      // Update local balance to reflect the change immediately
      if (transferResult.new_sender_balance !== undefined) {
        await updateBalance(transferResult.new_sender_balance)
      }

      toast({
        title: "Sats Sent!",
        description: `Successfully sent ${formatSatsValue(satsAmount)} sats to ${childAccount.name?.split(' ')[0]}.`,
        variant: "success",
        duration: 2000, // Show for 2 seconds
      })

      router.push("/profile")
    } catch (error) {
      console.error("Error sending sats:", error)
      toast({
        title: "Transfer Failed",
        description: "Failed to send sats. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!childAccount) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const satsAmount = parseInt(amount) || 0

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
          
          {/* Balance in header */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Balance: {formatSatsValue(profile?.balance || 0)}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/profile")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
        {/* Recipient Info */}
        <div className="flex flex-col items-center space-y-3 py-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <Image
              src={childAccount.avatar_url || "/placeholder.svg?height=80&width=80"}
              alt={childAccount.name || "Family member"}
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-xl font-semibold">{childAccount.name}</h1>
        </div>

        {/* Amount Input */}
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
          <div className="text-sm text-gray-500">
            ${satsToDollars(parseInt(amount) || 0)}
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

        {/* Action Button */}
        <div className="px-4">
          <Button
            onClick={handleSendSats}
            disabled={!amount || amount === "0" || isLoading}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? "Sending..." : "Send Sats"}
          </Button>
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              className="h-10 text-lg"
              onClick={() => handleNumberInput(num.toString())}
            >
              {num}
            </Button>
          ))}
          <div></div>
          <Button
            variant="outline"
            className="h-10 text-lg"
            onClick={() => handleNumberInput("0")}
          >
            0
          </Button>
          <Button
            variant="outline"
            className="h-10 text-lg"
            onClick={handleBackspace}
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </div>
    </div>
  )
}
