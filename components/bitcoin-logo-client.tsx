"use client"

import { useState } from "react"

interface BitcoinLogoClientProps {
  className?: string
  size?: number
}

export function BitcoinLogoClient({ className, size }: BitcoinLogoClientProps) {
  const [imageError, setImageError] = useState(false)

  const defaultClassName = "inline-block h-6 w-6 mr-1"
  const finalClassName = className || defaultClassName

  return (
    <img
      src="/images/bitcoin-logo.png"
      alt="Bitcoin"
      className={finalClassName}
      style={{ 
        verticalAlign: "middle",
        ...(size && { width: size, height: size })
      }}
      onError={() => setImageError(true)}
    />
  )
}
