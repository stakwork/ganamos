import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="container px-4 py-6 mx-auto max-w-md">
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70 text-white border-0 p-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      </div>

      {/* Image skeleton */}
      <div className="relative w-full h-64 mb-4 overflow-hidden rounded-lg">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Post content skeleton */}
      <div className="space-y-4">
        {/* Title and reward */}
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Location and metadata */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* User info */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Fix status section */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>

        {/* Comments/notes section */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
