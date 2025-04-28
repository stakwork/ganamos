"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, PlusCircle, User } from "lucide-react"
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
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto">
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800",
            isActive("/dashboard") && "bg-gray-50 dark:bg-gray-800",
          )}
        >
          <Home
            className={cn(
              "w-6 h-6 mb-1 text-gray-500 dark:text-gray-400",
              isActive("/dashboard") && "text-primary dark:text-primary",
            )}
          />
          <span
            className={cn(
              "text-xs text-gray-500 dark:text-gray-400",
              isActive("/dashboard") && "text-primary dark:text-primary",
            )}
          >
            Home
          </span>
        </Link>
        <Link
          href="/post/new"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800",
            isActive("/post/new") && "bg-gray-50 dark:bg-gray-800",
          )}
        >
          <PlusCircle
            className={cn(
              "w-6 h-6 mb-1 text-gray-500 dark:text-gray-400",
              isActive("/post/new") && "text-primary dark:text-primary",
            )}
          />
          <span
            className={cn(
              "text-xs text-gray-500 dark:text-gray-400",
              isActive("/post/new") && "text-primary dark:text-primary",
            )}
          >
            Post
          </span>
        </Link>
        <Link
          href="/profile"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800",
            isActive("/profile") && "bg-gray-50 dark:bg-gray-800",
          )}
        >
          <User
            className={cn(
              "w-6 h-6 mb-1 text-gray-500 dark:text-gray-400",
              isActive("/profile") && "text-primary dark:text-primary",
            )}
          />
          <span
            className={cn(
              "text-xs text-gray-500 dark:text-gray-400",
              isActive("/profile") && "text-primary dark:text-primary",
            )}
          >
            Profile
          </span>
        </Link>
      </div>
    </div>
  )
}
