import { LoadingSpinner } from "@/components/loading-spinner"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Loading dashboard...</h2>
        <LoadingSpinner />
      </div>
    </div>
  )
}
