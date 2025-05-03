"use client"

import dynamic from "next/dynamic"
import type React from "react"

// Client component that handles dynamic imports with SSR disabled
export function createClientOnlyComponent<T>(importFunc: () => Promise<{ default: React.ComponentType<T> }>) {
  return dynamic(importFunc, { ssr: false })
}
