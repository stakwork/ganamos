"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Plus } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import type { Profile } from "@/lib/database.types"

interface FamilySectionProps {
  onAddAccount: () => void
}

export function FamilySection({ onAddAccount }: FamilySectionProps) {
  const { connectedAccounts, isConnectedAccount, user, mainAccountProfile, activeUserId, profile } = useAuth()
  const router = useRouter()

  // Handle child account tap - navigate to send sats page
  const handleChildAccountTap = (childAccount: Profile) => {
    router.push(`/send-sats/${childAccount.id}`)
  }

  // Format balance with k for thousands
  const formatBalance = (balance: number): string => {
    if (balance >= 1000) {
      return `${Math.floor(balance / 1000)}k`
    }
    return balance.toLocaleString()
  }

  // Determine which accounts to show based on current view
  const getAccountsToShow = () => {
    if (isConnectedAccount) {
      // Viewing from child account - show parent account and other siblings
      const accounts = []
      
      // Add parent account if available
      if (mainAccountProfile && user) {
        accounts.push({
          ...mainAccountProfile,
          id: user.id, // Use the actual user ID for send-sats navigation
        })
      }
      
      // Add sibling accounts (exclude current active child account)
      const siblings = (connectedAccounts || [])
        .filter(account => account !== null && account.id !== activeUserId)
      
      accounts.push(...siblings)
      return accounts
    } else {
      // Viewing from main account - show all connected accounts
      return (connectedAccounts || []).filter(account => account !== null)
    }
  }

  // Sort accounts by balance (high to low)
  const sortedAccounts = getAccountsToShow()
    .sort((a, b) => (b.balance || 0) - (a.balance || 0))

  // Always render the section, even if no accounts (to show the Add button)

  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground mb-3">Family</p>
      <div className="grid grid-cols-4 gap-4">
        {sortedAccounts.map((account) => (
          <button
            key={account.id}
            onClick={() => handleChildAccountTap(account)}
            className="flex flex-col items-center space-y-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {/* Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <Image
                src={account.avatar_url || "/placeholder.svg?height=48&width=48"}
                alt={account.name || "Family member"}
                fill
                className="object-cover"
              />
            </div>
            
            {/* Name */}
            <div className="text-sm font-medium text-center truncate w-full">
              {account.name?.split(' ')[0] || 'Child'}
            </div>
            
            {/* Balance */}
            <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 relative">
                <Image
                  src="/images/bitcoin-logo.png"
                  alt="Bitcoin"
                  fill
                  className="object-contain"
                />
              </div>
              <span>{formatBalance(account.balance || 0)}</span>
            </div>
          </button>
        ))}
        
        {/* Add Family Member Button */}
        <button
          onClick={onAddAccount}
          className="flex flex-col items-center space-y-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {/* Dotted Circle with Plus */}
          <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <Plus className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          
          {/* Add text */}
          <div className="text-sm font-medium text-center text-gray-500 dark:text-gray-400">
            Add
          </div>
          
          {/* Empty space for balance alignment */}
          <div className="h-4"></div>
        </button>
      </div>
    </div>
  )
}
