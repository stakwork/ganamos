"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, User, Map, Sprout, Plus, SquarePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/components/notifications-provider"
import { getCurrentLocationWithName } from "@/lib/geocoding"

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { hasPendingRequests } = useNotifications()

  // Don't show bottom nav on home page or auth pages
  if (pathname === "/" || pathname.startsWith("/auth")) {
    return null
  }

  const isActive = (path: string) => {
    if (path === "/dashboard" && (pathname === "/dashboard" || pathname === "/")) return true
    if (path !== "/dashboard" && pathname.startsWith(path)) return true
    return false
  }

  const handleMapClick = async () => {
    try {
      const locationData = await getCurrentLocationWithName()
      if (locationData) {
        // Pass location data to map page to zoom to city bounds
        router.push(`/map?lat=${locationData.latitude}&lng=${locationData.longitude}&zoom=city`)
      } else {
        router.push("/map")
      }
    } catch (error) {
      console.error("Error getting location:", error)
      router.push("/map")
    }
  }

  return (
    <div id="bottom-nav" className="fixed bottom-0 left-0 z-50 w-full h-[72px] bg-white/80 backdrop-blur-md dark:bg-gray-900/80 pb-4">
      <div className="relative w-full max-w-md mx-auto h-full">
        <div className="grid grid-cols-5 items-center h-full w-full px-6">
          {/* Home icon */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center justify-center rounded-xl transition-colors",
              isActive("/dashboard") && "text-primary dark:text-primary",
            )}
          >
            <Home
              className={cn(
                "w-7 h-7 text-gray-500 dark:text-gray-400 transition-colors hover:stroke-emerald-500",
                isActive("/dashboard") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Map icon */}
          <button
            onClick={handleMapClick}
            className={cn(
              "flex items-center justify-center rounded-xl transition-colors",
              pathname === "/map" && "text-primary dark:text-primary"
            )}
          >
            <Map
              className={cn(
                "w-7 h-7 text-gray-500 dark:text-gray-400 transition-colors hover:stroke-emerald-500",
                pathname === "/map" && "text-primary dark:text-primary",
              )}
            />
          </button>

          {/* New Post button - Center */}
          <button
            onClick={() => router.push("/post/new")}
            className={cn(
              "flex items-center justify-center rounded-xl transition-colors",
              pathname === "/post/new" && "text-primary dark:text-primary",
            )}
            aria-label="New Post"
          >
            <SquarePlus
              className={cn(
                "w-11 h-11 text-gray-500 dark:text-gray-400 transition-colors hover:stroke-emerald-500",
                pathname === "/post/new" && "text-primary dark:text-primary",
              )}
            />
          </button>

          {/* Donate icon */}
          <Link
            href="/donate"
            className={cn(
              "flex items-center justify-center rounded-xl transition-colors",
              isActive("/donate") && "text-primary dark:text-primary"
            )}
          >
            <Sprout
              className={cn(
                "w-7 h-7 text-gray-500 dark:text-gray-400 transition-colors hover:stroke-emerald-500",
                isActive("/donate") && "text-primary dark:text-primary",
              )}
            />
          </Link>

          {/* Profile icon */}
          <Link
            href="/profile"
            className={cn(
              "flex items-center justify-center relative rounded-xl transition-colors",
              isActive("/profile") && "text-primary dark:text-primary",
            )}
          >
            <User
              className={cn(
                "w-7 h-7 text-gray-500 dark:text-gray-400 transition-colors hover:stroke-emerald-500",
                isActive("/profile") && "text-primary dark:text-primary",
              )}
            />
            {hasPendingRequests && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
          </Link>
        </div>
      </div>
    </div>
  )
}
