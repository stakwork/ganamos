"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Home, PlusCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

// Create a client component that uses useSearchParams
function BottomNavContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Don't show bottom nav on home page, auth pages, or when camera is active
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname === "/post/new" || // Hide on post creation page
    searchParams.has("camera") || // Hide when camera is active
    searchParams.has("comparison") // Hide when before/after comparison is active
  ) {
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

// Export a component that wraps the content in a Suspense boundary
export function BottomNav() {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <BottomNavContent />
    </Suspense>
  )
}
