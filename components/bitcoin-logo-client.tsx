"use client"

import { useState } from "react"

export function BitcoinLogoClient() {
  const [imageError, setImageError] = useState(false)

  return (
    <img
      src="/images/bitcoin-logo.png"
      alt="Bitcoin"
      className="inline-block h-6 w-6 mr-1"
      style={{ verticalAlign: "middle" }}
      onError={() => setImageError(true)}
    />
  )
}
