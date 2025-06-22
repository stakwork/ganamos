"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

export default function ProfileCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { updateProfile } = useAuth()

  useEffect(() => {
    // Hide the navigation bar when camera is active
    if (typeof window !== "undefined") {
      const bottomNav = document.querySelector(".fixed.bottom-0.left-0.z-50.w-full.h-16") as HTMLElement
      if (bottomNav) {
        bottomNav.style.display = "none"
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

      // Show the navigation bar again when camera is inactive
      if (typeof window !== "undefined") {
        const bottomNav = document.querySelector(".fixed.bottom-0.left-0.z-50.w-full.h-16") as HTMLElement
        if (bottomNav) {
          bottomNav.style.display = "grid"
        }
      }
    }
  }, [facingMode])

  const takePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      setIsSubmitting(true)

      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")

        if (context) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          const imageSrc = canvas.toDataURL("image/jpeg")

          // Update profile with new avatar
          await updateProfile({ avatar_url: imageSrc })

          // Stop the camera stream after taking photo
          if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
          }

          toast({
            title: "✨ Profile photo updated!",
            description: "Your new profile photo has been set",
            variant: "success",
            duration: 2000,
          })

          router.push("/profile")
        }
      } catch (error) {
        console.error("Error taking photo:", error)
        toast({
          title: "Error",
          description: "Could not update your profile photo",
          variant: "destructive",
          duration: 2000,
        })
      } finally {
        setIsSubmitting(false)
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
    <div className="container px-4 py-6 mx-auto max-w-md">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Take Profile Photo</h1>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden border rounded-lg dark:border-gray-800 relative">
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
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-[80vh] object-cover" />
              <div className="absolute inset-0 pointer-events-none border-4 border-white border-opacity-50 rounded-full m-4"></div>

              {/* Overlay controls on the camera view */}
              <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-4">
                <Button
                  type="button"
                  size="lg"
                  onClick={takePhoto}
                  className="rounded-full w-16 h-16 p-0 bg-green-500 hover:bg-green-600 shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <svg
                      className="animate-spin h-8 w-8"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
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
                  )}
                  <span className="sr-only">Take Photo</span>
                </Button>
              </div>

              {/* Switch camera button positioned at the top-right */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={switchCamera}
                className="absolute top-4 right-4 bg-black/30 border-0 hover:bg-black/40 text-white"
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
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <p className="text-center text-sm text-muted-foreground">Center your face in the circle and take a photo</p>
      </div>
    </div>
  )
}
