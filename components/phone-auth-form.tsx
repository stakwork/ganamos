"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/loading-spinner"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import flags from "react-phone-number-input/flags"

export function PhoneAuthForm() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState<"phone" | "verification">("phone")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Remove spaces for Supabase API
      const formattedPhone = phoneNumber.replace(/\s/g, "")

      console.log("Attempting to send verification code to:", formattedPhone)
      console.log("Phone number type:", typeof formattedPhone)
      console.log("Phone number length:", formattedPhone.length)

      // Log the exact request being sent to Supabase
      console.log("Sending OTP request to Supabase with phone:", formattedPhone)

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })

      console.log("Supabase OTP response:", data ? "Data received" : "No data")

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
        })
        throw error
      }

      console.log("Verification code sent successfully")
      setStep("verification")
    } catch (err: any) {
      console.error("Error sending verification code:", err)
      console.error("Error details:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
      })
      setError(err.message || "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Remove spaces for Supabase API
      const formattedPhone = phoneNumber.replace(/\s/g, "")

      console.log("Attempting to verify code for phone:", formattedPhone)
      console.log("Verification code:", verificationCode)

      // Log the exact verification request
      console.log("Sending verification request to Supabase with:", {
        phone: formattedPhone,
        token: verificationCode,
        type: "sms",
      })

      const { error, data } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: verificationCode,
        type: "sms",
      })

      console.log("Verification response:", data ? "Data received" : "No data")

      if (error) {
        console.error("Verification error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
        })
        throw error
      }

      console.log("Verification successful, user data:", data.user)

      // Redirect to dashboard on successful verification
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Error verifying code:", err)
      console.error("Error details:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
      })
      setError(err.message || "Failed to verify code")
    } finally {
      setIsLoading(false)
    }
  }

  // Custom styles for the phone input to match your UI
  const phoneInputStyles = {
    "--PhoneInputCountryFlag-height": "1.5em",
    "--PhoneInputCountryFlag-borderWidth": "0",
    "--PhoneInputCountrySelectArrow-width": "0.8em",
    "--PhoneInputCountrySelectArrow-marginLeft": "0.8em",
  } as React.CSSProperties

  return (
    <div className="w-full max-w-md space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-md border border-input">
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry="US"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value || "")}
                flags={flags}
                style={phoneInputStyles}
                className="p-2"
                disabled={isLoading}
                id="phone"
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter your phone number with country code</p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending Code...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="bg-white/80 dark:bg-gray-800/80"
              required
              disabled={isLoading}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to {phoneNumber}</p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>

            <Button
              type="button"
              variant="link"
              onClick={() => setStep("phone")}
              disabled={isLoading}
              className="text-sm"
            >
              Change phone number
            </Button>

            <Button type="button" variant="link" onClick={handleSendCode} disabled={isLoading} className="text-sm">
              Resend code
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
