"use client"

import { useState } from "react"

export function BackgroundImage() {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="absolute inset-0">
      <img
        src="/images/community-fixing.jpg"
        alt="Person fixing a fence in a community"
        className="w-full h-full object-cover"
        style={imageError ? { backgroundColor: "#f0f0f0" } : {}}
        onError={() => setImageError(true)}
      />
    </div>
  )
}
