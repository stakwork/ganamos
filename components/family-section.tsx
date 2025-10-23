"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Plus, User } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatSatsValue } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile } from "@/lib/database.types"

interface FamilySectionProps {
  onAddAccount: () => void
  cachedFamilyCount?: number
}

export function FamilySection({ onAddAccount, cachedFamilyCount: propCachedFamilyCount = 0 }: FamilySectionProps) {
  const { connectedAccounts, isConnectedAccount, user, mainAccountProfile, activeUserId, profile } = useAuth()
  const router = useRouter()
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false)
  
  // Load cached family count directly from localStorage
  const [cachedFamilyCount, setCachedFamilyCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const userId = localStorage.getItem('ganamos_active_user_id');
      if (!userId) return 0;
      const cached = localStorage.getItem(`ganamos_family_count_${userId}`);
      if (cached) {
        const { count, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 60 * 1000) return count;
      }
    } catch (e) {}
    return 0;
  });
  
  // Track when accounts have been loaded at least once
  // Set to true when we have accounts OR after 800ms (to handle no-accounts case)
  useEffect(() => {
    if (connectedAccounts && connectedAccounts.length > 0) {
      setHasLoadedAccounts(true)
      // Update cached count when real accounts load
      if (cachedFamilyCount === 0) {
        setCachedFamilyCount(connectedAccounts.length);
      }
    } else if (connectedAccounts) {
      // If connectedAccounts exists but is empty, wait before showing Add button
      const timer = setTimeout(() => {
        setHasLoadedAccounts(true)
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [connectedAccounts, cachedFamilyCount])

  // Handle child account tap - navigate to send sats page
  const handleChildAccountTap = (childAccount: Profile) => {
    router.push(`/wallet/withdraw?recipient=${childAccount.id}`)
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
          id: user.id, // Use the actual user ID for navigation
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

  // Only show Add button after accounts have loaded
  const showAddButton = hasLoadedAccounts;

  console.log('[FamilySection]', {
    cachedFamilyCount,
    hasLoadedAccounts,
    connectedAccountsLength: connectedAccounts?.length,
    sortedAccountsLength: sortedAccounts.length,
    showAddButton
  });

  return (
    <div className="mt-4" style={{ minHeight: '110px' }}>
      <p className="text-sm text-muted-foreground mb-3">Family</p>
      <div className="relative overflow-hidden">
        {/* Horizontal scrolling container */}
        <div 
          className="flex space-x-4 overflow-x-auto scrollbar-hide" 
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          {sortedAccounts.map((account, index) => (
            <button
              key={account.id}
              onClick={() => handleChildAccountTap(account)}
              className="flex flex-col items-center space-y-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none flex-shrink-0 min-w-[68px] animate-in fade-in duration-500"
            >
              {/* Avatar */}
              <Avatar className="w-12 h-12">
                <AvatarImage 
                  src={account.avatar_url ?? undefined} 
                  alt={account.name || "Family member"}
                  className="object-cover transition-opacity duration-300"
                />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              {/* Name */}
              <div className="text-sm font-medium text-center truncate w-full max-w-[60px]">
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
          
          {/* Add Family Member Button - hide during initial load if we expect family members */}
          {showAddButton && (
            <button
              onClick={onAddAccount}
              className="flex flex-col items-center space-y-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none flex-shrink-0 min-w-[68px]"
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
          )}
        </div>
        
        {/* Fade overlay positioned absolutely over the content */}
        {sortedAccounts.length >= 4 && (
          <div className="absolute top-0 right-0 bottom-0 w-12 pointer-events-none z-10">
            <div className="w-full h-full bg-gradient-to-l from-white via-white/40 to-transparent dark:from-gray-950 dark:via-gray-950/40 dark:to-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
