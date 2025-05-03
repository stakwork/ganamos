import type React from "react"
import { createClientOnlyComponent } from "./client-dynamic-import"

// Re-export the client-side dynamic import function
export { createClientOnlyComponent }

// Helper function to create a type-safe wrapper for client-only components
export function withClientOnly<T>(Component: React.ComponentType<T>) {
  // This is just a pass-through function that helps with typing
  // The actual dynamic import with ssr: false happens in the client component
  return Component
}
