"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Plus, User, Wallet, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  // Don't show bottom nav on home page or auth pages
  if (pathname === "/" || pathname.startsWith("/auth")) {
    return null
  }

  const isActive = (path: string) => {
    if (path === "/dashboard" && (pathname === "/dashboard" || pathname === "/")) return true
    if (path === "/wallet" && pathname.startsWith("/wallet")) return true
    if (path === "/search" && pathname.startsWith("/search")) return true
    if (path === "/profile" && pathname.startsWith("/profile")) return true
    return false
  }

  return (
    <>
      {/* Floating Action Button for New Post - Only shown on Home tab */}
      {(pathname === "/dashboard" || pathname === "/") && (
        <div className="fixed z-50 max-w-md w-full mx-auto left-0 right-0 bottom-20 pointer-events-none">
          <div className="relative w-full">
            <Link href="/post/new" className="absolute right-[26px] bottom-0 pointer-events-auto">
              <div className="flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="grid h-full max-w-md mx-auto grid-cols-4">
          {/* Home */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center",
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

          {/* Search */}
          <Link
            href="/search"
            className={cn(
              "flex flex-col items-center justify-center",
              isActive("/search") && "text-primary dark:text-primary",
            )}
          >
            <Search
              className={cn(
                "w-6 h-6 text-gray-500 dark:text-gray-400",
                isActive("/search") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Wallet */}
          <Link
            href="/wallet"
            className={cn(
              "flex flex-col items-center justify-center",
              isActive("/wallet") && "text-primary dark:text-primary",
            )}
          >
            <Wallet
              className={cn(
                "w-6 h-6 text-gray-500 dark:text-gray-400",
                isActive("/wallet") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className={cn(
              "flex flex-col items-center justify-center",
              isActive("/profile") && "text-primary dark:text-primary",
            )}
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
    </>
  )
}
