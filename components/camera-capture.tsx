"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useMobile } from "@/hooks/use-mobile"

export function CameraCapture({ onCapture }: { onCapture: (imageSrc: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const isMobile = useMobile()

  useEffect(() => {
    // Add a camera flag to the URL to help with navigation bar hiding
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (!url.searchParams.has("camera")) {
        url.searchParams.set("camera", "active")
        window.history.replaceState({}, "", url.toString())
      }
    }

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        }

        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
          setStream(mediaStream)

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
          }

          setError(null)
        } catch (err) {
          console.error("Error accessing camera:", err)
          setError("Could not access camera. Please check permissions.")
        }
      } catch (e) {
        console.error("Unexpected camera error:", e)
        setError("Camera access is not available in this environment.")
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Remove the camera flag when component unmounts
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        if (url.searchParams.has("camera")) {
          url.searchParams.delete("camera")
          window.history.replaceState({}, "", url.toString())
        }
      }
    }
  }, [facingMode])

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageSrc = canvas.toDataURL("image/jpeg")
        onCapture(imageSrc)
      }
    }
  }

  const switchCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border dark:border-gray-800">
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center justify-center p-8 text-center">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 text-muted-foreground"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
                <p className="text-muted-foreground">{error}</p>
                <Button className="mt-4" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-[70vh] object-cover" />
              <div className="absolute inset-0 pointer-events-none border-4 border-white border-opacity-50 rounded-lg m-4"></div>
            </div>
          )}
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex justify-center gap-4">
        {isMobile && (
          <Button type="button" variant="outline" size="icon" onClick={switchCamera} className="dark:border-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="sr-only">Switch Camera</span>
          </Button>
        )}

        <Button type="button" size="lg" onClick={takePhoto} className="rounded-full w-16 h-16 p-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span className="sr-only">Take Photo</span>
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">Take a clear photo of the issue</p>
    </div>
  )
}

// Export for dynamic import
export default CameraCapture
