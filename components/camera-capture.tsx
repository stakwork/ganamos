"use client"

import type React from "react"

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

  // Safe area styles for the camera controls
  const safeAreaStyles = {
    position: "absolute",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
    left: "0",
    right: "0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "1rem",
    zIndex: 50,
  } as React.CSSProperties

  useEffect(() => {
    // Add a camera flag to the URL to help with navigation bar hiding
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (!url.searchParams.has("camera")) {
        url.searchParams.set("camera", "active")
        window.history.replaceState({}, "", url.toString())
      }

      // Robustly hide the navigation bar when camera is active
      function hideNav() {
        // Try id first, fallback to class selector
        const bottomNav = document.getElementById("bottom-nav") || document.querySelector(".fixed.bottom-0.left-0.z-50.w-full.h-16")
        if (bottomNav) {
          bottomNav.style.display = "none"
        }
      }
      hideNav()
      // Use MutationObserver in case nav appears after mount
      const observer = new MutationObserver(hideNav)
      observer.observe(document.body, { childList: true, subtree: true })
      // Store observer for cleanup
      ;(window as any)._cameraNavObserver = observer
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
      // Access the current stream from the state
      setStream((currentStream) => {
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop())
        }
        // Return null to update the state after stopping the tracks
        return null
      })

      // Remove the camera flag when component unmounts
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        if (url.searchParams.has("camera")) {
          url.searchParams.delete("camera")
          window.history.replaceState({}, "", url.toString())
        }
        // Restore the navigation bar
        const bottomNav = document.getElementById("bottom-nav") || document.querySelector(".fixed.bottom-0.left-0.z-50.w-full.h-16")
        if (bottomNav) {
          bottomNav.style.display = "grid"
        }
        // Disconnect MutationObserver
        if ((window as any)._cameraNavObserver) {
          (window as any)._cameraNavObserver.disconnect()
          delete (window as any)._cameraNavObserver
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

        // Stop the camera stream after taking photo
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
          setStream(null)
        }

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
      <style jsx>{`
        .camera-preview-container {
          min-height: 40vh;
          height: 100dvh;
          max-height: 90vh;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
        }
        @media (max-width: 600px) {
          .camera-preview-container {
            max-width: 100vw;
            max-height: 100dvh;
            min-height: 40vh;
          }
        }
        .camera-preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 16px;
          background: #111;
        }
        .camera-capture-btn {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 104px);
          z-index: 50;
        }
      `}</style>
      <Card className="overflow-hidden border dark:border-gray-800">
        <CardContent className="p-0 relative">
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
            <div
              className="camera-preview-container"
              id="camera-preview-container"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview-video"
              />
              {/* Overlay controls on the camera view - using inline styles for safe area */}
              <div className="camera-capture-btn">
                <Button
                  type="button"
                  size="lg"
                  onClick={takePhoto}
                  className="relative rounded-full w-20 h-20 p-0 bg-white hover:bg-gray-100 shadow-lg border-4 border-white"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-2 border-gray-300"></div>
                  <span className="sr-only">Take Photo</span>
                </Button>
              </div>
              {/* Switch camera button positioned at the top-right */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.history.back()}
                className="absolute top-6 left-4 bg-black/30 border-0 hover:bg-black/40 text-white/70"
              >
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
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span className="sr-only">Back</span>
              </Button>
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  className="absolute top-6 right-4 bg-black/30 border-0 hover:bg-black/40 text-white/70"
                >
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
            </div>
          )}
        </CardContent>
      </Card>
      {/* Safari mobile fix: set container height dynamically if on iOS Safari */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function isiOSSafari() {
              return /iP(ad|hone|od)/.test(navigator.userAgent) && /WebKit/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
            }
            if (isiOSSafari()) {
              var el = document.getElementById('camera-preview-container');
              if (el) {
                el.style.height = window.innerHeight + 'px';
              }
            }
          })();
        `
      }} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// Export for dynamic import
export default CameraCapture
