"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, ArrowLeftIcon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import { LoadingSpinner } from "@/components/loading-spinner"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"
import type { Transaction } from "@/lib/database.types"

function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    async function fetchTransactions() {
      if (!profile) return

      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) {
          console.error("Error fetching transactions:", error)
        } else {
          setTransactions(data || [])
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [profile, supabase])

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                tx.type === "deposit" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              {tx.type === "deposit" ? (
                <ArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowUpIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="font-medium">{tx.type === "deposit" ? "Deposit" : "Withdrawal"}</p>
              <p className="text-xs text-muted-foreground">
                {tx.created_at && formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`font-medium ${
                tx.type === "deposit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {tx.type === "deposit" ? "+" : "-"}
              {formatSatsValue(tx.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {tx.status === "completed" ? "Completed" : tx.status === "pending" ? "Pending" : "Failed"}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function WalletPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    if (!loading && !user) {
      router.push("/auth/login?redirect=/wallet")
      return
    }

    if (profile) {
      setBalance(profile.balance)
      setIsLoading(false)
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [profile, loading, user, router])

  if (isLoading) {
    return <LoadingSpinner message="Loading wallet..." />
  }

  // If not authenticated, show login prompt
  if (!user) {
    return (
      <div className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Bitcoin Wallet</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-6">Please sign in to access your wallet</p>
              <Button onClick={() => router.push("/auth/login?redirect=/wallet")}>Sign In</Button>
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
        <h1 className="text-2xl font-bold">Bitcoin Wallet</h1>
      </div>

      <Card className="mb-6 border dark:border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <div className="p-3 mb-3 bg-amber-100 rounded-full dark:bg-amber-950/50">
              <Image src="/images/bitcoin-logo.png" alt="Bitcoin" width={32} height={32} className="object-contain" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-3xl font-bold">{formatSatsValue(balance || 0)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/wallet/deposit" className="w-full">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
            <ArrowDownIcon className="h-6 w-6 text-green-500" />
            <span>Deposit</span>
          </Button>
        </Link>

        <Link href="/wallet/withdraw" className="w-full">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
            <ArrowUpIcon className="h-6 w-6 text-red-500" />
            <span>Withdraw</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Bitcoin Lightning</CardTitle>
          <CardDescription>Fast, low-cost Bitcoin transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The Lightning Network is a "Layer 2" payment protocol that operates on top of Bitcoin. It enables instant
            transactions with nearly zero fees.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-start p-0">
          <div className="w-full p-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <HistoryIcon className="h-4 w-4" />
              Transaction History
            </h3>
            <TransactionHistory />
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
