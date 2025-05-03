"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>Something went wrong!</h1>
      <p style={{ marginBottom: "2rem" }}>We apologize for the inconvenience.</p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#059669",
          color: "white",
          borderRadius: "0.375rem",
          border: "none",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  )
}
