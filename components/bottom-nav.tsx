"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Plus, User } from "lucide-react"
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
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white/80 backdrop-blur-md dark:bg-gray-900/80 flex justify-center">
      <div className="grid h-full grid-cols-3 max-w-xs w-full mx-auto">
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex items-center justify-center",
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
        <div className="inline-flex items-center justify-center">
          <Link href="/post/new" className="inline-flex items-center justify-center">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-full">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </Link>
        </div>
        <Link
          href="/profile"
          className={cn(
            "inline-flex items-center justify-center",
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
  )
}
