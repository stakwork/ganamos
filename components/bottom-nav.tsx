"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Wallet, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  // Don't show bottom nav on home page or auth pages
  if (pathname === "/" || pathname.startsWith("/auth")) {
    return null
  }

  const isActive = (path: string) => {
    if (path === "/dashboard" && (pathname === "/dashboard" || pathname === "/")) return true
    if (path !== "/dashboard" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
    <div className="relative w-full max-w-md mx-auto h-full">
      <div className="grid grid-cols-4 items-center h-full w-full px-6">
          {/* Home icon */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center justify-center",
              isActive("/dashboard") && "text-primary dark:text-primary",
            )}
          >
            <Home
              className={cn(
                "w-6 h-6 text-gray-500 dark:text-gray-400",
                isActive("/dashboard") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Search icon */}
          <Link
            href="/search"
            className={cn("flex items-center justify-center", isActive("/search") && "text-primary dark:text-primary")}
          >
            <Search
              className={cn(
                "w-6 h-6 text-gray-500 dark:text-gray-400",
                isActive("/search") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Wallet icon */}
          <Link
            href="/wallet"
            className={cn("flex items-center justify-center", isActive("/wallet") && "text-primary dark:text-primary")}
          >
            <Wallet
              className={cn(
                "w-6 h-6 text-gray-500 dark:text-gray-400",
                isActive("/wallet") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Profile icon */}
          <Link
            href="/profile"
            className={cn("flex items-center justify-center", isActive("/profile") && "text-primary dark:text-primary")}
          >
            <User
              className={cn(
                "w-6 h-6 text-gray-500 dark:text-gray-400",
                isActive("/profile") && "text-primary dark:text-primary",
              )}
            />
          </Link>
        </div>
      </div>
    </div>
  )
}
