"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { createInvoice, checkInvoice, payInvoice } from "@/lib/lightning"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { sendBitcoinReceivedEmail } from "@/lib/transaction-emails"

// Dynamic import for cookies to avoid issues with pages directory
async function getCookieStore() {
  const { cookies } = await import("next/headers")
  return cookies()
}

/**
 * Check if the Lightning configuration is valid
 */
async function checkLightningConfig() {
  const LND_REST_URL = process.env.LND_REST_URL
  const LND_ADMIN_MACAROON = process.env.LND_ADMIN_MACAROON

  if (!LND_REST_URL || !LND_ADMIN_MACAROON) {
    console.error("Lightning configuration missing")
    return {
      valid: false,
      error: "Lightning configuration missing",
      details: {
        url: LND_REST_URL ? "Set" : "Missing",
        macaroon: LND_ADMIN_MACAROON ? "Set" : "Missing",
      },
    }
  }

  // Check if URL is valid
  try {
    // Make sure URL has a protocol
    let urlToCheck = LND_REST_URL
    if (!urlToCheck.startsWith("http://") && !urlToCheck.startsWith("https://")) {
      urlToCheck = `https://${urlToCheck}`
    }

    new URL(urlToCheck)
  } catch (error) {
    return {
      valid: false,
      error: "Invalid Lightning URL format",
      details: `URL: "${LND_REST_URL}" - ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  // Check if macaroon is valid hex
  if (!/^[0-9a-fA-F]+$/.test(LND_ADMIN_MACAROON)) {
    return {
      valid: false,
      error: "Invalid macaroon format (should be hex)",
      details: `Macaroon starts with: ${LND_ADMIN_MACAROON.substring(0, 10)}...`,
    }
  }

  return { valid: true }
}

/**
 * Create a deposit invoice for a user
 */
export async function createDepositInvoice(amount: number, userId: string) {
  try {
    console.log("Creating deposit invoice for user:", userId, "Amount:", amount)

    // Create a Supabase client with the user's session
    const cookieStore = await getCookieStore()
    const supabase = createServerSupabaseClient({ cookieStore })

    // Get the current user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return { success: false, error: "Authentication error", details: sessionError.message }
    }

    // Use the passed userId if no session is found
    // This allows the client to pass the user ID when the session might not be available
    const effectiveUserId = session?.user?.id || userId

    if (!effectiveUserId) {
      console.error("No user ID provided and no active session found")
      return { success: false, error: "Not authenticated" }
    }

    console.log("Creating invoice for user:", effectiveUserId)

    // Check Lightning configuration
    const configCheck = await checkLightningConfig()
    if (!configCheck.valid) {
      console.error("Lightning config check failed:", configCheck.error, configCheck.details)
      return {
        success: false,
        error: configCheck.error,
        details: configCheck.details,
      }
    }

    // Use service role key for admin access to bypass RLS
    const adminSupabase = createServerSupabaseClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    // Check if the transactions table exists
    const { error: tableCheckError } = await adminSupabase.from("transactions").select("id").limit(1)

    if (tableCheckError) {
      console.error("Transactions table check error:", tableCheckError)
      return { success: false, error: "Transactions table not found. Please run the database migrations." }
    }

    // Create a memo for the invoice
    const memo = amount > 0 ? `Deposit ${amount} sats to Ganamos!` : `Deposit to Ganamos!`

    // Create the invoice using the Lightning API
    // If amount is 0, create a no-value invoice that allows sender to specify amount
    const invoiceResult = await createInvoice(amount, memo)

    if (!invoiceResult.success) {
      return {
        success: false,
        error: "Failed to create invoice",
        details: invoiceResult.error || invoiceResult.details,
      }
    }

    // Convert binary r_hash to hex string if needed
    let rHashStr = invoiceResult.rHash
    if (typeof rHashStr === "object" && rHashStr !== null) {
      // If it's a Buffer or similar binary object, convert to hex string
      rHashStr = Buffer.from(rHashStr).toString("hex")
    }

    // Store the invoice in the database with explicit data types
    const { data, error } = await adminSupabase
      .from("transactions")
      .insert({
        user_id: effectiveUserId,
        type: "deposit",
        amount: amount,
        status: "pending",
        r_hash_str: rHashStr || null,
        payment_request: invoiceResult.paymentRequest || null,
        memo: memo || null,
      })
      .select()

    if (error) {
      console.error("Error storing invoice:", error)
      return { success: false, error: "Failed to store invoice: " + error.message }
    }

    console.log("Invoice created successfully:", rHashStr)

    return {
      success: true,
      paymentRequest: invoiceResult.paymentRequest,
      rHash: rHashStr,
    }
  } catch (error) {
    console.error("Unexpected error in createDepositInvoice:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check if a deposit invoice has been paid
 */
export async function checkDepositStatus(rHash: string, userId: string) {
  try {
    console.log("Checking deposit status for rHash:", rHash, "User ID:", userId)

    const cookieStore = await getCookieStore()
    const supabase = createServerSupabaseClient({ cookieStore })

    // Get the current user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    // Use the passed userId if no session is found
    const effectiveUserId = session?.user?.id || userId

    if (sessionError) {
      console.error("Session error:", sessionError)
      // Continue with the provided userId instead of returning an error
    }

    if (!effectiveUserId) {
      console.error("No user ID provided and no active session found")
      return { success: false, error: "Not authenticated" }
    }

    // Check the invoice status
    const invoiceStatus = await checkInvoice(rHash)

    if (!invoiceStatus.success) {
      return { success: false, error: "Failed to check invoice status" }
    }

    // If the invoice is settled, update the transaction and user balance
    if (invoiceStatus.settled && invoiceStatus.settled === true) {
      console.log("Invoice is settled! Processing payment for user:", effectiveUserId)
      console.log("Actual amount paid:", invoiceStatus.amountPaid, "sats")

      // Use service role key for admin access to bypass RLS
      const adminSupabase = createServerSupabaseClient({
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      })

      // Get the transaction to verify amount
      const { data: transaction } = await adminSupabase
        .from("transactions")
        .select("*")
        .eq("r_hash_str", rHash)
        .eq("status", "pending")
        .single()

      if (!transaction) {
        console.log("Transaction not found or already processed - checking if it was already completed")
        
        // Check if transaction was already completed
        const { data: completedTransaction } = await adminSupabase
          .from("transactions")
          .select("*")
          .eq("r_hash_str", rHash)
          .eq("status", "completed")
          .single()
          
        if (completedTransaction) {
          console.log("Transaction was already completed successfully")
          return { 
            success: true, 
            settled: true, 
            amount: completedTransaction.amount,
            newBalance: null // Don't update balance again
          }
        }
        
        return { success: false, error: "Transaction not found or already processed" }
      }

      // CRITICAL: Use the actual amount paid, not the pre-specified amount
      const actualAmountPaid = parseInt(invoiceStatus.amountPaid || transaction.amount)
      console.log("Found transaction:", transaction.id, "Pre-specified amount:", transaction.amount, "Actual amount paid:", actualAmountPaid)
      
      
      // SECURITY: Log amount mismatches for monitoring
      if (transaction.amount !== actualAmountPaid) {
        console.warn("SECURITY ALERT: Amount mismatch detected!", {
          transactionId: transaction.id,
          preSpecifiedAmount: transaction.amount,
          actualAmountPaid: actualAmountPaid,
          userId: effectiveUserId,
          rHash: rHash
        })
      }

      // Get the user's current balance
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("balance")
        .eq("id", effectiveUserId)
        .single()

      if (!profile) {
        console.error("User profile not found")
        return { success: false, error: "User profile not found" }
      }

      console.log("Current balance:", profile.balance, "Type:", typeof profile.balance)
      const newBalance = parseInt(profile.balance) + actualAmountPaid
      console.log("New balance will be:", newBalance)

      // Update transaction status
      const { error: txError } = await adminSupabase
        .from("transactions")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)

      if (txError) {
        console.error("Error updating transaction:", txError)
        return { success: false, error: "Failed to update transaction" }
      }

      console.log("Transaction updated successfully")

      // Update user balance
      const { error: balanceError } = await adminSupabase
        .from("profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", effectiveUserId)

      if (balanceError) {
        console.error("Error updating balance:", balanceError)
        return { success: false, error: "Failed to update balance" }
      }

      console.log("Balance updated successfully to:", newBalance)

      // Revalidate the profile page to show updated balance
      revalidatePath("/profile")
      revalidatePath("/dashboard")
      revalidatePath("/wallet")

      // Add activity for deposit
      await adminSupabase.from("activities").insert({
        id: uuidv4(),
        user_id: effectiveUserId,
        type: "deposit",
        related_id: transaction.id,
        related_table: "transactions",
        timestamp: new Date().toISOString(),
        metadata: { amount: actualAmountPaid, status: "completed" },
      })

      // Send email notification (only if user has verified email)
      const { data: recipientProfile } = await adminSupabase
        .from("profiles")
        .select("email, name")
        .eq("id", effectiveUserId)
        .single()

      if (recipientProfile?.email && !recipientProfile.email.includes('@ganamos.app')) {
        // Send email asynchronously (don't block on email sending)
        sendBitcoinReceivedEmail({
          toEmail: recipientProfile.email,
          userName: recipientProfile.name || "User",
          amountSats: actualAmountPaid,
          date: new Date(),
          transactionType: 'deposit'
        }).catch(error => {
          console.error("Error sending Bitcoin received email:", error)
          // Don't fail the transaction if email fails
        })
      }

      return {
        success: true,
        settled: true,
        amount: actualAmountPaid,
        newBalance,
      }
    }

    return {
      success: true,
      settled: false,
    }
  } catch (error) {
    console.error("Unexpected error in checkDepositStatus:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}
